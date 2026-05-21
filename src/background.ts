// MRU（Most Recently Used）タブ履歴を管理するサービスワーカー (TypeScript)

interface SwitcherSettings {
  maxTabs?: number;
  theme?: string;
}

interface TabItem {
  id: number;
  title: string;
  url: string;
  favIconUrl: string;
  active: boolean;
}

// 履歴の更新や取得の排他制御のためのロック変数
let isUpdatingHistory = false;

// 拡張機能起動時の初期化
chrome.runtime.onInstalled.addListener(async () => {
  await initializeHistory();
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeHistory();
});

// タブ関連イベントの監視
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateHistoryOnTabActivated(activeInfo.tabId);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await removeTabFromHistory(tabId);
});

chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.id !== undefined) {
    await addTabToHistoryEnd(tab.id);
  }
});

// ウィンドウフォーカス変更の監視（マルチウィンドウ対応）
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, windowId: windowId });
    if (activeTab && activeTab.id !== undefined) {
      await updateHistoryOnTabActivated(activeTab.id);
    }
  } catch (error) {
    console.error('Error handling window focus change:', error);
  }
});

// ショートカットキーコマンドの受信
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-switcher') {
    await handleOpenSwitcherCommand();
  }
});

// コンテンツスクリプトやオプション画面からのメッセージ受信
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'switch_to_tab') {
    (async () => {
      try {
        await switchToTab(message.tabId as number);
        sendResponse({ success: true });
      } catch (error: any) {
        console.error('Failed to switch tab:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // 非同期レスポンスのためにチャネルを維持
  }

  if (message.action === 'get_settings') {
    (async () => {
      const settings = await getSettings();
      sendResponse({ settings });
    })();
    return true;
  }
});

/**
 * タブ履歴（MRUリスト）を初期化する
 */
async function initializeHistory(): Promise<void> {
  if (isUpdatingHistory) return;
  isUpdatingHistory = true;
  try {
    // 全ウィンドウのすべてのタブを取得
    const allTabs = await chrome.tabs.query({});

    // 現在アクティブなタブを特定
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const mruList: number[] = [];
    if (activeTab && activeTab.id !== undefined) {
      mruList.push(activeTab.id);
    }

    for (const tab of allTabs) {
      if (tab.id === undefined) continue;
      if (activeTab && tab.id === activeTab.id) continue;
      mruList.push(tab.id);
    }

    await chrome.storage.local.set({ mruTabIds: mruList });
    console.log('MRU History initialized:', mruList);
  } catch (error) {
    console.error('Failed to initialize MRU history:', error);
  } finally {
    isUpdatingHistory = false;
  }
}

/**
 * タブがアクティブになったときにMRU履歴を更新する
 */
async function updateHistoryOnTabActivated(tabId: number): Promise<void> {
  if (isUpdatingHistory) return;
  isUpdatingHistory = true;
  try {
    const data = await chrome.storage.local.get('mruTabIds');
    let mruList: number[] = data.mruTabIds || [];

    // 既存のリストから該当タブIDを削除
    mruList = mruList.filter((id) => id !== tabId);

    // リストの先頭に追加
    mruList.unshift(tabId);

    await chrome.storage.local.set({ mruTabIds: mruList });
  } catch (error) {
    console.error('Failed to update MRU history on activation:', error);
  } finally {
    isUpdatingHistory = false;
  }
}

/**
 * タブが閉じられたときにMRU履歴から削除する
 */
async function removeTabFromHistory(tabId: number): Promise<void> {
  try {
    const data = await chrome.storage.local.get('mruTabIds');
    let mruList: number[] = data.mruTabIds || [];
    mruList = mruList.filter((id) => id !== tabId);
    await chrome.storage.local.set({ mruTabIds: mruList });
  } catch (error) {
    console.error('Failed to remove tab from MRU history:', error);
  }
}

/**
 * タブが作成されたときにMRU履歴の最後尾に追加する
 */
async function addTabToHistoryEnd(tabId: number): Promise<void> {
  try {
    const data = await chrome.storage.local.get('mruTabIds');
    let mruList: number[] = data.mruTabIds || [];
    if (!mruList.includes(tabId)) {
      mruList.push(tabId);
      await chrome.storage.local.set({ mruTabIds: mruList });
    }
  } catch (error) {
    console.error('Failed to append tab to MRU history:', error);
  }
}

/**
 * ショートカットキー押下時の処理。現在のアクティブタブにUI表示の命令を送る。
 * 特権ページの場合は、前回のタブへ直接切り替えるフォールバック処理を行う。
 */
async function handleOpenSwitcherCommand(): Promise<void> {
  try {
    // 現在のアクティブタブを取得
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || activeTab.id === undefined) return;

    // 最新の設定情報を取得
    const settings = await getSettings();
    const maxTabsToShow = settings.maxTabs || 9;

    // 有効なタブのリストをMRU順に構築
    const data = await chrome.storage.local.get('mruTabIds');
    const mruList: number[] = data.mruTabIds || [];

    // 現在開いているすべてのタブを取得し、インデックス化
    const openTabs = await chrome.tabs.query({});
    const openTabsMap = new Map<number, chrome.tabs.Tab>();
    for (const tab of openTabs) {
      if (tab.id !== undefined) {
        openTabsMap.set(tab.id, tab);
      }
    }

    // MRUリストを開いているタブのみでフィルタリングしてタブ情報を詰める
    const sortedTabs: TabItem[] = [];
    const validMruIds: number[] = [];

    for (const tabId of mruList) {
      const tab = openTabsMap.get(tabId);
      if (tab && tab.id !== undefined) {
        validMruIds.push(tabId);
        // UIに送るデータを構築
        sortedTabs.push({
          id: tab.id,
          title: tab.title || 'Untitled',
          url: tab.url || '',
          favIconUrl: tab.favIconUrl || '',
          active: tab.id === activeTab.id,
        });
      }
    }

    // 開いているがMRUリストに載っていないタブがあれば最後尾に追加（不整合対策）
    for (const tab of openTabs) {
      if (tab.id === undefined) continue;
      if (!validMruIds.includes(tab.id)) {
        validMruIds.push(tab.id);
        sortedTabs.push({
          id: tab.id,
          title: tab.title || 'Untitled',
          url: tab.url || '',
          favIconUrl: tab.favIconUrl || '',
          active: tab.id === activeTab.id,
        });
      }
    }

    // MRUリストを更新して同期を取る
    await chrome.storage.local.set({ mruTabIds: validMruIds });

    // UIで表示するタブ数を制限（最大値）
    const displayTabs = sortedTabs.slice(0, maxTabsToShow);

    // アクティブなタブが特権ページ（chrome:// や chrome-extension:// 等）であるかチェック
    const isSpecialPage = isChromeInternalPage(activeTab.url);

    if (isSpecialPage) {
      // 特権ページの場合はコンテンツスクリプトが動かないため、1つ前に開いていたタブへ即座に切り替える（フォールバックトグル）
      await fallbackToggleTab(validMruIds, activeTab.id);
      return;
    }

    // コンテンツスクリプトへメッセージ送信
    try {
      await chrome.tabs.sendMessage(activeTab.id, {
        action: 'open_switcher_ui',
        tabs: displayTabs,
        settings: settings,
      });
    } catch (msgError) {
      // コンテンツスクリプトが未ロード、またはセキュリティポリシーで失敗した場合のフォールバック
      console.warn(
        'Could not communicate with content script. Falling back to direct toggle:',
        msgError,
      );
      await fallbackToggleTab(validMruIds, activeTab.id);
    }
  } catch (error) {
    console.error('Error handling open switcher command:', error);
  }
}

/**
 * 特権ページにおけるフォールバックトグル動作。
 * MRU履歴の2番目のタブ（1つ前に開いていたタブ）に直接切り替える。
 */
async function fallbackToggleTab(mruList: number[], currentTabId: number): Promise<void> {
  if (mruList.length < 2) return; // 切り替える先がない

  // 現在のアクティブタブを除外したMRUリストの先頭（＝1つ前に開いていたタブ）を取得
  const nextTabId = mruList[0] === currentTabId ? mruList[1] : mruList[0];

  if (nextTabId) {
    await switchToTab(nextTabId);
  }
}

/**
 * URLがChrome内部ページや拡張機能管理ページなどの特権ページであるか判定する
 */
function isChromeInternalPage(url: string | undefined): boolean {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('chrome-devtools://') ||
    url.startsWith('view-source:') ||
    url.startsWith('about:') ||
    url.startsWith('https://chromewebstore.google.com/')
  );
}

/**
 * 指定したタブIDのタブにフォーカスを切り替える
 */
async function switchToTab(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab) return;

    // タブをアクティブ化
    await chrome.tabs.update(tabId, { active: true });

    // タブが属するウィンドウもフォーカスする
    if (tab.windowId !== undefined) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  } catch (error) {
    console.error(`Error switching to tab ${tabId}:`, error);
    // タブが存在しない場合は履歴から削除
    await removeTabFromHistory(tabId);
  }
}

/**
 * ユーザー設定を取得する（未設定の場合は初期デフォルトを返す）
 */
async function getSettings(): Promise<SwitcherSettings> {
  try {
    const data = await chrome.storage.local.get('settings');
    const defaultSettings: SwitcherSettings = {
      maxTabs: 9,
      theme: 'system', // 'system', 'dark', 'light'
    };
    return { ...defaultSettings, ...data.settings };
  } catch (error) {
    console.error('Failed to get settings:', error);
    return { maxTabs: 9, theme: 'system' };
  }
}
