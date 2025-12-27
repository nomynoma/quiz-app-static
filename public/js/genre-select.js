// ========================================
// ジャンル選択画面 + 合格証表示
// ========================================

let currentCertificateKey = null; // 現在表示中の合格証キー

// ========================================
// 初期化
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  // ニックネームチェック
  const nickname = getNickname();
  if (!nickname) {
    alert('ニックネームが設定されていません。ニックネーム入力画面に戻ります。');
    window.location.href = 'nickname.html';
    return;
  }

  // ニックネーム表示
  document.getElementById('nicknameText').textContent = nickname;

  // ジャンルボタンを生成
  initializeGenreButtons();

  // エクストラステージボタンを生成
  initializeExtraStageButton();

  // ランキングボタンの表示判定
  checkRankingButtonVisibility();
});

// ========================================
// ジャンルボタン生成
// ========================================
function initializeGenreButtons() {
  const container = document.getElementById('genreButtons');
  container.innerHTML = '';

  GENRE_NAMES.forEach((genreName, index) => {
    const genreCard = createGenreCard(genreName, index + 1);
    container.appendChild(genreCard);
  });
}

// ========================================
// ジャンルカード作成
// ========================================
function createGenreCard(genreName, genreNumber) {
  const card = document.createElement('div');
  card.className = 'genre-card';

  const title = document.createElement('h2');
  title.className = 'genre-title';
  title.textContent = genreName;
  card.appendChild(title);

  const difficultyContainer = document.createElement('div');
  difficultyContainer.className = 'difficulty-container';

  LEVEL_NAMES.forEach((levelName, levelIndex) => {
    const difficultyWrapper = createDifficultyButton(
      genreName,
      genreNumber,
      levelName,
      levelIndex
    );
    difficultyContainer.appendChild(difficultyWrapper);
  });

  // 超級ボタンを追加（上級クリア後のみ表示）
  const ultraWrapper = createUltraButton(genreName, genreNumber);
  difficultyContainer.appendChild(ultraWrapper);

  card.appendChild(difficultyContainer);

  return card;
}

// ========================================
// 難易度ボタン作成
// ========================================
function createDifficultyButton(genreName, genreNumber, levelName, levelIndex) {
  const wrapper = document.createElement('div');
  wrapper.className = 'difficulty-wrapper';

  const isUnlocked = isDifficultyUnlocked(genreNumber, levelIndex);
  const storageKey = genreNumber + '-' + (levelIndex + 1);

  if (isUnlocked) {
    // アンロック済み：クリック可能なボタン
    const btn = document.createElement('button');
    btn.className = 'btn difficulty-btn';
    btn.textContent = levelName;
    btn.onclick = function() {
      goToQuiz(genreName, levelName);
    };
    wrapper.appendChild(btn);
  } else {
    // ロック中：無効化ボタン
    const btn = document.createElement('button');
    btn.className = 'btn difficulty-btn locked';
    btn.textContent = levelName;
    btn.disabled = true;
    wrapper.appendChild(btn);
  }

  // 合格証バッジ（メダル）
  const certificateMetadata = getCertificateMetadata('cert_' + storageKey);

  if (certificateMetadata) {
    const badgeMedal = document.createElement('span');
    badgeMedal.className = 'certificate-medal';
    badgeMedal.title = '合格証を表示';
    badgeMedal.textContent = '🏅';
    badgeMedal.onclick = function(e) {
      e.stopPropagation();
      openCertificateModal(storageKey);
    };
    wrapper.appendChild(badgeMedal);
  }

  return wrapper;
}

// ========================================
// 超級ボタン作成
// ========================================
function createUltraButton(genreName, genreNumber) {
  const wrapper = document.createElement('div');
  wrapper.className = 'difficulty-wrapper';

  const ultraStorageKey = genreNumber + '-3';
  const isUltraUnlocked = getCertificateMetadata('cert_' + ultraStorageKey) !== null;
  const ultraCertKey = genreNumber + '-4';

  if (isUltraUnlocked) {
    // アンロック済み：クリック可能なボタン
    const btn = document.createElement('button');
    btn.className = 'btn difficulty-btn ultra-btn';
    btn.textContent = '超級';
    btn.onclick = function() {
      goToQuiz(genreName, '超級');
    };
    wrapper.appendChild(btn);
  } else {
    // ロック中：無効化ボタン
    const btn = document.createElement('button');
    btn.className = 'btn difficulty-btn ultra-btn locked';
    btn.textContent = '超級';
    btn.disabled = true;
    wrapper.appendChild(btn);
  }

  // 超級の合格証バッジ
  const ultraCertMetadata = getCertificateMetadata('cert_' + ultraCertKey);

  if (ultraCertMetadata) {
    const badgeMedal = document.createElement('span');
    badgeMedal.className = 'certificate-medal';
    badgeMedal.title = '超級合格証を表示';
    badgeMedal.textContent = '🏅';
    badgeMedal.onclick = function(e) {
      e.stopPropagation();
      openCertificateModal(ultraCertKey);
    };
    wrapper.appendChild(badgeMedal);
  }

  return wrapper;
}

