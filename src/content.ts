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
  layout?: 'vertical' | 'horizontal';
}

(function () {
  // すでにコンテンツスクリプトが読み込まれている場合は重複実行を防ぐ
  if ((window as any).RecentTabsSwitcherLoaded) return;
  (window as any).RecentTabsSwitcherLoaded = true;

  let shadowRoot: ShadowRoot | null = null;
  let containerEl: HTMLDivElement | null = null;
  let backdropEl: HTMLDivElement | null = null;
  let tabElements: HTMLDivElement[] = [];
  let tabList: TabItem[] = [];
  let selectedIndex = 0;
  let isOpen = false;
  let openedTime = 0;
  let layoutMode: 'vertical' | 'horizontal' = 'horizontal';

  // デフォルトファビコン（マテリアルアイコン風の綺麗なプレースホルダーSVGデータURL）
  const DEFAULT_FAVICON =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M6 6h10M6 10h10"/></svg>';

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
  function openSwitcher(tabs: TabItem[], settings: SwitcherSettings): void {
    if (tabs.length === 0) return;

    tabList = tabs;
    layoutMode = settings.layout === 'vertical' ? 'vertical' : 'horizontal';

    // デフォルトで「1つ前に開いていたタブ」（インデックス1）を選択状態にする。
    // タブが1つの場合はインデックス0を選択する。
    selectedIndex = tabs.length > 1 ? 1 : 0;

    isOpen = true;
    openedTime = Date.now();

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
      customEl.style.visibility = 'hidden'; // 初期状態は非表示（チラつき防止）
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
    containerEl.className =
      layoutMode === 'horizontal' ? 'rts-container rts-layout-horizontal' : 'rts-container';
    containerEl.setAttribute('role', 'dialog');
    containerEl.setAttribute('aria-modal', 'true');
    containerEl.setAttribute('aria-label', 'Recent Tabs Switcher');

    if (layoutMode === 'vertical') {
      buildVerticalLayout(containerEl, tabs);
    } else {
      buildHorizontalLayout(containerEl, tabs);
    }

    backdropEl.appendChild(containerEl);
    shadowRoot.appendChild(backdropEl);

    if (backdropEl) {
      backdropEl.addEventListener('click', cancelSwitcher);
    }

    // UIを実際にアクティブにして表示状態にする関数
    let isShown = false;
    const showUI = () => {
      if (isShown || !isOpen) return;
      isShown = true;

      // 表示状態にする
      if (customEl) {
        customEl.style.visibility = 'visible';
      }

      // フェードインアニメーションのトリガー
      requestAnimationFrame(() => {
        if (backdropEl) backdropEl.classList.add('rts-show');
        if (containerEl) containerEl.classList.add('rts-show');
      });
    };

    // CSSのロード完了で表示
    linkEl.addEventListener('load', showUI);
    // 万が一のロードイベント未発火に備え、30ms後に強制表示（キャッシュ時はすでにスタイル適用済みのため安全）
    setTimeout(showUI, 30);
  }

  /**
   * 縦リストレイアウトを構築する
   */
  function buildVerticalLayout(container: HTMLDivElement, tabs: TabItem[]): void {
    const headerEl = document.createElement('div');
    headerEl.className = 'rts-header';
    headerEl.textContent = 'Recent Tabs';
    container.appendChild(headerEl);

    const listEl = document.createElement('div');
    listEl.className = 'rts-list';

    tabElements = [];

    tabs.forEach((tab, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = `rts-item${index === selectedIndex ? ' rts-selected' : ''}`;
      itemEl.setAttribute('data-index', String(index));
      itemEl.setAttribute('data-tab-id', String(tab.id));

      const favEl = document.createElement('img');
      favEl.className = 'rts-favicon';
      favEl.src = tab.favIconUrl || DEFAULT_FAVICON;
      favEl.alt = '';
      favEl.onerror = () => {
        favEl.src = DEFAULT_FAVICON;
      };
      itemEl.appendChild(favEl);

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
      attachItemEvents(itemEl, index, tab.id);

      listEl.appendChild(itemEl);
      tabElements.push(itemEl);
    });

    container.appendChild(listEl);
  }

  /**
   * 横カードレイアウトを構築する
   */
  function buildHorizontalLayout(container: HTMLDivElement, tabs: TabItem[]): void {
    const listEl = document.createElement('div');
    listEl.className = 'rts-list rts-list-horizontal';

    tabElements = [];

    tabs.forEach((tab, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = `rts-card${index === selectedIndex ? ' rts-selected' : ''}`;
      itemEl.setAttribute('data-index', String(index));
      itemEl.setAttribute('data-tab-id', String(tab.id));

      const previewEl = document.createElement('div');
      previewEl.className = 'rts-card-preview';

      const previewFavEl = document.createElement('img');
      previewFavEl.className = 'rts-card-preview-favicon';
      previewFavEl.src = tab.favIconUrl || DEFAULT_FAVICON;
      previewFavEl.alt = '';
      previewFavEl.onerror = () => {
        previewFavEl.src = DEFAULT_FAVICON;
      };
      previewEl.appendChild(previewFavEl);
      itemEl.appendChild(previewEl);

      const labelEl = document.createElement('div');
      labelEl.className = 'rts-card-label';

      const favEl = document.createElement('img');
      favEl.className = 'rts-card-favicon';
      favEl.src = tab.favIconUrl || DEFAULT_FAVICON;
      favEl.alt = '';
      favEl.onerror = () => {
        favEl.src = DEFAULT_FAVICON;
      };
      labelEl.appendChild(favEl);

      const titleEl = document.createElement('span');
      titleEl.className = 'rts-card-title';
      titleEl.textContent = getDisplayTitle(tab);
      labelEl.appendChild(titleEl);

      itemEl.appendChild(labelEl);
      attachItemEvents(itemEl, index, tab.id);

      listEl.appendChild(itemEl);
      tabElements.push(itemEl);
    });

    container.appendChild(listEl);
  }

  /**
   * タブアイテムに共通のマウスイベントを付与する
   */
  function attachItemEvents(itemEl: HTMLDivElement, index: number, tabId: number): void {
    itemEl.addEventListener('mouseenter', () => {
      updateSelection(index);
    });

    itemEl.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmSelection(tabId);
    });
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
    } catch {
      return urlStr;
    }
  }

  /**
   * 横レイアウト用の表示タイトルを取得する
   */
  function getDisplayTitle(tab: TabItem): string {
    const domain = getDomainName(tab.url);
    if (domain && tab.title && !tab.title.toLowerCase().includes(domain.split('.')[0])) {
      return tab.title;
    }
    return tab.title || domain || 'Untitled';
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
      newSelectedEl.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth',
      });
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

    const key = event.key;

    // イベントがスイッチャーに向けられていることを示すため伝播停止
    event.stopPropagation();
    event.preventDefault();

    const keyLower = key.toLowerCase();

    // Alt + Q (またはOption + Q) による移動
    if (keyLower === 'q' && event.altKey) {
      if (event.shiftKey) {
        selectPrevious();
      } else {
        selectNext();
      }
      return;
    }

    // レイアウトに応じた矢印キーでの移動
    if (layoutMode === 'horizontal') {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        selectNext();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        selectPrevious();
      }
    } else {
      if (event.key === 'ArrowDown') {
        selectNext();
      } else if (event.key === 'ArrowUp') {
        selectPrevious();
      }
    }

    // Tabキーでの移動
    if (event.key === 'Tab') {
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

    const key = event.key;

    event.stopPropagation();
    event.preventDefault();

    // Altキー（モディファイア）が離されたら決定する
    // MacOSのOptionキーは 'Alt' として判定される
    if (key === 'Alt') {
      // 起動直後 150ms 以内の keyup は、ショートカット入力自体の残響（誤検知）として無視する
      if (Date.now() - openedTime < 150) {
        return;
      }
      confirmSelection();
    }
  }

  /**
   * ウィンドウからフォーカスが外れた場合（別窓クリックやOS操作等）
   * キーイベントのロストを防ぐため、安全にスイッチャーを閉じる
   */
  function handleWindowBlur(): void {
    if (!isOpen) return;

    // 起動直後 150ms 以内の blur は、ショートカット起動に伴うウィンドウフォーカスの揺らぎとして無視する
    if (Date.now() - openedTime < 150) {
      return;
    }
    cancelSwitcher();
  }

  // 常時監視リスナーの登録（通信ラグ中のキーイベントも取りこぼさないため）
  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('keyup', handleKeyUp, true);
  window.addEventListener('blur', handleWindowBlur);
})();
