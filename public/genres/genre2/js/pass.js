// ========================================
// ジャンル2 - 合格画面
// ========================================

const GENRE_NUMBER = 2; // ★ジャンルごとに変更★
const GENRE_NAME = 'ジャンル2'; // ★ジャンルごとに変更★

let quizResult = null;

// ========================================
// 初期化
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  // クイズ結果を取得
  const resultStr = sessionStorage.getItem('quizResult');

  console.log('sessionStorage quizResult:', resultStr);

  if (!resultStr) {
    alert('クイズ結果が見つかりません。\nquiz.htmlで合格後に「合格証を見る」ボタンを押してください。');
    window.location.href = '../../genre-select.html';
    return;
  }

  try {
    quizResult = JSON.parse(resultStr);
    console.log('Parsed quizResult:', quizResult);
  } catch (e) {
    console.error('Failed to parse quizResult:', e);
    alert('クイズ結果の読み込みに失敗しました。');
    window.location.href = '../../genre-select.html';
    return;
  }

  // 結果を表示
  displayPassResult(quizResult);

  // 合格証を生成
  generateCertificateCommon(GENRE_NUMBER, GENRE_NAME, quizResult);

  // イベントリスナーを設定
  setupPassPageEventListenersCommon(GENRE_NAME, quizResult);
});

// すべての個別関数は common.js に移動済み
