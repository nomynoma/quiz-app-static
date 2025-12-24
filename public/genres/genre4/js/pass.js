// ========================================
// ジャンル4 - 合格画面
// ========================================

const GENRE_NUMBER = 4; // ★ジャンルごとに変更★
const GENRE_NAME = 'ジャンル4'; // ★ジャンルごとに変更★

let quizResult = null;
let certificateImageData = null;

// ========================================
// 初期化
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  // クイズ結果を取得
  const resultStr = sessionStorage.getItem('quizResult');

  if (!resultStr) {
    alert('クイズ結果が見つかりません。');
    window.location.href = '../../genre-select.html';
    return;
  }

  quizResult = JSON.parse(resultStr);

  // 結果を表示
  displayResult();

  // 合格証を生成
  generateCertificate();
});

// ========================================
// 結果表示
// ========================================
function displayResult() {
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
  updateNextLevelButton();
}

// ========================================
// 次のレベルボタンの表示判定
// ========================================
function updateNextLevelButton() {
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
// 合格証生成
// ========================================
async function generateCertificate() {
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

  const mapKey = `${GENRE_NUMBER}-${levelNumber}`;

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
      ${GENRE_NAME} ${quizResult.level}<br>
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

      certificateImageData = canvas.toDataURL('image/webp', 0.8);

      // 合格証を表示
      document.getElementById('certificateDisplayImage').src = certificateImageData;

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

// ========================================
// 合格証をダウンロード
// ========================================
function downloadCertificate() {
  if (!certificateImageData) {
    alert('合格証画像が生成されていません。');
    return;
  }

  const nickname = getNickname();
  const fileName = `合格証_${nickname}_${GENRE_NAME}_${quizResult.level}.webp`;

  const link = document.createElement('a');
  link.href = certificateImageData;
  link.download = fileName;
  link.click();
}

// ========================================
// 合格証を別窓で開く
// ========================================
function openCertificateInNewTab() {
  if (!certificateImageData) {
    alert('合格証画像が生成されていません。');
    return;
  }

  window.open(certificateImageData, '_blank');
}

// ========================================
// X共有
// ========================================
function shareToX() {
  const levelText = quizResult.level === '超級' ? '超級全問正解' : `${quizResult.level}合格`;
  const text = `クイズアプリで${GENRE_NAME}の${levelText}しました！君も挑戦してみよう！`;
  const url = getAppBaseUrl();
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

  window.open(twitterUrl, '_blank', 'width=550,height=420');
}

// ========================================
// 次のレベルへ
// ========================================
function nextLevel() {
  const currentLevelIndex = LEVEL_NAMES.indexOf(quizResult.level);

  let nextLevelName;
  if (currentLevelIndex === 2) {
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

// ========================================
// ジャンル選択へ戻る
// ========================================
function backToGenreSelection() {
  // sessionStorageをクリア
  sessionStorage.removeItem('quizResult');
  window.location.href = '../../genre-select.html';
}

// ========================================
// 画面切替
// ========================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
