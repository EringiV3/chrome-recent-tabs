// Recent Tabs Switcher - オプション画面スクリプト (TypeScript)

interface SwitcherSettings {
  maxTabs?: number;
  theme?: string;
  layout?: 'vertical' | 'horizontal';
}

document.addEventListener('DOMContentLoaded', async () => {
  const maxTabsInput = document.getElementById('max-tabs') as HTMLInputElement | null;
  const maxTabsValLabel = document.getElementById('max-tabs-val') as HTMLSpanElement | null;
  const layoutVerticalInput = document.getElementById('layout-vertical') as HTMLInputElement | null;
  const layoutHorizontalInput = document.getElementById(
    'layout-horizontal',
  ) as HTMLInputElement | null;
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement | null;
  const statusEl = document.getElementById('status') as HTMLDivElement | null;
  const openShortcutBtn = document.getElementById(
    'open-shortcut-settings',
  ) as HTMLButtonElement | null;

  // 初期設定のロード
  await loadSettings();

  // スライダーの値が変更されたときのイベント
  if (maxTabsInput && maxTabsValLabel) {
    maxTabsInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      maxTabsValLabel.textContent = target.value;
    });
  }

  // 保存ボタン押下イベント
  if (saveBtn && maxTabsInput) {
    saveBtn.addEventListener('click', async () => {
      const maxTabs = parseInt(maxTabsInput.value, 10);
      const layout: 'vertical' | 'horizontal' =
        layoutHorizontalInput?.checked === true ? 'horizontal' : 'vertical';

      try {
        // 既存の設定を読みだしてマージ
        const data = await chrome.storage.local.get('settings');
        const settings: SwitcherSettings = {
          ...data.settings,
          maxTabs,
          layout,
        };

        // 保存
        await chrome.storage.local.set({ settings });

        // 成功トースト表示
        showStatus('設定を保存しました');
      } catch (err) {
        console.error('Failed to save settings:', err);
        showStatus('保存に失敗しました', true);
      }
    });
  }

  // ショートカット設定ページを開くボタン
  if (openShortcutBtn) {
    openShortcutBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: 'chrome://extensions/shortcuts',
      });
    });
  }

  /**
   * 保存されている設定をロードしてUIに反映する
   */
  async function loadSettings(): Promise<void> {
    try {
      const data = await chrome.storage.local.get('settings');
      const settings = (data.settings || {}) as SwitcherSettings;

      // デフォルト値は 9
      const maxTabs = settings.maxTabs !== undefined ? settings.maxTabs : 9;
      const layout = settings.layout === 'vertical' ? 'vertical' : 'horizontal';

      if (maxTabsInput) {
        maxTabsInput.value = String(maxTabs);
      }
      if (maxTabsValLabel) {
        maxTabsValLabel.textContent = String(maxTabs);
      }
      if (layoutVerticalInput) {
        layoutVerticalInput.checked = layout === 'vertical';
      }
      if (layoutHorizontalInput) {
        layoutHorizontalInput.checked = layout === 'horizontal';
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  /**
   * ステータスメッセージを一定時間表示する
   */
  function showStatus(message: string, isError: boolean = false): void {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#ef4444' : '#10b981';
    statusEl.classList.add('show');

    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 2000);
  }
});
