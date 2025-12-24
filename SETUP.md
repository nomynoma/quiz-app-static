# クイズアプリ - セットアップ手順

このドキュメントでは、クイズアプリを最初から構築してデプロイするまでの手順を説明します。

## 目次

1. [前提条件](#前提条件)
2. [Googleスプレッドシート準備](#googleスプレッドシート準備)
3. [GAS API デプロイ](#gas-api-デプロイ)
4. [静的ファイル設定](#静的ファイル設定)
5. [静的ホスティング デプロイ](#静的ホスティング-デプロイ)
6. [動作確認](#動作確認)
7. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

- Googleアカウント
- GitHubアカウント（GitHub Pagesを使う場合）
- テキストエディタ（VSCodeなど）
- Gitクライアント

---

## Googleスプレッドシート準備

### 1. スプレッドシートを作成

1. [Google Sheets](https://sheets.google.com/)にアクセス
2. 新しいスプレッドシートを作成
3. 名前を「クイズアプリDB」などに変更

### 2. シート構成

以下のシートを作成してください:

#### 必須シート名（6シート）

```
ジャンル1
ジャンル2
ジャンル3
ジャンル4
ジャンル5
ジャンル6
```

**エクストラステージについて**:
- エクストラステージは専用シートを作成する必要はありません
- GASの `getAllQuestionsForExtraMode()` 関数が全ジャンル×全レベルのキャッシュから自動的に問題を集約します

#### 各シートの列構成

| 列 | 列名 | 説明 | 例 |
|----|-----|------|-----|
| A | id | 問題ID | 1 |
| B | level | レベル（初級/中級/上級） | 初級 |
| C | selectionType | 選択方式 | single ※1 |
| D | displayType | 表示方式 | text ※2 |
| E | question | 問題文 | JavaScriptで変数を宣言する際に使うキーワードは？ |
| F | choiceA | 選択肢A | var |
| G | choiceB | 選択肢B | let |
| H | choiceC | 選択肢C | const |
| I | choiceD | 選択肢D | function |
| J | correctAnswer | 正解（A/B/C/Dで指定） | B |
| K | hintUrl | 解説URL（任意） | https://example.com/let-const |
| L | hintText | ヒント（任意） | ES6以降では let と const が推奨されます |

※1: `selectionType` - `single`（単一選択）, `multiple`（複数選択）, `input`（入力式）
※2: `displayType` - `text`（テキスト）, `image`（画像URL）

**重要**:
- 1つのシート内に、初級・中級・上級の問題を全て入れます
- `level` 列（B列）で「初級」「中級」「上級」を区別します
- GASが自動的にレベルごとにキャッシュを分けて保存します

**正解の書き方**:
- 単一選択: `B` （A/B/C/Dの記号で指定）
- 複数選択: `A,B` （記号をカンマ区切り、大文字小文字問わず）
- 入力式: `let` （正解テキストを直接記入）

---

## GAS API デプロイ

### 1. Google Apps Script プロジェクトを作成

**重要**: GASプロジェクトは必ずスプレッドシートから開いてください。

1. 作成したスプレッドシートを開く
2. 「拡張機能」→「Apps Script」をクリック
3. これでスプレッドシートに紐付いたGASプロジェクトが自動作成されます
4. プロジェクト名を「クイズアプリAPI」などに変更（任意）

**なぜスプレッドシートから開くのか**:
- このGASコードは `SpreadsheetApp.getActiveSpreadsheet()` を使用しているため、スプレッドシートに紐付いている必要があります
- スタンドアロンのGASプロジェクトでは動作しません

### 2. コードをコピー

1. `gas/code.gs` の内容を全てコピー
2. GASエディタの `コード.gs` に貼り付け（既存のコードを全て置き換え）

### 3. appsscript.jsonを設定（任意）

1. GASエディタで「プロジェクトの設定」→「マニフェストファイルをエディタで表示」をON
2. `appsscript.json` タブが表示される
3. `gas/appsscript.json` の内容を貼り付け

### 4. デプロイ

1. GASエディタで「デプロイ」→「新しいデプロイ」
2. 種類: **ウェブアプリ**
3. 設定:
   - **説明**: v1.0（任意）
   - **次のユーザーとして実行**: **自分**
   - **アクセスできるユーザー**: **全員**
4. 「デプロイ」ボタンをクリック
5. 権限の承認画面が表示されたら:
   - 「権限を確認」
   - Googleアカウントを選択
   - 「詳細」→「（安全ではないページ）に移動」
   - 「許可」
6. **デプロイURL**をコピー（後で使用）
   - 例: `https://script.google.com/macros/s/ABCD1234EFGH5678/exec`

### 5. 動作確認

ブラウザでデプロイURLにアクセスし、以下のようなJSONが返ってくればOK:

```json
{
  "status": "ok",
  "message": "Quiz API is running"
}
```

これは`doGet()`関数のデフォルトレスポンス（pingエンドポイント）です。

---

## 静的ファイル設定

### 1. config.jsを編集

`public/js/config.js` を開き、以下を設定:

```javascript
// ========================================
// GAS API URL
// ========================================
const GAS_API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'; // ★GASデプロイURLを入力★

// ========================================
// ジャンル名
// ========================================
const GENRE_NAMES = [
  'JavaScript基礎',  // ジャンル1
  'HTML/CSS',        // ジャンル2
  'React入門',       // ジャンル3
  'Node.js基礎',     // ジャンル4
  'Git/GitHub',      // ジャンル5
  'データベース'      // ジャンル6
];
```

**注**: 以前のバージョンにあった `HOSTING_BASE_URL` は不要になりました。
- 合格証の背景画像は相対パスで読み込みます
- X共有URLは自動的に現在のページURLから取得します

### 2. 合格証背景画像を配置

1. `public/imgs/` フォルダに合格証の背景画像を配置
2. ファイル名の命名規則: `frame_hyousyoujyou_{ジャンル番号}-{レベル番号}.jpg`
   - 例: `frame_hyousyoujyou_1-1.jpg` → ジャンル1・初級
   - 例: `frame_hyousyoujyou_1-2.jpg` → ジャンル1・中級
   - 例: `frame_hyousyoujyou_1-3.jpg` → ジャンル1・上級
   - 例: `frame_hyousyoujyou_7-1.jpg` → エクストラステージ

3. 推奨サイズ: 800x565px（アスペクト比 1.416:1）

### 3. OGP画像を配置（任意）

SNSシェア用の画像を `public/imgs/ogp-image.png` として配置

推奨サイズ: 1200x630px

---

## 静的ホスティング デプロイ

### GitHub Pagesを使う場合

#### 1. リポジトリ作成

1. GitHubで新しいリポジトリを作成
   - リポジトリ名: `quiz-app`（任意）
   - Public or Private
2. ローカルでGit初期化:

```bash
cd quiz-app-static
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/quiz-app.git
git push -u origin main
```

#### 2. GitHub Pages設定

1. リポジトリページで「Settings」→「Pages」
2. Source: **Deploy from a branch**
3. Branch: **main**, Folder: **/ (root)**
4. 「Save」をクリック
5. 数分後、`https://YOUR_USERNAME.github.io/quiz-app/public/` でアクセス可能

**注**: GitHub Pagesは `/ (root)` を選択し、URLに `/public/` を追加してアクセスしてください。

### Netlifyを使う場合

1. [Netlify](https://www.netlify.com/)にログイン
2. 「Add new site」→「Import an existing project」
3. GitHubリポジトリを選択
4. Build settings:
   - **Base directory**: `public`
   - **Build command**: （空欄）
   - **Publish directory**: `.`（publicフォルダがベースの場合）
5. 「Deploy site」
6. デプロイ後、カスタムドメインまたは `https://YOUR_SITE.netlify.app/` でアクセス可能

---

## 動作確認

### 1. 初回アクセス

1. デプロイしたURLにアクセス
2. ニックネーム入力画面が表示される
3. ニックネームを入力して「次へ」

### 2. クイズ実行

1. ジャンル選択画面で好きなジャンルと難易度を選択
2. クイズが表示されるか確認
3. 回答して採点ボタンをクリック
4. 合格/不合格画面が表示されるか確認

### 3. 合格証生成

1. 全問正解した場合、合格証が生成される
2. ダウンロードボタンで画像保存が可能か確認
3. X共有ボタンでツイート画面が開くか確認

### 4. ジャンル選択画面での確認

1. 合格したレベルに🏅バッジが表示されるか確認
2. 次のレベルがアンロックされるか確認

---

## トラブルシューティング

### GAS APIにアクセスできない

**症状**: ブラウザコンソールに `Failed to fetch` エラー

**原因と対策**:
- GASデプロイURLが間違っている → `config.js` を確認
- CORSエラー → GASは自動でCORSヘッダーを返すので、通常問題なし
- アクセス権限が「全員」になっていない → GASデプロイ設定を確認

### 問題が取得できない

**症状**: ローディング後、「問題の取得に失敗しました」エラー

**原因と対策**:
- GASがスプレッドシートに紐付いていない → スプレッドシートから「拡張機能」→「Apps Script」で開いたか確認
- シート名が一致していない → シート名が `ジャンル1` など正確か確認
- データが空 → スプレッドシートに問題データが入力されているか確認

### 合格証が生成されない

**症状**: 合格画面でローディングが終わらない

**原因と対策**:
- 背景画像のパスが間違っている → `config.js` の `CERTIFICATE_BG_IMAGE_MAP` を確認（相対パスを使用）
- 画像ファイルが存在しない → `public/imgs/` に画像があるか確認
- ブラウザコンソールにエラーが出ていないか確認

### ニックネームが保存されない

**症状**: リロードするとニックネーム入力画面に戻る

**原因と対策**:
- ブラウザのlocalStorageが無効 → プライベートモードでないか確認
- Cookieがブロックされている → ブラウザ設定を確認

### 画面が真っ白

**症状**: デプロイしたページにアクセスしても何も表示されない

**原因と対策**:
- `index.html` のパスが間違っている → GitHub Pagesの場合、`/public/index.html` がルートになるか確認
- JavaScriptエラー → ブラウザの開発者ツールでコンソールを確認
- `config.js` が読み込まれていない → ファイルパスを確認

---

## 更新手順

### 問題を追加・修正する場合

1. Googleスプレッドシートで問題データを編集
2. GASのキャッシュは7日間保持されるため、すぐに反映されない
3. 即座に反映したい場合:
   - GASエディタで関数 `clearAllCaches()` を作成:
     ```javascript
     function clearAllCaches() {
       var cache = CacheService.getScriptCache();
       cache.removeAll(cache.getKeys());
     }
     ```
   - 実行してキャッシュをクリア

### デザインを変更する場合

1. `public/css/style.css` を編集
2. Gitにコミット&プッシュ
3. GitHub Pagesの場合、数分で自動反映

### 機能を追加する場合

1. 該当するJSファイルを編集
2. 必要に応じてGASの `code.gs` も編集
3. GASを再デプロイ（新しいバージョンとして）
4. 静的ファイルをGitにプッシュ

---

## サポート

問題が解決しない場合は、以下を確認してください:

1. ブラウザの開発者ツール（F12）でコンソールログを確認
2. GASエディタの「実行ログ」を確認
3. READMEの「よくある質問」セクションを確認

---

## ライセンス

このプロジェクトは MIT License のもとで公開されています。
