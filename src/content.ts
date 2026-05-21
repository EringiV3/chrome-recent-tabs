// Recent Tabs Switcher - コンテンツスクリプト (TypeScript)

interface TabItem {
  id: number;
  title: string;
  url: string;
  favIconUrl: string;
  active: boolean;
}

interface SwitcherSettings {
  maxTabs?: number;
  theme?: string;
}

// グローバルウィンドウオブジェクトの型拡張
interface Window {
  RecentTabsSwitcherLoaded?: boolean;
}

(function() {
  // すでにコンテンツスクリプトが読み込まれている場合は重複実行を防ぐ
  if (window.RecentTabsSwitcherLoaded) return;
  window.RecentTabsSwitcherLoaded = true;

  let shadowRoot: ShadowRoot | null = null;
  let containerEl: HTMLDivElement | null = null;
  let backdropEl: HTMLDivElement | null = null;
  let tabElements: HTMLDivElement[] = [];
  let tabList: TabItem[] = [];
  let selectedIndex = 0;
  let isOpen = false;
  
  // デフォルトファビコン（マテリアルアイコン風の綺麗なプレースホルダーSVGデータURL）
  const DEFAULT_FAVICON = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M6 6h10M6 10h10"/></svg>';

  // メッセージの受信リスナー
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'open_switcher_ui') {
      if (isOpen) {
        // UIがすでに開いている場合は、ショートカットの連打とみなして次のタブを選択する
        selectNext();
      } else {
        const tabs = message.tabs as TabItem[];
        const settings = (message.settings || {}) as SwitcherSettings;
        openSwitcher(tabs, settings);
      }
      sendResponse({ success: true });
    }
  });

  /**
   * スイッチャーUIを構築して表示する
   */
  function openSwitcher(tabs: TabItem[], _settings: SwitcherSettings): void {
    if (tabs.length === 0) return;
    
    tabList = tabs;
    isOpen = true;
    
    // デフォルトで「1つ前に開いていたタブ」（インデックス1）を選択状態にする。
    // タブが1つの場合はインデックス0を選択する。
    selectedIndex = tabs.length > 1 ? 1 : 0;

    // カスタムエレメントの作成または取得
    let customEl = document.getElementById('recent-tabs-switcher-root') as HTMLElement | null;
    if (!customEl) {
      customEl = document.createElement('recent-tabs-switcher-root');
      customEl.id = 'recent-tabs-switcher-root';
      // 他のウェブサイトのスタイルと干渉しないように隔離
      customEl.style.all = 'initial';
      customEl.style.position = 'fixed';
      customEl.style.zIndex = '9999999999'; // 最前面に配置
      customEl.style.top = '0';
      customEl.style.left = '0';
      customEl.style.width = '100vw';
      customEl.style.height = '100vh';
      customEl.style.pointerEvents = 'none'; // 通常時はイベントを通す
      
      document.body.appendChild(customEl);
      shadowRoot = customEl.attachShadow({ mode: 'open' });
    } else {
      shadowRoot = customEl.shadowRoot;
      if (shadowRoot) {
        shadowRoot.innerHTML = ''; // クリア
      }
    }
    
    if (customEl) {
      customEl.style.pointerEvents = 'auto'; // UI表示中はクリックイベントを受け取る
    }

    if (!shadowRoot) return;

    // スタイルシートを読み込むリンクタグの生成
    const linkEl = document.createElement('link');
    linkEl.rel = 'stylesheet';
    linkEl.href = chrome.runtime.getURL('content.css');
    shadowRoot.appendChild(linkEl);

    // バックドロップ（背景のフェード用）
    backdropEl = document.createElement('div');
    backdropEl.className = 'rts-backdrop';
    
    // スイッチャーコンテナ
    containerEl = document.createElement('div');
    containerEl.className = 'rts-container';
    containerEl.setAttribute('role', 'dialog');
    containerEl.setAttribute('aria-modal', 'true');
    containerEl.setAttribute('aria-label', 'Recent Tabs Switcher');
    
    // ヘッダー
    const headerEl = document.createElement('div');
    headerEl.className = 'rts-header';
    headerEl.textContent = 'Recent Tabs';
    containerEl.appendChild(headerEl);
    
    // タブリストコンテナ
    const listEl = document.createElement('div');
    listEl.className = 'rts-list';
    
    tabElements = [];
    
    tabs.forEach((tab, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = `rts-item${index === selectedIndex ? ' rts-selected' : ''}`;
      itemEl.setAttribute('data-index', String(index));
      itemEl.setAttribute('data-tab-id', String(tab.id));
      
      // ファビコン
      const favEl = document.createElement('img');
      favEl.className = 'rts-favicon';
      favEl.src = tab.favIconUrl || DEFAULT_FAVICON;
      favEl.alt = '';
      favEl.onerror = () => {
        favEl.src = DEFAULT_FAVICON;
      };
      itemEl.appendChild(favEl);
      
      // メタデータ（タイトル・ドメイン）
      const metaEl = document.createElement('div');
      metaEl.className = 'rts-meta';
      
      const titleEl = document.createElement('span');
      titleEl.className = 'rts-title';
      titleEl.textContent = tab.title;
      metaEl.appendChild(titleEl);
      
      const domainEl = document.createElement('span');
      domainEl.className = 'rts-domain';
      domainEl.textContent = getDomainName(tab.url);
      metaEl.appendChild(domainEl);
      
      itemEl.appendChild(metaEl);
      
      // マウス操作用イベント
      itemEl.addEventListener('mouseenter', () => {
        updateSelection(index);
      });
      
      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmSelection(tab.id);
      });
      
      listEl.appendChild(itemEl);
      tabElements.push(itemEl);
    });
    
    containerEl.appendChild(listEl);
    backdropEl.appendChild(containerEl);
    shadowRoot.appendChild(backdropEl);
    
    // フェードインアニメーションのトリガー
    requestAnimationFrame(() => {
      if (backdropEl) backdropEl.classList.add('rts-show');
      if (containerEl) containerEl.classList.add('rts-show');
    });

    // イベントリスナーの登録
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleWindowBlur);
    backdropEl.addEventListener('click', cancelSwitcher);
  }

  /**
   * URLからドメイン名を抽出する（読みやすさ向上のため）
   */
  function getDomainName(urlStr: string): string {
    if (!urlStr) return '';
    try {
      const url = new URL(urlStr);
      // chrome:// などの内部スキームはそのまま返す
      if (url.protocol.startsWith('chrome')) {
        return `${url.protocol}//${url.hostname}`;
      }
      return url.hostname.replace('www.', '');
    } catch (e) {
      return urlStr;
    }
  }

  /**
   * 選択を更新する
   */
  function updateSelection(index: number): void {
    if (index < 0 || index >= tabElements.length) return;
    
    // 既存の選択解除
    if (tabElements[selectedIndex]) {
      tabElements[selectedIndex].classList.remove('rts-selected');
    }
    
    selectedIndex = index;
    
    // 新しい選択の適用
    const newSelectedEl = tabElements[selectedIndex];
    if (newSelectedEl) {
      newSelectedEl.classList.add('rts-selected');
      // スクロール追従（コンテナからはみ出す場合）
      newSelectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /**
   * 次のタブを選択する（循環）
   */
  function selectNext(): void {
    if (tabList.length === 0) return;
    const nextIndex = (selectedIndex + 1) % tabList.length;
    updateSelection(nextIndex);
  }

  /**
   * 前のタブを選択する（循環）
   */
  function selectPrevious(): void {
    if (tabList.length === 0) return;
    const prevIndex = (selectedIndex - 1 + tabList.length) % tabList.length;
    updateSelection(prevIndex);
  }

  /**
   * 決定してタブを切り替える
   */
  function confirmSelection(tabId?: number): void {
    if (tabList.length === 0) return;
    const targetTabId = tabId !== undefined ? tabId : tabList[selectedIndex].id;
    chrome.runtime.sendMessage({ action: 'switch_to_tab', tabId: targetTabId });
    closeSwitcher();
  }

  /**
   * スイッチャーをキャンセルして閉じる
   */
  function cancelSwitcher(): void {
    closeSwitcher();
  }

  /**
   * スイッチャーUIを非表示にしてリソースをクリーンアップする
   */
  function closeSwitcher(): void {
    if (!isOpen) return;
    
    isOpen = false;
    
    // リスナー解除
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('keyup', handleKeyUp, true);
    window.removeEventListener('blur', handleWindowBlur);
    
    if (backdropEl && containerEl) {
      // フェードアウトアニメーションの開始
      backdropEl.classList.remove('rts-show');
      containerEl.classList.remove('rts-show');
      
      // アニメーション完了後にDOMから削除
      setTimeout(() => {
        const root = document.getElementById('recent-tabs-switcher-root');
        if (root) {
          root.style.pointerEvents = 'none';
          if (root.shadowRoot) {
            root.shadowRoot.innerHTML = '';
          }
        }
      }, 150); // CSS transitionの0.15sと同期
    }
  }

  /**
   * キーボードのキー押下時のハンドラー（キャプチャリングフェーズで実行）
   */
  function handleKeyDown(event: KeyboardEvent): void {
    if (!isOpen) return;
    
    // イベントがスイッチャーに向けられていることを示すため伝播停止
    event.stopPropagation();
    event.preventDefault();

    const key = event.key.toLowerCase();
    
    // Alt + Q (またはOption + Q) による移動
    if (key === 'q' && event.altKey) {
      if (event.shiftKey) {
        selectPrevious();
      } else {
        selectNext();
      }
      return;
    }

    // 矢印キーでの移動
    if (event.key === 'ArrowDown') {
      selectNext();
    } else if (event.key === 'ArrowUp') {
      selectPrevious();
    } 
    // Tabキーでの移動
    else if (event.key === 'Tab') {
      if (event.shiftKey) {
        selectPrevious();
      } else {
        selectNext();
      }
    }
    // Enter / Space での決定
    else if (event.key === 'Enter' || event.key === ' ') {
      confirmSelection();
    }
    // Escape でのキャンセル
    else if (event.key === 'Escape') {
      cancelSwitcher();
    }
  }

  /**
   * キーボードのキー解放時のハンドラー
   */
  function handleKeyUp(event: KeyboardEvent): void {
    if (!isOpen) return;
    
    event.stopPropagation();
    event.preventDefault();

    // Altキー（モディファイア）が離されたら決定する
    // MacOSのOptionキーは 'Alt' として判定される
    if (event.key === 'Alt') {
      confirmSelection();
    }
  }

  /**
   * ウィンドウからフォーカスが外れた場合（別窓クリックやOS操作等）
   * キーイベントのロストを防ぐため、安全にスイッチャーを閉じる
   */
  function handleWindowBlur(): void {
    cancelSwitcher();
  }
})();
