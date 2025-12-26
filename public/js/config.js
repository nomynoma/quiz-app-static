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
// 画像URL設定（相対パス）
// ========================================

// 合格証明書背景画像URLマッピング
// Key: "ジャンル番号-級番号" (例: "1-1"は ジャンル1の初級, "1-4"は ジャンル1の超級)
// ※ genres/genreX/ からの相対パス
const CERTIFICATE_BG_IMAGE_MAP = {
  // ジャンル1
  '1-1': '../../imgs/frame_hyousyoujyou_1-1.jpg',
  '1-2': '../../imgs/frame_hyousyoujyou_1-2.jpg',
  '1-3': '../../imgs/frame_hyousyoujyou_1-3.jpg',
  '1-4': '../../imgs/frame_hyousyoujyou_1-3.jpg', // 超級
  // ジャンル2
  '2-1': '../../imgs/frame_hyousyoujyou_2-1.jpg',
  '2-2': '../../imgs/frame_hyousyoujyou_2-2.jpg',
  '2-3': '../../imgs/frame_hyousyoujyou_2-3.jpg',
  '2-4': '../../imgs/frame_hyousyoujyou_2-3.jpg', // 超級
  // ジャンル3
  '3-1': '../../imgs/frame_hyousyoujyou_3-1.jpg',
  '3-2': '../../imgs/frame_hyousyoujyou_3-2.jpg',
  '3-3': '../../imgs/frame_hyousyoujyou_3-3.jpg',
  '3-4': '../../imgs/frame_hyousyoujyou_3-3.jpg', // 超級
  // ジャンル4
  '4-1': '../../imgs/frame_hyousyoujyou_4-1.jpg',
  '4-2': '../../imgs/frame_hyousyoujyou_4-2.jpg',
  '4-3': '../../imgs/frame_hyousyoujyou_4-3.jpg',
  '4-4': '../../imgs/frame_hyousyoujyou_4-3.jpg', // 超級
  // ジャンル5
  '5-1': '../../imgs/frame_hyousyoujyou_5-1.jpg',
  '5-2': '../../imgs/frame_hyousyoujyou_5-2.jpg',
  '5-3': '../../imgs/frame_hyousyoujyou_5-3.jpg',
  '5-4': '../../imgs/frame_hyousyoujyou_5-3.jpg', // 超級
  // ジャンル6
  '6-1': '../../imgs/frame_hyousyoujyou_6-1.jpg',
  '6-2': '../../imgs/frame_hyousyoujyou_6-2.jpg',
  '6-3': '../../imgs/frame_hyousyoujyou_6-3.jpg',
  '6-4': '../../imgs/frame_hyousyoujyou_6-3.jpg', // 超級

  // 全ジャンル（エクストラステージ）
  'ALL': '../../imgs/frame_hyousyoujyou_6-3.jpg'
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

// アプリのトップページURLを取得
function getAppBaseUrl() {
  return window.location.origin + window.location.pathname.replace(/\/genres\/.*$/, '/');
}

// ========================================
// テスト用関数（開発時のみ使用）
// ========================================

// エクストラモードを強制出現させる
function unlockExtraStage() {
  console.log('🎮 エクストラステージを強制出現させます...');

  for (let i = 1; i <= 6; i++) {
    localStorage.setItem(`genre${i}_advanced_cleared`, 'true');
    console.log(`✅ ジャンル${i}の上級クリアフラグを設定`);
  }

  console.log('✨ エクストラステージが出現しました！');
  console.log('🔄 ページをリロードしてください');

  if (confirm('エクストラステージを出現させました。ページをリロードしますか？')) {
    location.reload();
  }
}

// エクストラモードを非表示に戻す
function lockExtraStage() {
  console.log('🔒 エクストラステージを非表示にします...');

  for (let i = 1; i <= 6; i++) {
    localStorage.removeItem(`genre${i}_advanced_cleared`);
    console.log(`❌ ジャンル${i}の上級クリアフラグを削除`);
  }

  console.log('✅ エクストラステージを非表示にしました');
  console.log('🔄 ページをリロードしてください');

  if (confirm('エクストラステージを非表示にしました。ページをリロードしますか？')) {
    location.reload();
  }
}
