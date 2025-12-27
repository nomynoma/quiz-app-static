// ========================================
// クイズアプリ - 共通ユーティリティ
// ========================================

// ========================================
// ローカルストレージ管理
// ========================================

// ニックネームを保存
function saveNickname(nickname) {
  try {
    localStorage.setItem(STORAGE_KEYS.NICKNAME, nickname);
    return true;
  } catch (e) {
    console.error('ニックネーム保存エラー:', e);
    return false;
  }
}

// ニックネームを取得
function getNickname() {
  try {
    return localStorage.getItem(STORAGE_KEYS.NICKNAME) || '';
  } catch (e) {
    console.error('ニックネーム取得エラー:', e);
    return '';
  }
}

// ブラウザIDを取得（なければ生成）
function getBrowserId() {
  try {
    let browserId = localStorage.getItem(STORAGE_KEYS.BROWSER_ID);
    if (!browserId) {
      browserId = generateBrowserId();
      localStorage.setItem(STORAGE_KEYS.BROWSER_ID, browserId);
    }
    return browserId;
  } catch (e) {
    console.error('ブラウザID取得エラー:', e);
    return generateBrowserId();
  }
}

// ブラウザIDを生成
function generateBrowserId() {
  return 'browser_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

// 合格証メタデータを保存
function saveCertificateMetadata(key, nickname, date) {
  try {
    const metadata = {
      nickname: nickname,
      date: date,
      timestamp: new Date().getTime()
    };
    const jsonStr = JSON.stringify(metadata);
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    localStorage.setItem(key, encoded);
    return true;
  } catch (e) {
    console.error('合格証メタデータ保存エラー:', e);
    return false;
  }
}

// 合格証メタデータを取得
function getCertificateMetadata(key) {
  try {
    const encoded = localStorage.getItem(key);
    if (!encoded) return null;

    const jsonStr = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('合格証メタデータ取得エラー:', e);
    return null;
  }
}

// 全ローカルストレージをクリア
function clearAllStorage() {
  if (confirm('本当にすべてのデータ（ニックネーム・合格証・スコア）を削除しますか？')) {
    try {
      localStorage.clear();
      alert('すべてのデータを削除しました。ページを再読み込みします。');
      location.reload();
    } catch (e) {
      console.error('ストレージクリアエラー:', e);
      alert('データの削除に失敗しました。');
    }
  }
}

// ========================================
// SHA-256 ハッシュ生成（採点用）
// ========================================

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 回答を正規化
function normalizeAnswer(answer) {
  if (Array.isArray(answer)) {
    return answer
      .map(a => a.toString().trim().toUpperCase())
      .sort()
      .join(',');
  }
  return answer.toString().trim().toUpperCase();
}

// ハッシュで回答をチェック
async function checkAnswerByHash(userAnswer, correctHash) {
  const normalized = normalizeAnswer(userAnswer);
  const userHash = await sha256(normalized);
  return userHash === correctHash;
}

// ========================================
// URL操作
// ========================================

// URLパラメータを取得
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// URLパラメータを設定
function setUrlParameter(name, value) {
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  window.history.pushState({}, '', url);
}

// ページ遷移
function navigateTo(path, params = {}) {
  const url = new URL(path, window.location.origin);
  Object.keys(params).forEach(key => {
    url.searchParams.set(key, params[key]);
  });
  window.location.href = url.href;
}

// ========================================
// 日付フォーマット
// ========================================

function formatDate(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}年${month}月${day}日`;
}

function formatDateTime(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}/${month}/${day} ${hour}:${minute}`;
}

// ========================================
// 配列ユーティリティ
// ========================================

// 配列をシャッフル（Fisher-Yates）
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 配列からランダムに要素を取得
function getRandomElements(array, count) {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}

// ========================================
// バリデーション
// ========================================

function validateNickname(nickname) {
  if (!nickname || nickname.trim() === '') {
    return { valid: false, message: 'ニックネームを入力してください' };
  }

  if (nickname.length > 10) {
    return { valid: false, message: 'ニックネームは10文字以内にしてください' };
  }

  // 特殊文字チェック（オプション）
  const regex = /^[a-zA-Z0-9ぁ-んァ-ヶー一-龠々\s]+$/;
  if (!regex.test(nickname)) {
    return { valid: false, message: '使用できない文字が含まれています' };
  }

  return { valid: true };
}

// ========================================
// デバッグ用
// ========================================

