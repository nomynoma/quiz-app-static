# クイズアプリ - 静的ファイル + GAS API版

完全に静的なHTML/CSS/JSと、Google Apps ScriptのAPI化により、高速で拡張性の高いクイズアプリケーションです。

## 🎯 特徴

- **完全静的フロントエンド**: GitHub Pages / Netlify等で無料ホスティング可能
- **GAS APIバックエンド**: 問題データはGASキャッシュで高速配信（200-500ms）
- **ジャンル別フォルダ構成**: チームで分担開発しやすい設計
- **スケーラブル**: 毎分100リクエスト以上に対応
- **合格証生成**: html2canvasでJPEG形式の合格証を自動生成
- **エクストラステージ**: 全ジャンル上級クリア後に解放される最高難度ステージ
- **超級モード**: 各ジャンルの上級クリア後に挑戦できる特別モード
- **ランキング機能**: エクストラステージの殿堂入り＋TOP10挑戦者を表示
- **合格証モーダル**: ジャンル選択画面から過去の合格証を閲覧・再ダウンロード可能

## 📁 プロジェクト構成

```
quiz-app-static/
├── public/                    # 静的ファイル（GitHub Pages等でホスティング）
│   ├── index.html            # エントリーポイント（自動ルーティング）
│   ├── nickname.html         # ニックネーム入力ページ
│   ├── genre-select.html     # ジャンル選択＋合格証表示ページ
│   ├── score.html            # スコアランキングページ
│   │
│   ├── genres/               # ★ジャンル別フォルダ（チーム分担用）★
│   │   ├── genre1/
│   │   │   ├── quiz.html     # クイズ画面 + 結果表示（合格/不合格統合）
│   │   │   ├── pass.html     # 合格証生成画面
│   │   │   └── js/
│   │   │       ├── quiz.js   # クイズロジック + 結果表示ロジック
│   │   │       └── pass.js   # 合格証生成
│   │   ├── genre2/           # （genre1と同じ構成）
│   │   ├── genre3/
│   │   ├── genre4/
│   │   ├── genre5/
│   │   ├── genre6/
│   │   └── extra/            # エクストラステージ
│   │
│   ├── css/
│   │   ├── style.css         # 共通CSS
│   │   └── genre-select.css  # ジャンル選択画面専用CSS（合格証スタイル含む）
│   │
│   ├── js/
│   │   ├── config.js         # ★設定ファイル（GAS URL、ジャンル名等）★
│   │   ├── api.js            # GAS API通信ライブラリ
│   │   ├── common.js         # 共通ユーティリティ（SHA-256, localStorage等）
│   │   ├── nickname.js       # ニックネーム画面用JS
│   │   ├── genre-select.js   # ジャンル選択画面用JS
│   │   └── score.js          # スコア画面用JS
│   │
│   └── imgs/                  # 画像ファイル
│       ├── favicon.svg
│       ├── ogp-image.png
│       └── frame_hyousyoujyou_*.jpg  # 合格証背景画像
│
├── gas/                       # Google Apps Script
│   ├── code.gs               # メインAPI（完全API化 + キャッシュ戦略）
│   └── appsscript.json       # GAS設定
│
├── README.md                  # このファイル
└── SETUP.md                   # 詳細セットアップ手順
```

## 🏗️ アーキテクチャ

### データフロー

```
[ブラウザ]
   ↓ fetch (action: getQuestions, genre: "ジャンル1", level: "初級")
[GAS API]
   ↓
[CacheService] ← ★ジャンル×レベル別にキャッシュ（7日間）★
   ↓ キャッシュミス時のみ
[Spreadsheet] ← シート名: ジャンル1, ジャンル2, ... (各シート内でlevel列で分ける)
```

**キャッシュキー戦略**:
- `q_ジャンル1_初級` → ジャンル1シートのlevel="初級"データ
- `q_ジャンル2_中級` → ジャンル2シートのlevel="中級"データ
- エクストラモードは全ジャンル×全レベルのキャッシュから動的に集約（専用シート不要）

※ 1つのシート内に全レベルの問題を格納し、キャッシュだけレベルごとに分割保存

### API一覧

