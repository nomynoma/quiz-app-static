// ========================================
// クイズアプリ - 設定ファイル
// ========================================
// このファイルを編集するだけで、全てのURL設定を変更できます

// ========================================
// 基本設定
// ========================================

// Google Apps Script デプロイURL
// GASで「ウェブアプリとして導入」で取得したURLをここに設定
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwgTpNo5BEB7Y-ys6OcQVCHXw5Cuxyl_uGd2FQUH0w7ic0-u7-d6tH_shg7xOm9VNQ/exec';

// ホスティングのベースURL（末尾にスラッシュ不要）
// GitHub PagesやNetlifyなどの静的ホスティングURL
const HOSTING_BASE_URL = 'https://your-username.github.io/quiz-app';

// ========================================
// ジャンル設定
// ========================================
// ⚠️ 重要：この配列の値は、Googleスプレッドシートのシート名と完全に一致させる必要があります！

const GENRE_NAMES = [
  'ジャンル1',
  'ジャンル2',
  'ジャンル3',
  'ジャンル4',
  'ジャンル5',
  'ジャンル6'
];

// レベル名の配列
const LEVEL_NAMES = ['初級', '中級', '上級'];

// ========================================
// 画像URL設定
// ========================================

// 共通画像
const IMAGE_URLS = {
  // Favicon
  favicon: HOSTING_BASE_URL + '/imgs/favicon.svg',

  // OGP画像
  ogpImage: HOSTING_BASE_URL + '/imgs/ogp-image.png'
};

// 合格証明書背景画像URLマッピング
// Key: "ジャンル番号-級番号" (例: "1-1"は ジャンル1の初級, "1-4"は ジャンル1の超級)
const CERTIFICATE_BG_IMAGE_MAP = {
  // ジャンル1
  '1-1': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_1-1.jpg',
  '1-2': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_1-2.jpg',
  '1-3': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_1-3.jpg',
  '1-4': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_1-3.jpg', // 超級
  // ジャンル2
  '2-1': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_2-1.jpg',
  '2-2': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_2-2.jpg',
  '2-3': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_2-3.jpg',
  '2-4': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_2-3.jpg', // 超級
  // ジャンル3
  '3-1': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_3-1.jpg',
  '3-2': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_3-2.jpg',
  '3-3': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_3-3.jpg',
  '3-4': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_3-3.jpg', // 超級
  // ジャンル4
  '4-1': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_4-1.jpg',
  '4-2': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_4-2.jpg',
  '4-3': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_4-3.jpg',
  '4-4': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_4-3.jpg', // 超級
  // ジャンル5
  '5-1': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_5-1.jpg',
  '5-2': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_5-2.jpg',
  '5-3': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_5-3.jpg',
  '5-4': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_5-3.jpg', // 超級
  // ジャンル6
  '6-1': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_6-1.jpg',
  '6-2': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_6-2.jpg',
  '6-3': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_6-3.jpg',
  '6-4': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_6-3.jpg', // 超級

  // 全ジャンル（エクストラステージ）
  'ALL': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_6-3.jpg'
};

// ========================================
// ローカルストレージキー
// ========================================
const STORAGE_KEYS = {
  NICKNAME: 'quiz_nickname',
  CERTIFICATES: 'quiz_certificates',
  BROWSER_ID: 'quiz_browser_id'
};

// ========================================
// ユーティリティ関数
// ========================================

// ジャンル名からジャンル番号を取得
function getGenreNumber(genreName) {
  const index = GENRE_NAMES.indexOf(genreName);
  return index >= 0 ? (index + 1).toString() : '1';
}

// レベル名からレベル番号を取得
function getLevelNumber(levelName) {
  const index = LEVEL_NAMES.indexOf(levelName);
  return index >= 0 ? (index + 1).toString() : '1';
}

// 合格証の背景画像URLを取得
function getCertificateBgImageUrl(genreName, levelName) {
  const genreNum = getGenreNumber(genreName);
  const levelNum = getLevelNumber(levelName);
  const key = `${genreNum}-${levelNum}`;
  return CERTIFICATE_BG_IMAGE_MAP[key] || CERTIFICATE_BG_IMAGE_MAP['1-1'];
}