function enableDebugMode() {
  window.DEBUG_MODE = true;
  console.log('🐛 デバッグモードを有効にしました');
}

function debugLog(...args) {
  if (window.DEBUG_MODE) {
    console.log('🐛 [DEBUG]', ...args);
  }
}

// ========================================
// エラーハンドリング
// ========================================

function showError(message) {
  alert('エラー: ' + message);
  console.error('エラー:', message);
}

function showMessage(message) {
  alert(message);
}

// ========================================
// ローディング表示
// ========================================

function showLoading(message = '読み込み中...') {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
      loadingText.textContent = message;
    }
    loadingEl.classList.add('active');
  }
}

function hideLoading() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.classList.remove('active');
  }
}

// ========================================
// YouTube関連のヘルパー関数
// ========================================

/**
 * YouTube URLから動画IDを抽出
 * @param {string} url - YouTube URL
 * @returns {string|null} 動画ID、または抽出できない場合はnull
 */
function extractYouTubeId(url) {
  if (!url) return null;

  // youtube.com/watch?v=VIDEO_ID 形式
  const watchMatch = url.match(/[?&]v=([^&#]+)/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/VIDEO_ID 形式
  const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/VIDEO_ID 形式
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&#]+)/);
  if (embedMatch) return embedMatch[1];

  return null;
}

/**
 * YouTube動画IDからサムネイルURLを生成
 * @param {string} videoId - YouTube動画ID
 * @returns {string} サムネイルURL
 */
function getYouTubeThumbnail(videoId) {
  // maxresdefaultを最初に試み、存在しない場合はhqdefaultにフォールバック
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// ========================================
// パフォーマンス計測
// ========================================

const performanceMarkers = {};

function markPerformance(name) {
  performanceMarkers[name] = performance.now();
}

function measurePerformance(startName, endName) {
  if (!performanceMarkers[startName] || !performanceMarkers[endName]) {
    console.warn('パフォーマンスマーカーが見つかりません');
    return 0;
  }

  const duration = performanceMarkers[endName] - performanceMarkers[startName];
  console.log(`⏱️ ${startName} → ${endName}: ${duration.toFixed(2)}ms`);
  return duration;
}

// ========================================
// 画面切替（共通）
// ========================================

/**
 * 画面を切り替える
 * @param {string} id - 表示する画面のID
 */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ========================================
// ナビゲーション（共通）
// ========================================

/**
 * クイズをリトライする（ページリロード）
 */
function retryLevel() {
  window.location.reload();
}

/**
 * ジャンル選択画面へ戻る（確認あり）
 * @param {boolean} clearSession - sessionStorageをクリアするか（デフォルト: false）
 */
function backToGenreSelection(clearSession = false) {
  if (confirm('クイズを中断してジャンル選択に戻りますか？')) {
    if (clearSession) {
      sessionStorage.removeItem('quizResult');
    }
    window.location.href = '../../genre-select.html';
  }
}

/**
 * ジャンル選択画面へ戻る（確認なし、pass.html用）
 */
function backToGenreSelectionFromPass() {
  sessionStorage.removeItem('quizResult');
  window.location.href = '../../genre-select.html';
}

// ========================================
// 誤答一覧表示（共通）
// ========================================

/**
 * 誤答一覧を表示する
 * @param {Array} wrongAnswers - 誤答の配列
 */
function displayWrongAnswers(wrongAnswers) {
  const wrongAnswersList = document.getElementById('wrongAnswersList');

  if (!wrongAnswers || wrongAnswers.length === 0) {
    wrongAnswersList.style.display = 'none';
    return;
  }

  wrongAnswersList.innerHTML = '<h2 style="font-size: 18px; margin-top: 30px; margin-bottom: 15px;">📋 間違えた問題</h2>';

  wrongAnswers.forEach(wrong => {
    const wrongItem = document.createElement('div');
    wrongItem.className = 'wrong-answer-item';

    let html = `
      <div class="wrong-answer-header">
        <strong>問題 ${wrong.questionNumber}</strong>
      </div>
      <div class="wrong-answer-body">
        <p class="wrong-answer-question">${wrong.question || '（問題文なし）'}</p>
        <p class="wrong-answer-user">
          <strong>あなたの回答:</strong> ${wrong.userAnswer}
        </p>
    `;

    if (wrong.hintText) {
      html += `<p class="wrong-answer-hint"><strong>ヒント:</strong> ${wrong.hintText}</p>`;
    }

    if (wrong.hintUrl) {
      html += `
        <p class="wrong-answer-link">
          <a href="${wrong.hintUrl}" target="_blank" rel="noopener noreferrer">
            📖 解説ページを見る
          </a>
        </p>
      `;

      // YouTube動画の場合はサムネイルを表示
      const youtubeId = extractYouTubeId(wrong.hintUrl);
      if (youtubeId) {
        const thumbnailUrl = getYouTubeThumbnail(youtubeId);
        html += `
          <a href="${wrong.hintUrl}" target="_blank" rel="noopener noreferrer" class="hint-thumbnail-link">
            <div class="hint-thumbnail">
              <img src="${thumbnailUrl}" alt="YouTube動画サムネイル" onerror="this.closest('.hint-thumbnail-link').style.display='none'">
            </div>
          </a>
        `;
      }
    }

    html += '</div>';

    wrongItem.innerHTML = html;
    wrongAnswersList.appendChild(wrongItem);
  });
}

// ========================================
// 合格証関連（共通）
// ========================================

/**
 * 合格証をダウンロードする
 * @param {string} certificateImageData - 合格証の画像データ（base64）
 * @param {string} genreName - ジャンル名
 * @param {string} level - レベル名
 */
function downloadCertificateCommon(certificateImageData, genreName, level) {
  if (!certificateImageData) {
    alert('合格証画像が生成されていません。');
    return;
  }

  const nickname = getNickname();
  const fileName = `合格証_${nickname}_${genreName}_${level}.webp`;

  const link = document.createElement('a');
  link.href = certificateImageData;
  link.download = fileName;
  link.click();
}

/**
 * 合格証を別窓で開く
 * @param {string} certificateImageData - 合格証の画像データ（base64）
 */
function openCertificateInNewTab(certificateImageData) {
  if (!certificateImageData) {
    alert('合格証画像が生成されていません。');
    return;
  }

  // 画像データURLを直接新しいタブで開く
  window.open(certificateImageData, '_blank');
}

/**
 * X（Twitter）で共有する
 * @param {string} genreName - ジャンル名
 * @param {string} level - レベル名
 * @param {boolean} isPass - 合格時かどうか（デフォルト: true）
 * @param {number} score - スコア（不合格時用、オプション）
 * @param {number} total - 総問題数（不合格時用、オプション）
 */
function shareToXCommon(genreName, level, isPass = true, score = null, total = null) {
  let text;

  if (isPass) {
    const levelText = level === '超級' ? '超級全問正解' : `${level}合格`;
    text = `クイズアプリで${genreName}の${levelText}しました！君も挑戦してみよう！`;
  } else {
    text = `クイズアプリで${genreName}の${level}に挑戦したよ！${score}/${total}問正解！君も挑戦してみよう！`;
  }

  const url = getAppBaseUrl();
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

  window.open(twitterUrl, '_blank', 'width=550,height=420');
}

/**
 * クイズ不合格時のX共有（quiz.js用）
 * @param {string} genreName - ジャンル名
 * @param {string} currentLevel - 現在のレベル
 */
function shareFailToXFromQuiz(genreName, currentLevel) {
  const failResultText = document.getElementById('failResultText');
  const scoreMatch = failResultText.textContent.match(/(\d+)\s*\/\s*(\d+)/);

  if (!scoreMatch) return;

  const score = scoreMatch[1];
  const total = scoreMatch[2];

  shareToXCommon(genreName, currentLevel, false, score, total);
}

/**
 * クイズページ用の共通イベントリスナーを設定する
 * @param {Object} handlers - 各関数へのマッピング
 *   - backToGenreSelection: ジャンル選択へ戻る関数
 *   - previousQuestion: 前の問題へ
 *   - nextQuestion: 次の問題へ
 *   - submitAllAnswers: 採点する
 *   - goToPassPage: 合格証ページへ
 *   - shareFailToX: X共有（不合格時）
 */
function setupQuizPageEventListenersCommon(handlers) {
  setupCommonEventListeners({
    backToGenreSelectionBtn: handlers.backToGenreSelection,
    prevQuestionBtn: handlers.previousQuestion,
    nextQuestionBtn: handlers.nextQuestion,
    submitAllBtn: handlers.submitAllAnswers,
    goToPassPageBtn: handlers.goToPassPage,
    backToGenreSelectionFromPassBtn: handlers.backToGenreSelection,
    shareFailToXBtn: handlers.shareFailToX,
    retryLevelBtn: retryLevel,
    backToGenreSelectionFromFailBtn: handlers.backToGenreSelection
  });
}

// ========================================
// 共通イベントリスナー設定（IDベース）
// ========================================

/**
 * 共通のイベントリスナーを設定する
 * 各ページで呼び出すことで、HTML内のonclick属性なしでイベント処理が可能
 *
 * @param {Object} handlers - イベントハンドラーのマッピング
 *   例: { certificateDisplayImage: () => openCertificateInNewTab(imageData) }
 */
function setupCommonEventListeners(handlers = {}) {
  // handlers オブジェクトの各キー（ID）に対してイベントリスナーを設定
  Object.keys(handlers).forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
      const handler = handlers[elementId];

      // ボタン要素の場合はclick、img要素の場合もclick
      element.addEventListener('click', handler);
    }
  });
}

// ========================================
// 合格証ページ共通処理
// ========================================

// 合格証画像データをグローバルに保持（各ページから設定される）
let _certificateImageData = null;

/**
 * 合格証画像データを設定
 * @param {string} imageData - base64エンコードされた画像データ
 */
function setCertificateImageData(imageData) {
  _certificateImageData = imageData;
  console.log('合格証画像データ設定:', imageData ? imageData.substring(0, 50) + '...' : 'null');
}

/**
 * 合格証画像データを取得
 * @returns {string|null} base64エンコードされた画像データ
 */
function getCertificateImageData() {
  return _certificateImageData;
}

/**
 * 合格証ページ用の共通イベントリスナーを設定する
 * @param {string} genreName - ジャンル名
 * @param {Object} quizResult - クイズ結果オブジェクト
 */
function setupPassPageEventListenersCommon(genreName, quizResult) {
  setupCommonEventListeners({
    certificateDisplayImage: function() {
      // クリック時にDOM要素から直接src属性を取得
      const imgElement = document.getElementById('certificateDisplayImage');
      const imageData = imgElement ? imgElement.src : null;
      console.log('certificateImageData:', imageData ? 'データあり' : 'null');
      openCertificateInNewTab(imageData);
    },
    downloadCertificateBtn: function() {
      downloadCertificateCommon(getCertificateImageData(), genreName, quizResult.level);
    },
    shareToXBtn: function() {
      shareToXCommon(genreName, quizResult.level, true);
    },
    nextLevelBtn: function() {
      passPageNextLevel(quizResult.level);
    },
    backToGenreSelectionBtn: function() {
      backToGenreSelectionFromPass();
    }
  });
}

/**
 * 合格証ページから次のレベルへ遷移
 * @param {string} currentLevel - 現在のレベル
 */
function passPageNextLevel(currentLevel) {
  const currentLevelIndex = LEVEL_NAMES.indexOf(currentLevel);

  let nextLevelName;
  if (currentLevel === '超級') {
    alert('次のレベルがありません。');
    return;
  } else if (currentLevelIndex === 2) {
    // 上級 → 超級
    nextLevelName = '超級';
  } else if (currentLevelIndex >= 0 && currentLevelIndex < LEVEL_NAMES.length - 1) {
    nextLevelName = LEVEL_NAMES[currentLevelIndex + 1];
  } else {
    alert('次のレベルがありません。');
    return;
  }

  // クイズ画面へ遷移
  const params = new URLSearchParams();
  params.set('level', nextLevelName);
  window.location.href = 'quiz.html?' + params.toString();
}

/**
 * 合格証ページの結果を表示する
 * @param {Object} quizResult - クイズ結果オブジェクト
 */
function displayPassResult(quizResult) {
  const scoreText = document.getElementById('scoreText');
  scoreText.innerHTML = `
    <div style="font-size: 48px; font-weight: bold; color: #28a745; margin: 20px 0;">
      ${quizResult.score} / ${quizResult.total}
    </div>
    <p style="font-size: 18px; color: #666;">
      ${quizResult.level} 全問正解！
    </p>
  `;

  // 次のレベルボタンの表示判定
  updateNextLevelButton(quizResult);
}

/**
 * 次のレベルボタンの表示を更新
 * @param {Object} quizResult - クイズ結果オブジェクト
 */
function updateNextLevelButton(quizResult) {
  const nextLevelBtn = document.getElementById('nextLevelBtn');

  // 超級の場合は次のレベルがない
  if (quizResult.level === '超級') {
    nextLevelBtn.style.display = 'none';
    return;
  }

  // 現在のレベルのインデックスを取得
  const currentLevelIndex = LEVEL_NAMES.indexOf(quizResult.level);

  if (currentLevelIndex === -1) {
    nextLevelBtn.style.display = 'none';
    return;
  }

  // 上級の場合は超級へ
  if (currentLevelIndex === 2) {
    nextLevelBtn.textContent = '超級へすすむ';
    nextLevelBtn.style.display = 'block';
    return;
  }

  // それ以外は次のレベルへ
  if (currentLevelIndex < LEVEL_NAMES.length - 1) {
    const nextLevelName = LEVEL_NAMES[currentLevelIndex + 1];
    nextLevelBtn.textContent = `${nextLevelName}へすすむ`;
    nextLevelBtn.style.display = 'block';
  } else {
    nextLevelBtn.style.display = 'none';
  }
}

// ========================================
// クイズ問題読み込み共通処理
// ========================================

/**
 * クイズ問題を読み込む（共通API呼び出し）
 * @param {string} genreName - ジャンル名
 * @param {string} currentLevel - 現在のレベル（初級/中級/上級/超級）
 * @returns {Promise<Array>} 問題配列
 */
async function loadQuestionsCommon(genreName, currentLevel) {
  markPerformance('loadStart');

  const userId = getBrowserId();

  let questions;
  // 超級モードの判定
  if (currentLevel === '超級') {
    questions = await quizAPI.getUltraModeQuestions(genreName, userId);
  } else {
    questions = await quizAPI.getQuestions(genreName, currentLevel, userId);
  }

  markPerformance('loadEnd');
  measurePerformance('loadStart', 'loadEnd');

  return questions;
}

/**
 * 合格証を生成する（共通処理）
 * @param {number} genreNumber - ジャンル番号
 * @param {string} genreName - ジャンル名
 * @param {Object} quizResult - クイズ結果オブジェクト
 */
async function generateCertificateCommon(genreNumber, genreName, quizResult) {
  showScreen('loading');

  const nickname = getNickname();
  const today = new Date();
  const dateStr = formatDate(today);

  // レベル番号を取得
  let levelNumber;
  if (quizResult.level === '超級') {
    levelNumber = 4;
  } else {
    levelNumber = LEVEL_NAMES.indexOf(quizResult.level) + 1;
  }

  const mapKey = `${genreNumber}-${levelNumber}`;

  // 背景画像URLを取得
  const bgImageUrl = CERTIFICATE_BG_IMAGE_MAP[mapKey] || CERTIFICATE_BG_IMAGE_MAP['1-1'];

  // キャプチャ用エリアに設定
  document.getElementById('captureImage').src = bgImageUrl;
  document.getElementById('captureText').innerHTML = `
    <div style="font-size: 36px; font-weight: bold; margin-bottom: 20px;">
      合格証明書
    </div>
    <div style="font-size: 24px; margin-bottom: 30px;">
      ${nickname}
    </div>
    <div style="font-size: 18px; line-height: 1.8;">
      上記の者は<br>
      ${genreName} ${quizResult.level}<br>
      に合格したことを証明します
    </div>
    <div style="font-size: 16px; margin-top: 40px;">
      ${dateStr}
    </div>
  `;

  // 画像読み込み待機
  const img = document.getElementById('captureImage');
  img.onload = async function() {
    try {
      // html2canvasで画像化
      const captureArea = document.getElementById('captureArea');
      const canvas = await html2canvas(captureArea, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        scale: 2,
        width: 800,
        height: 565
      });

      const imageData = canvas.toDataURL('image/webp', 0.8);
      setCertificateImageData(imageData);

      // 合格証を表示
      document.getElementById('certificateDisplayImage').src = imageData;

      // メタデータを保存
      saveCertificateMetadata(`cert_${mapKey}`, nickname, dateStr);

      showScreen('certificateScreen');

    } catch (error) {
      console.error('html2canvas エラー:', error);
      alert('合格証の生成に失敗しました。');
      showScreen('certificateScreen');
    }
  };

  img.onerror = function() {
    console.error('画像読み込みエラー:', bgImageUrl);
    alert('合格証背景画像の読み込みに失敗しました。');
    showScreen('certificateScreen');
  };
}
