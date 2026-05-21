# Chrome Web Store Metadata — Recent Tabs Switcher

このドキュメントは、Recent Tabs Switcher を Chrome Web Store に公開・申請する際に必要なメタデータ、権限の正当性理由、プライバシー情報の申請用コピーです。

---

## 1. ストア掲載情報 (Store Listing)

### 拡張機能の名前 (Extension Name)

Recent Tabs Switcher - Command+Tab風タブ切り替え

（`manifest.json` の `name` と同一）

### プライバシーポリシー URL (Privacy Policy URL)

https://github.com/EringiV3/chrome-recent-tabs/blob/main/PRIVACY.md

### ホームページ URL (Homepage URL)

https://github.com/EringiV3/chrome-recent-tabs

### スクリーンショット (Screenshots)

Chrome Web Store 提出用（1280×800）の画像は `store-assets/` にあります。アップロード時は以下の順番を推奨します。

| ファイル | 内容 |
| --- | --- |
| `03-switcher-horizontal-1280x800.png` | 横カード形式の切り替えオーバーレイ（メイン画面） |
| `04-switcher-vertical-1280x800.png` | 縦リスト形式の切り替えオーバーレイ |
| `01-settings-popup-1280x800.png` | 拡張機能ポップアップの設定画面 |
| `02-shortcuts-1280x800.png` | ショートカットキー設定（`chrome://extensions/shortcuts`） |

再生成: `npm run prepare-screenshots`

### 短い説明 (Summary)

macOSのCommand+Tabのような操作感で、直近開いたタブを美しいグラスモーフィズムUIから任意のショートカットキーで高速切り替え！

### 詳細な説明 (Detailed Description)

macOSのアプリケーション切り替え（`Command + Tab`）のような快適で直感的なタブ切り替え体験をGoogle Chromeで実現します。

**【主な機能と特徴】**

- 🚀 **Command+Tab風の極上の切り替え体験**
  - ショートカットキー（デフォルト：`Alt + Q` / Macは `Option + Q`）を押すと、画面中央に美しいフローティングUIが浮かび上がります。
  - `Alt`（`Option`）キーを押しっぱなしの状態で `Q` キーを連打することで、直近開いたタブ（MRU順）を順番に選択できます。
  - `Alt`（`Option`）キーを離した瞬間に、選択したタブへ即座に切り替わります。
- 💎 **プレミアムなグラスモーフィズムUI**
  - 背後のWebページを美しくぼかすアクリル調のガラスデザイン（`backdrop-filter`）を採用。
  - スムーズなアニメーション、タブのファビコン、タイトル、ドメイン名の表示など、OSの機能と見間違えるほど洗練されたデザイン。
- ⌨️ **多様な操作サポート**
  - キーの連打だけでなく、矢印キー（上下）や `Tab` / `Shift + Tab` での選択、`Enter` での決定、`Esc` でのキャンセルもサポート。
  - リスト内のアイテムをマウスで直接クリックして切り替えることも可能です。
- 🛡️ **特権ページでのシームレスなフォールバック**
  - Chromeの仕様上コンテンツスクリプトが動作しない特権ページ（`chrome://` 設定画面やChrome Web Store等）でショートカットキーを押した場合、自動的に「1つ前に開いていた通常タブ」へ即座に切り替える（トグル）フォールバック機能を搭載。特権ページに囚われて操作不能になるのを防ぎます。
- ⚙️ **シンプルな設定オプション**
  - 切り替え画面に表示する最大タブ数（5〜20個）をスライダーで簡単に変更可能。
  - ショートカットキーの変更手順をわかりやすく案内。

**【ショートカットキーの変更方法】**
Chromeの仕様制限により、ブラウザ標準の `Ctrl + Tab` は拡張機能で上書きできませんが、インストール後に `chrome://extensions/shortcuts` を開くことで、お好みのキー（例：`Ctrl + Shift + A` など）にいつでも自由に変更できます。

---

## 2. 権限の正当性説明 (Permissions Justification)

Chrome Web Storeの審査において、以下の権限理由を英語でコピペして申請してください。


| Permission    | Justification (English)                                                                                                                                                        | Justification (日本語訳)                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `**tabs`**    | Required to retrieve open tab information (title, URL, and favicon) to build the switcher UI overlay and to activate the selected tab when the user releases the shortcut key. | タブ切り替えUIに開いているタブの情報（タイトル、URL、ファビコン）を一覧表示し、ユーザーがショートカットキーを離した際に選択されたタブをアクティブ化するために必要です。 |
| `**storage**` | Required to store and persist user preferences (such as the maximum number of tabs to display in the UI) and to track the MRU (Most Recently Used) order of tab IDs.           | ユーザー設定（UIに表示する最大タブ数など）の保存や、直近開いたタブの順序（MRU順）を永続的に追跡・管理するために必要です。                        |


---

## 3. プライバシーとデータ利用 (Privacy & Data Use)

### 単一用途の宣言 (Single Purpose)

This extension's single purpose is to allow users to switch between recently active tabs using a keyboard shortcut and an interactive overlay UI.
(この拡張機能の唯一の目的は、キーボードショートカットと対話的なオーバーレイUIを使用して、ユーザーが最近アクティブだったタブ間を切り替えることができるようにすることです。)

### データ収集の自己申告 (Data Collection Declaration)

- **データの収集**: 本拡張機能は、ユーザーのいかなる個人情報、閲覧履歴、または行動データを収集・送信しません。
- **ローカル処理**: すべてのデータ（タブIDの履歴およびオプション設定）は、ユーザーのローカルブラウザ環境（`chrome.storage.local` および一時的なメモリ）でのみ保持および処理されます。
- **外部通信**: 外部のサーバーやサードパーティサービスとの通信は一切行いません（完全オフラインで動作します）。
- **プライバシーポリシー**: https://github.com/EringiV3/chrome-recent-tabs/blob/main/PRIVACY.md

---

## 5. 提出手順 (Submission Steps)

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) で開発者登録（初回 $5）
2. リポジトリで `npm run package` を実行し、生成された `recent-tabs-switcher-v1.0.0.zip` をアップロード
3. 上記 Store Listing・Privacy Policy URL・スクリーンショットを入力
4. Privacy practices で「データ収集なし」を申告
5. 権限 justification（§2）を英語で入力
6. Submit for review

---

## 6. バージョン履歴 (Version History)

- **v1.0.0 (2026-05-21)**
  - 初回リリース。
  - MRU（Most Recently Used）順のタブ追跡および切り替え機能。
  - シャドウDOMとグラスモーフィズムデザインによるフローティングUIの追加。
  - `Alt+Q` での連打選択および `Alt` キー解放による決定挙動の実装。
  - 特権ページでの自動トグルバックアップフォールバックの実装。
  - オプション設定画面（表示数スライダー、ショートカット変更リンク）の提供。