| エンドポイント | メソッド | 説明 | レスポンスタイム |
|---------------|---------|------|----------------|
| `?path=ping` | GET | ヘルスチェック | 100ms |
| `?path=config` | GET | アプリ設定取得 | 100ms |
| `action=getQuestions` | POST | 問題取得（ジャンル×レベル指定） | 200-500ms（キャッシュヒット時） |
| `action=judgeAnswers` | POST | 一括採点 | 200-500ms |
| `action=getUltraModeQuestions` | POST | 超級モード問題取得 | 500-1000ms |
| `action=getExtraModeQuestions` | POST | エクストラモード問題取得 | 500-1500ms |
| `action=saveScore` | POST | スコア保存 | 500-1000ms |
| `action=getTopScores` | POST | ランキング取得 | 300-800ms |
| `action=getHallOfFame` | POST | 殿堂入り取得 | 300-800ms |
| `action=getTopChallengers` | POST | TOP10挑戦者取得 | 300-800ms |

## 🚀 セットアップ

### 1. Googleスプレッドシート準備

1. 新しいGoogleスプレッドシートを作成
2. 以下のシートを作成:

**必須シート名（6シート）**:
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

3. 各シートの列構成:

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
- B列（level）で「初級」「中級」「上級」を区別します
- GASが自動的にレベルごとにキャッシュを分けて保存します

**正解の書き方**:
- 単一選択: `B` （A/B/C/Dの記号で指定）
- 複数選択: `A,B` （記号をカンマ区切り、大文字小文字問わず）
- 入力式: `let` （正解テキストを直接記入）

### 2. GASデプロイ

1. **スプレッドシートから直接GASエディタを開く**
   - 作成したスプレッドシートを開く
   - 「拡張機能」→「Apps Script」をクリック
   - これでスプレッドシートに紐付いたGASプロジェクトが作成されます

2. `gas/code.gs` の内容を全てコピー＆ペースト
   - デフォルトの `コード.gs` に貼り付け

3. （任意）`gas/appsscript.json` の内容を設定
   - 「プロジェクトの設定」→「マニフェストファイルをエディタで表示する」をON
   - `appsscript.json` タブが表示されたら内容を貼り付け

4. 「デプロイ」→「新しいデプロイ」
5. 種類: **ウェブアプリ**
6. 設定:
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**
7. デプロイURLをコピー（例: `https://script.google.com/macros/s/XXXXX/exec`）

**重要**: GASプロジェクトは必ずスプレッドシートから開いてください。`SpreadsheetApp.getActiveSpreadsheet()`でスプレッドシートにアクセスしています。

### 3. 静的ファイル設定

`public/js/config.js` を開き、以下を編集:

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

**注**: `HOSTING_BASE_URL`は不要です（相対パスとURL自動取得を使用）。

### 4. 合格証背景画像を配置

1. `public/imgs/` フォルダに合格証の背景画像を配置
2. ファイル名の命名規則: `frame_hyousyoujyou_{ジャンル番号}-{レベル番号}.jpg`
   - 例: `frame_hyousyoujyou_1-1.jpg` → ジャンル1・初級
   - 例: `frame_hyousyoujyou_1-3.jpg` → ジャンル1・上級
   - 例: `frame_hyousyoujyou_1-4.jpg` → ジャンル1・超級
   - エクストラステージは `ALL` キーまたは `1-1` が使用されます
3. 推奨サイズ: 800x565px
4. 合格証は JPEG 形式（品質90%）で生成されます

### 5. 静的ファイルをホスティング

**GitHub Pagesの場合**:

```bash
cd quiz-app-static
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/quiz-app.git
git push -u origin main
```

リポジトリの「Settings」→「Pages」→ Source を `main` / `/public` に設定

**Netlify Dropの場合**:

1. [https://app.netlify.com/drop](https://app.netlify.com/drop) にアクセス
2. `public/` フォルダをドラッグ&ドロップ
3. 即座にURLが生成される

## 📊 パフォーマンス

### ベンチマーク（GASキャッシュヒット時）

- 問題取得: **200-500ms**
- 採点: **200-500ms**
- スコア保存: **500-1000ms**
- ランキング取得: **300-800ms**

### キャッシュ戦略

- **キャッシュ期間**: 7日間（CacheService.getScriptCache）
- **キャッシュ粒度**: ジャンル×レベル単位（例: `questions_ジャンル1_初級`）
- **キャッシュミス時**: スプレッドシートから取得 → 自動キャッシュ

### スケーラビリティ

- **同時実行数**: 30（GAS制限）
- **推奨アクセス数**: 毎分100リクエスト程度まで
- **瞬間バースト**: 10-15人同時アクセスまで対応可能

## 🛠️ 開発

### ローカル開発（VSCode Live Server推奨）

1. VSCodeで `public/index.html` を開く
2. 右下の「Go Live」ボタンをクリック
3. `http://localhost:5500` で開く

**注意**: API連携（問題取得・採点）は本番GASが必要

### モックデータで開発する場合

API連携前にUIを完成させたい場合、一時的にモックデータを使用:

```javascript
// genres/genre1/js/quiz.js の loadQuestions() を一時的に書き換え
async function loadQuestions() {
  showScreen('loading');

  // モックデータ（開発用）
  questions = [
    {
      id: 1,
      question: 'JavaScriptで変数を宣言するキーワードは？',
      choiceA: 'var',
      choiceB: 'let',
      choiceC: 'const',
      choiceD: 'function',
      selectionType: 'single',
      displayType: 'text'
    }
  ];

  userAnswers = questions.map(q => ({ questionId: q.id, answer: null }));
  currentQuestionIndex = 0;
  showQuestion();
}
```

### デバッグモード

ブラウザのコンソールで:

```javascript
enableDebugMode();
```

### API レスポンスタイム確認

各APIレスポンスに `_meta` フィールドが含まれます:

```json
{
  "questions": [...],
  "_meta": {
    "executionTime": 234,
    "timestamp": "2025-01-01T12:00:00.000Z",
    "cacheHit": true
  }
}
```

## 👥 チーム開発

### ジャンル別に作業を分担

各メンバーが異なるジャンルフォルダを担当することで、Gitコンフリクトを回避:

- **メンバーA**: `public/genres/genre1/` を担当
- **メンバーB**: `public/genres/genre2/` を担当
- **メンバーC**: `public/genres/genre3/` を担当

### ジャンル追加時の手順

1. Googleスプレッドシートに新しいシートを追加（例: `genre7_初級`）
2. `public/genres/genre7/` フォルダを作成（genre1をコピー）
3. `public/genres/genre7/js/*.js` の定数を変更:

```javascript
const GENRE_NUMBER = 7; // ★ジャンルごとに変更★
const GENRE_NAME = 'ジャンル7'; // ★ジャンルごとに変更★
```

4. `public/js/config.js` の `GENRE_NAMES` に追加:

```javascript
const GENRE_NAMES = [
  'ジャンル1',
  'ジャンル2',
  // ...
  'ジャンル7' // ★追加★
];
```

5. 合格証画像を追加（`frame_hyousyoujyou_7-1.jpg` など）

## 📝 問題データ更新フロー

### 手動更新

1. Googleスプレッドシートで問題を追加・編集
2. **キャッシュは7日後に自動更新される**

### 即座に反映したい場合

GASエディタで以下の関数を作成・実行:

```javascript
function clearAllCaches() {
  var cache = CacheService.getScriptCache();
  cache.removeAll(cache.getKeys());
  Logger.log('全キャッシュをクリアしました');
}
```

次回のAPI呼び出し時に、最新データがスプレッドシートから取得されます。

## 🎮 ゲームモード

### 通常モード（初級・中級・上級）

各ジャンルで初級→中級→上級の順に挑戦します。各レベルで全問正解すると合格証が発行されます。

### 超級モード

上級をクリアすると解放される特別モード。全問正解で合格証が発行されます。

### エクストラステージ

**解放条件**: 全6ジャンルの上級をクリア

**特徴**:
- 全ジャンル・全レベルから問題がランダムに出題
- 全問正解で「殿堂入り」として名前が刻まれます
- クリアタイムがランキングに記録されます

**ランキング**:
- **殿堂入り**: エクストラステージを全問正解した挑戦者（クリアタイム順）
- **TOP10挑戦者**: エクストラステージで最も多く正解した挑戦者（スコア＋タイム順）

## 🏅 合格証システム

### 合格証の生成

- 各レベルクリア時に自動生成（JPEG形式、800x565px）
- ニックネームと取得日が記録されます
- html2canvasを使用してクライアント側で生成

### 合格証の閲覧

ジャンル選択画面で各難易度ボタンに🏅メダルが表示されます。クリックすると：
- モーダルで合格証を表示
- 再ダウンロード可能
- ジャンル別の色でテキストがカスタマイズされます

### ファイル名形式

`合格証_{ニックネーム}_{ジャンル名}_{レベル名}.jpg`

例: `合格証_太郎_ジャンル1_初級.jpg`

## 🎨 カスタマイズ

### デザイン変更

- 全体のデザイン: `public/css/style.css` を編集
- ジャンル選択画面: `public/css/genre-select.css` を編集
- ジャンル別のクイズ画面: `public/genres/genreN/style.css` を編集

### 合格証のスタイル変更

`public/css/genre-select.css` で合格証テキストのスタイルをカスタマイズ:

```css
/* 合格証テキストスタイル */
.certificate-title {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 20px;
}

/* ジャンル別の色 */
.certificate-genre1 {
  color: #881337; /* ジャンル1: 赤系 */
}
```

### ジャンル名変更

`public/js/config.js` の `GENRE_NAMES` を編集

### 難易度名変更

`public/js/config.js` の `LEVEL_NAMES` を編集:

```javascript
const LEVEL_NAMES = ['初級', '中級', '上級'];
```

## ❓ トラブルシューティング

### Q: APIが `Unknown action` エラーを返す
**A**: `public/js/config.js` の `GAS_API_URL` が正しいか確認してください

### Q: 問題が表示されない
**A**:
1. スプレッドシートのシート名が正確か確認（`genre1_初級` など）
2. GASの `SPREADSHEET_ID` が正しいか確認
3. ブラウザコンソールでエラーを確認

### Q: キャッシュが更新されない
**A**: GASエディタで `clearAllCaches()` 関数を実行してキャッシュをクリア

### Q: 合格証が生成されない
**A**:
1. 背景画像が `public/imgs/` に存在するか確認
2. `config.js` の `CERTIFICATE_BG_IMAGE_MAP` が正しいか確認
3. ブラウザコンソールでCORSエラーがないか確認

### Q: CORSエラーが出る
**A**: GASのデプロイ設定で「アクセスできるユーザー: 全員」になっているか確認

### Q: ジャンル選択からクイズ画面に遷移できない
**A**: `public/js/genre-select.js` の `goToQuiz()` 関数が `genres/{folder}/quiz.html` に遷移しているか確認

### Q: エクストラステージが表示されない
**A**:
1. 全6ジャンルの上級（level="上級"）をクリアしているか確認
2. ブラウザのlocalStorageに合格証メタデータ（`cert_1-3` ～ `cert_6-3`）が存在するか確認
3. テスト用に `unlockExtraStage()` 関数をコンソールで実行（`config.js`に定義）

### Q: 合格証モーダルで画像が表示されない
**A**:
1. html2canvasライブラリが正しく読み込まれているか確認
2. 背景画像のURLが正しいか確認（相対パスの調整が必要）
3. ブラウザコンソールでCORSエラーがないか確認
4. `genre-select.css` が読み込まれているか確認

### Q: 合格証のダウンロードファイル名が違う
**A**: 合格画面とモーダルで同じファイル名形式（`合格証_{ニックネーム}_{ジャンル名}_{レベル名}.jpg`）を使用しています。ジャンル名は `config.js` の `GENRE_NAMES` から取得されます。

### Q: 超級モードが解放されない
**A**: 各ジャンルの上級（level="上級"）をクリアする必要があります。超級は上級クリア後に自動的に解放されます。

## 📄 ライセンス

MIT License

## 🤝 貢献

Issue・Pull Request歓迎！

詳細なセットアップ手順は [SETUP.md](SETUP.md) を参照してください。
