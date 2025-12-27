# クイズアプリのカスタマイズガイド

このドキュメントでは、ジャンルごとにクイズアプリをカスタマイズする方法を説明します。

## 📋 目次

- [ファイル構成](#ファイル構成)
- [カスタマイズの基本ルール](#カスタマイズの基本ルール)
- [HTMLの編集方法](#htmlの編集方法)
- [CSSの編集方法](#cssの編集方法)
- [JavaScriptの編集方法](#javascriptの編集方法)
- [新しいジャンルの追加](#新しいジャンルの追加)

---

## ファイル構成

各ジャンルは以下のファイル構成になっています：

```
public/genres/genre1/
├── quiz.html          # クイズページのHTML
├── pass.html          # 合格証ページのHTML
├── style.css          # クイズページのスタイル
├── pass.css           # 合格証ページのスタイル
└── js/
    ├── quiz.js        # クイズページのロジック
    └── pass.js        # 合格証ページのロジック
```

共通ファイル（**全ジャンル共通なので注意して編集**）：

```
public/js/
├── common.js          # 共通関数（慎重に編集）
├── api.js             # API通信処理
└── config.js          # 設定ファイル
```

---

## カスタマイズの基本ルール

### ✅ 自由に編集できるもの

- **各ジャンルのHTML** (`quiz.html`, `pass.html`)
  - ただし `id="..."` は変更しないこと
- **各ジャンルのCSS** (`style.css`, `pass.css`)
- **各ジャンルのJS** (`js/quiz.js`, `js/pass.js`)
  - ジャンル固有の動きを追加する場合

### ⚠️ 注意して編集するもの

- **共通JavaScript** (`public/js/common.js`)
  - すべてのジャンルに影響するため、変更には注意が必要
  - 新しい共通関数を追加する場合はここに書く

### 🚫 変更してはいけないもの

- **HTML要素の `id` 属性**
  - JavaScriptがこのIDを使って要素を見つけています
  - IDを変更すると動作しなくなります

---

## HTMLの編集方法

### 🔴 絶対に変更してはいけない部分

HTMLの `id` 属性は**絶対に変更しないでください**。

```html
<!-- ❌ ダメな例: IDを変更してしまった -->
<button id="mySubmitBtn" class="btn">採点する</button>

<!-- ✅ 良い例: IDはそのまま、classやテキストは変更OK -->
<button id="submitAllBtn" class="btn my-custom-btn">答え合わせ</button>
```

### 主要なID一覧（クイズページ）

| ID | 説明 | 用途 |
|---|---|---|
| `backToGenreSelectionBtn` | ジャンル選択へ戻るボタン | クリックイベント |
| `questionNumberHeader` | 問題番号表示エリア | テキスト表示 |
| `nicknameText` | ニックネーム表示 | テキスト表示 |
| `progressIndicatorHeader` | 進捗インジケーター | 表示切替 |
| `progressDots` | 進捗ドット表示エリア | 動的生成 |
| `multipleInstruction` | 複数選択の注意書き | 表示切替 |
| `questionText` | 問題文表示エリア | テキスト表示 |
| `questionImage` | 問題画像表示エリア | 画像表示 |
| `choices` | 選択肢表示エリア | 動的生成 |
| `prevQuestionBtn` | 前の問題へボタン | クリックイベント |
| `nextQuestionBtn` | 次の問題へボタン | クリックイベント |
| `submitAllBtn` | 採点ボタン | クリックイベント |
| `loading` | ローディング画面 | 画面切替 |
| `loadingText` | ローディングメッセージ | テキスト表示 |
| `resultScreen` | 結果画面 | 画面切替 |
| `passResult` | 合格結果エリア | 表示切替 |
| `failResult` | 不合格結果エリア | 表示切替 |
| `passResultText` | 合格結果テキスト | テキスト表示 |
| `failResultText` | 不合格結果テキスト | テキスト表示 |
| `wrongAnswersList` | 誤答一覧エリア | 動的生成 |
| `goToPassPageBtn` | 合格証を見るボタン | クリックイベント |
| `shareFailToXBtn` | X共有ボタン（不合格時） | クリックイベント |
| `retryLevelBtn` | もう一度挑戦するボタン | クリックイベント |
| `backToGenreSelectionFromPassBtn` | ジャンル選択へ戻る（合格時） | クリックイベント |
| `backToGenreSelectionFromFailBtn` | ジャンル選択へ戻る（不合格時） | クリックイベント |

### ✅ 自由に変更できる部分

以下の要素は自由に変更・追加できます：

- **`class` 属性**: CSSスタイリング用のクラス名
- **ボタンのテキスト**: 表示される文言
- **HTMLの構造**: 新しい要素の追加（ただし、`id`を持つ要素は残すこと）

```html
<!-- ✅ 良い例: classや構造を変更 -->
<div class="my-custom-header">
  <button id="backToGenreSelectionBtn" class="btn btn-large btn-primary">
    🏠 ホームへ戻る
  </button>
</div>
```

---

## CSSの編集方法

各ジャンルの `style.css` は**完全に自由に編集できます**。

### ジャンルごとに違う配色にする例

```css
/* genre1/style.css - 青系 */
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.btn {
  background-color: #667eea;
}
```

```css
/* genre2/style.css - 緑系 */
body {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.btn {
  background-color: #11998e;
}
```

### 既存のclass名を活用する

共通CSSで定義されているクラス名は、`public/css/style.css` を参照してください。

---

## JavaScriptの編集方法

### 📝 必ず変更する定数

各ジャンルの `js/quiz.js` と `js/pass.js` の冒頭にある定数は、必ず正しい値に設定してください。

```javascript
// js/quiz.js と js/pass.js
const GENRE_NUMBER = 1;      // ★ジャンル番号（1~6, 7=extra）
const GENRE_NAME = 'ジャンル1'; // ★ジャンル名（表示用）
```

### 🔧 ジャンル固有の動きを追加する

各ジャンルで独自の動作を追加したい場合は、`js/quiz.js` または `js/pass.js` に関数を追加できます。

例：ジャンル1だけ問題表示時にアニメーションを追加

```javascript
// genre1/js/quiz.js

// 既存のshowQuestion関数の最後に追加
function showQuestion() {
  // ... 既存の処理 ...

  // ジャンル1専用: 問題文にフェードインアニメーション
  const questionEl = document.getElementById('questionText');
  questionEl.style.opacity = '0';
  setTimeout(() => {
    questionEl.style.transition = 'opacity 0.5s';
    questionEl.style.opacity = '1';
  }, 100);
}
```

### 📚 共通関数を使う

`public/js/common.js` には以下のような共通関数が用意されています。各ジャンルのJSから自由に呼び出せます。

#### よく使う共通関数

| 関数名 | 説明 | 使用例 |
|---|---|---|
| `showScreen(screenId)` | 指定した画面を表示 | `showScreen('loading')` |
| `showLoading(message)` | ローディング表示 | `showLoading('問題を読み込み中...')` |
| `hideLoading()` | ローディング非表示 | `hideLoading()` |
| `getNickname()` | ニックネームを取得 | `const name = getNickname()` |
| `setNickname(name)` | ニックネームを設定 | `setNickname('太郎')` |
| `getBrowserId()` | ユーザーIDを取得 | `const userId = getBrowserId()` |
| `loadQuestionsCommon(genre, level)` | 問題を読み込む | `await loadQuestionsCommon(GENRE_NAME, '初級')` |
| `shareToXCommon(genre, level, isPassed, score, total)` | X共有 | `shareToXCommon(GENRE_NAME, '初級', true)` |
| `backToGenreSelection()` | ジャンル選択へ戻る | `backToGenreSelection()` |
| `retryLevel()` | もう一度挑戦 | `retryLevel()` |

詳しくは `public/js/common.js` のコメントを参照してください。

### 🛠️ 共通関数を追加する

全ジャンルで使いたい関数は `public/js/common.js` に追加してください。

```javascript
// public/js/common.js に追加

/**
 * カウントダウンタイマーを表示する
 * @param {number} seconds - 秒数
 * @param {function} callback - 終了時のコールバック
 */
function startCountdown(seconds, callback) {
  let remaining = seconds;
  const timer = setInterval(() => {
    console.log(`残り ${remaining} 秒`);
    remaining--;
    if (remaining < 0) {
      clearInterval(timer);
      if (callback) callback();
    }
  }, 1000);
}
```

そして各ジャンルから呼び出します：

```javascript
// genre1/js/quiz.js

// 問題表示時に30秒タイマーを開始
function showQuestion() {
  // ... 既存の処理 ...

  startCountdown(30, () => {
    alert('時間切れです！');
    nextQuestion();
  });
}
```

---

## 新しいジャンルの追加

### 1. ジャンルフォルダをコピー

既存のジャンル（例: `genre1`）をコピーして新しいジャンル名に変更します。

```bash
# genre7を作成する場合
cp -r public/genres/genre1 public/genres/genre7
```

### 2. 定数を変更

新しいジャンルの `js/quiz.js` と `js/pass.js` の定数を変更します。

```javascript
// genre7/js/quiz.js
const GENRE_NUMBER = 7;
const GENRE_NAME = 'ジャンル7';
```

```javascript
// genre7/js/pass.js
const GENRE_NUMBER = 7;
const GENRE_NAME = 'ジャンル7';
```

### 3. ジャンル選択画面に追加

`public/genre-select.html` を編集して、新しいジャンルへのリンクを追加します。

```html
<!-- genre-select.html -->
<div class="genre-card" data-genre="7">
  <div class="genre-title">ジャンル7</div>
  <div class="genre-description">新しいジャンルの説明</div>
</div>
```

### 4. CSS・HTMLをカスタマイズ

新しいジャンルの見た目や動作を自由にカスタマイズしてください。

---

## トラブルシューティング

### ボタンを押しても何も起こらない

1. ブラウザの開発者ツール（F12）でコンソールエラーを確認
2. ボタンの `id` が正しいか確認
3. `js/quiz.js` で `setupQuizPageEventListenersCommon()` が呼ばれているか確認

### 画面が切り替わらない

1. `showScreen()` 関数が正しく呼ばれているか確認
2. 対象の画面要素に `id` が正しく設定されているか確認
3. CSS で `display: none` が適用されていないか確認

### API通信がうまくいかない

1. `public/js/config.js` の `GAS_API_ENDPOINT` が正しいか確認
2. ブラウザのコンソールでエラーメッセージを確認
3. `public/js/api.js` のエラーハンドリングを確認

---

## まとめ

- **IDは絶対に変更しない**
- **class・テキスト・構造は自由に変更OK**
- **CSSは完全に自由**
- **共通処理は `common.js` を活用**
- **ジャンル固有の処理は各ジャンルのJSに追加**

わからないことがあれば、まず既存のコードを読んでみてください。コメントも参考になります。

Happy Coding! 🎉