// ========================================
// 難易度のアンロック判定
// ========================================
function isDifficultyUnlocked(genreNumber, levelIndex) {
  // 初級は常にアンロック
  if (levelIndex === 0) {
    return true;
  }

  // 前のレベルの合格証があればアンロック
  const prevStorageKey = genreNumber + '-' + levelIndex;
  const prevCert = getCertificateMetadata('cert_' + prevStorageKey);

  return prevCert !== null;
}

// ========================================
// エクストラステージボタン生成
// ========================================
function initializeExtraStageButton() {
  // 全ジャンルの上級をクリアしているかチェック
  let allUltraUnlocked = true;

  for (let i = 1; i <= GENRE_NAMES.length; i++) {
    const ultraKey = i + '-3';
    const cert = getCertificateMetadata('cert_' + ultraKey);
    if (!cert) {
      allUltraUnlocked = false;
      break;
    }
  }

  const container = document.getElementById('extraStageButton');

  if (allUltraUnlocked) {
    container.innerHTML = '';
    container.style.display = 'block';
    container.style.marginTop = '30px';

    const extraBtn = document.createElement('button');
    extraBtn.className = 'btn btn-ranking extra-stage-btn';
    extraBtn.textContent = '🌟 エクストラステージに挑戦';
    extraBtn.onclick = function() {
      goToQuiz('エクストラステージ', 'エクストラ');
    };

    // エクストラステージの合格証バッジ
    const extraCertMetadata = getCertificateMetadata('cert_ex');
    if (extraCertMetadata) {
      const badgeWrapper = document.createElement('div');
      badgeWrapper.className = 'extra-stage-wrapper';

      const badgeMedal = document.createElement('span');
      badgeMedal.className = 'certificate-medal';
      badgeMedal.title = 'エクストラステージ合格証を表示';
      badgeMedal.textContent = '🏅';
      badgeMedal.onclick = function(e) {
        e.stopPropagation();
        openCertificateModal('ex');
      };

      badgeWrapper.appendChild(extraBtn);
      badgeWrapper.appendChild(badgeMedal);
      container.appendChild(badgeWrapper);
    } else {
      container.appendChild(extraBtn);
    }
  }
}

// ========================================
// ランキングボタンの表示判定
// ========================================
function checkRankingButtonVisibility() {
  // エクストラステージに1回でも挑戦していればランキングボタンを表示
  // （スコアが登録されている = ブラウザIDが存在する）
  const browserId = getBrowserId();
  if (browserId) {
    const rankingBtn = document.getElementById('rankingButton');
    if (rankingBtn) {
      rankingBtn.style.display = 'block';
    }
  }
}

// ========================================
// クイズ画面へ遷移
// ========================================
function goToQuiz(genre, level) {
  console.log('クイズ開始:', genre, level);

  // ジャンル名からフォルダ名を決定
  let folderName;
  if (genre === 'エクストラステージ') {
    folderName = 'extra';
  } else {
    // ジャンル1 → genre1, ジャンル2 → genre2, ...
    const genreIndex = GENRE_NAMES.indexOf(genre);
    if (genreIndex === -1) {
      console.error('不明なジャンル:', genre);
      alert('ジャンルの特定に失敗しました。');
      return;
    }
    folderName = 'genre' + (genreIndex + 1);
  }

  // URLパラメータでレベルを渡す
  const params = new URLSearchParams();
  params.set('level', level);

  window.location.href = `genres/${folderName}/quiz.html?${params.toString()}`;
}

// ========================================
// ランキング画面へ遷移
// ========================================
function goToRanking() {
  window.location.href = 'score.html';
}

// ========================================
// ニックネーム編集
// ========================================
function editNickname() {
  if (confirm('ニックネームを変更しますか？\n※既存の合格証の名前は変更されません')) {
    window.location.href = 'nickname.html?edit=true';
  }
}

// ========================================
// ローカルストレージリセット
// ========================================
function resetLocalStorage() {
  clearAllStorage();
}

