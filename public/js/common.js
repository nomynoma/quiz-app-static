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
    localStorage.setItem('cert_' + key, encoded);
    return true;
  } catch (e) {
    console.error('合格証メタデータ保存エラー:', e);
    return false;
  }
}

// 合格証メタデータを取得
function getCertificateMetadata(key) {
  try {
    const encoded = localStorage.getItem('cert_' + key);
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
    const loadingText = loadingEl.querySelector('.loading');
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
