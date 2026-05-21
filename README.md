# Recent Tabs Switcher

macOS の `Command + Tab` のような操作感で、直近開いたタブを美しいグラスモーフィズム UI から高速切り替えできる Chrome 拡張機能です。

## 機能

- **Command+Tab 風の切り替え** — ショートカットキー（デフォルト: `Alt + Q` / Mac: `Option + Q`）で MRU（Most Recently Used）順のタブ一覧を表示
- **グラスモーフィズム UI** — 背後のページをぼかすアクリル調デザイン。ファビコン・タイトル・ドメインを表示
- **多様な操作** — キー連打、矢印キー、`Tab` / `Shift + Tab`、`Enter`、`Esc`、マウスクリックに対応
- **特権ページのフォールバック** — `chrome://` などコンテンツスクリプトが動作しないページでは、直前の通常タブへ自動トグル
- **設定画面** — 表示する最大タブ数（5〜20）をスライダーで変更可能

## 使い方

1. ショートカットキーを押すと、直近のタブ一覧が表示されます
2. `Alt`（`Option`）を押しっぱなしにして `Q` を連打すると、選択中のタブが切り替わります
3. `Alt`（`Option`）を離すと、選択したタブへ切り替わります

### ショートカットキーの変更

Chrome の仕様上、`Ctrl + Tab` などブラウザ標準のショートカットは上書きできません。  
インストール後に [`chrome://extensions/shortcuts`](chrome://extensions/shortcuts) を開き、お好みのキー（例: `Ctrl + Shift + A`）に変更できます。

## 開発

### 必要環境

- Node.js
- Google Chrome

### セットアップ

```bash
npm install
npm run build
```

### 拡張機能の読み込み

1. Chrome で `chrome://extensions` を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」から、このリポジトリのルートディレクトリを選択

### スクリプト

| コマンド | 説明 |
| --- | --- |
| `npm run build` | TypeScript を `dist/` にコンパイル |
| `npm run watch` | ファイル変更を監視して自動ビルド |
| `npm run lint` | oxlint でコードを検査 |
| `npm run format` | oxfmt でコードをフォーマット |

## プロジェクト構成

```
├── manifest.json       # 拡張機能マニフェスト (Manifest V3)
├── content.css         # スイッチャー UI のスタイル
├── options.html        # 設定画面
├── src/
│   ├── background.ts   # サービスワーカー（MRU 追跡・タブ切り替え）
│   ├── content.ts      # コンテンツスクリプト（オーバーレイ UI）
│   └── options.ts      # 設定画面のロジック
└── dist/               # ビルド成果物（git 管理外）
```

## 権限

| 権限 | 用途 |
| --- | --- |
| `tabs` | タブ情報の取得と、選択したタブのアクティブ化 |
| `storage` | ユーザー設定と MRU 順序のローカル保存 |

## プライバシー

- 個人情報・閲覧履歴・行動データの収集・送信は行いません
- すべてのデータはローカル（`chrome.storage.local` およびメモリ）でのみ処理されます
- 外部サーバーとの通信はありません

## ライセンス

[MIT License](./LICENSE)