// ========================================
// 合格証モーダルを開く
// ========================================
async function openCertificateModal(key) {
  const metadata = getCertificateMetadata('cert_' + key);

  if (!metadata) {
    alert('合格証が見つかりません');
    return;
  }

  currentCertificateKey = key;

  // モーダル情報を設定
  const genreNumber = key.split('-')[0];
  const levelNumber = key.split('-')[1];

  let title = '';
  let genreName = '';
  let levelName = '';

  if (key === 'ex') {
    title = 'エクストラステージ合格証';
    genreName = 'エクストラステージ';
    levelName = '';
  } else if (levelNumber === '4') {
    genreName = GENRE_NAMES[parseInt(genreNumber) - 1];
    levelName = '超級';
    title = genreName + ' ' + levelName + '合格証';
  } else {
    genreName = GENRE_NAMES[parseInt(genreNumber) - 1];
    levelName = LEVEL_NAMES[parseInt(levelNumber) - 1];
    title = genreName + ' ' + levelName + '合格証';
  }

  document.getElementById('certificateModalTitle').textContent = title;
  document.getElementById('certificateModalInfo').innerHTML = `
    <p><strong>名前:</strong> ${metadata.nickname}</p>
    <p><strong>取得日:</strong> ${metadata.date}</p>
  `;

  // モーダルを表示（画像生成中）
  document.getElementById('certificateModalImage').src = '';
  document.getElementById('certificateModal').style.display = 'flex';

  // 合格証画像を生成
  try {
    const imageData = await generateCertificateForModal(key, genreName, levelName, metadata);
    document.getElementById('certificateModalImage').src = imageData;
  } catch (error) {
    console.error('合格証生成エラー:', error);
    alert('合格証の生成に失敗しました: ' + error.message);
    closeCertificateModal();
  }
}

// ========================================
// 合格証画像を生成（モーダル用）
// ========================================
async function generateCertificateForModal(key, genreName, levelName, metadata) {
  return new Promise((resolve, reject) => {
    // 背景画像URLを取得
    let bgImageUrl;
    if (key === 'ex') {
      // エクストラステージは固定の背景画像
      bgImageUrl = CERTIFICATE_BG_IMAGE_MAP['ALL'] || CERTIFICATE_BG_IMAGE_MAP['1-1'];
    } else {
      const mapKey = key;
      bgImageUrl = CERTIFICATE_BG_IMAGE_MAP[mapKey] || CERTIFICATE_BG_IMAGE_MAP['1-1'];
    }

    // genre-select.htmlはpublic/直下にあるため、相対パスを調整
    // ../../imgs/ を imgs/ に変換
    bgImageUrl = bgImageUrl.replace('../../imgs/', 'imgs/');

    // キャプチャ用エリアに設定
    document.getElementById('captureImage').src = bgImageUrl;

    // ジャンル別のCSSクラスを決定
    let genreClass = '';
    if (key === 'ex') {
      genreClass = 'certificate-extra';
    } else {
      const genreNumber = key.split('-')[0];
      genreClass = `certificate-genre${genreNumber}`;
    }

    // captureTextエリアにジャンル別クラスを追加
    const captureTextElement = document.getElementById('captureText');
    captureTextElement.className = `certificate-text ${genreClass}`;

    // 合格証のテキスト内容
    let certificateText = '';
    if (key === 'ex') {
      certificateText = `
        <div class="certificate-title">
          合格証明書
        </div>
        <div class="certificate-name">
          ${metadata.nickname}
        </div>
        <div class="certificate-body">
          上記の者は<br>
          エクストラステージ<br>
          全問正解したことを証明します
        </div>
        <div class="certificate-date">
          ${metadata.date}
        </div>
      `;
    } else {
      certificateText = `
        <div class="certificate-title">
          合格証明書
        </div>
        <div class="certificate-name">
          ${metadata.nickname}
        </div>
        <div class="certificate-body">
          上記の者は<br>
          ${genreName} ${levelName}<br>
          に合格したことを証明します
        </div>
        <div class="certificate-date">
          ${metadata.date}
        </div>
      `;
    }

    captureTextElement.innerHTML = certificateText;

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

        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        resolve(imageData);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = function() {
      reject(new Error('背景画像の読み込みに失敗しました: ' + bgImageUrl));
    };
  });
}

// ========================================
// 合格証モーダルを閉じる
// ========================================
function closeCertificateModal() {
  document.getElementById('certificateModal').style.display = 'none';
  currentCertificateKey = null;
}

// ========================================
// 合格証をダウンロード（モーダルから）
// ========================================
function downloadCertificateFromModal() {
  if (!currentCertificateKey) return;

  const metadata = getCertificateMetadata('cert_' + currentCertificateKey);
  if (!metadata) return;

  // ジャンル名とレベル名を取得
  const genreNumber = currentCertificateKey.split('-')[0];
  const levelNumber = currentCertificateKey.split('-')[1];

  let genreName = '';
  let levelName = '';

  if (currentCertificateKey === 'ex') {
    genreName = 'エクストラステージ';
    levelName = 'エクストラ';
  } else if (levelNumber === '4') {
    genreName = GENRE_NAMES[parseInt(genreNumber) - 1];
    levelName = '超級';
  } else {
    genreName = GENRE_NAMES[parseInt(genreNumber) - 1];
    levelName = LEVEL_NAMES[parseInt(levelNumber) - 1];
  }

  const img = document.getElementById('certificateModalImage');
  const fileName = `合格証_${metadata.nickname}_${genreName}_${levelName}.jpg`;

  // 画像をダウンロード
  const link = document.createElement('a');
  link.href = img.src;
  link.download = fileName;
  link.click();
}
