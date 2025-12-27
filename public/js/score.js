// ========================================
// ランキング画面
// ========================================

let currentTab = 'hallOfFame'; // 現在のタブ

// ========================================
// 初期化
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  // ニックネームチェック
  const nickname = getNickname();
  if (!nickname) {
    alert('ニックネームが設定されていません。');
    backToGenreSelection();
    return;
  }

  // ニックネーム表示
  document.getElementById('nicknameText').textContent = nickname;

  // 初期データを読み込み
  loadRankingData();
});

// ========================================
// ランキングデータ読み込み
// ========================================
async function loadRankingData() {
  showScreen('loading');

  try {
    // 殿堂入りデータを読み込み
    await loadHallOfFame();

    // TOP10挑戦者データを読み込み
    await loadTopChallengers();

    showScreen('rankingScreen');

  } catch (error) {
    console.error('ランキング読み込みエラー:', error);
    alert('ランキングの読み込みに失敗しました: ' + error.message);
    backToGenreSelection();
  }
}

// ========================================
// 殿堂入り読み込み
// ========================================
async function loadHallOfFame() {
  try {
    const result = await quizAPI.getHallOfFame();
    console.log('殿堂入りデータ:', result);

    const hallOfFameList = document.getElementById('hallOfFameList');
    hallOfFameList.innerHTML = '';

    if (!result.hallOfFame || result.hallOfFame.length === 0) {
      hallOfFameList.innerHTML = '<p class="no-data-text">まだ殿堂入りした挑戦者はいません。</p>';
      return;
    }

    result.hallOfFame.forEach((entry, index) => {
      const item = document.createElement('div');
      item.className = 'ranking-item';

      // 順位表示（メダルまたは数字）
      let rankText = '';
      if (index === 0) rankText = '🥇';
      else if (index === 1) rankText = '🥈';
      else if (index === 2) rankText = '🥉';
      else rankText = `${index + 1}位`;

      // 時間表示（ミリ秒を日本語形式に変換）
      let timeText = '';
      if (entry.time) {
        const totalSeconds = Math.floor(entry.time / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) timeText += `${hours}時間`;
        if (minutes > 0 || hours > 0) timeText += `${minutes}分`;
        timeText += `${seconds}秒`;
      }

      item.innerHTML = `
        <div class="ranking-rank">${rankText}</div>
        <div class="ranking-info">
          <div class="ranking-nickname">${entry.nickname}</div>
          ${timeText ? `<div class="ranking-time">クリアタイム: ${timeText}</div>` : ''}
          <div class="ranking-date">${entry.completionDate || '日付不明'}</div>
        </div>
      `;

      hallOfFameList.appendChild(item);
    });

  } catch (error) {
    console.error('殿堂入り読み込みエラー:', error);
    document.getElementById('hallOfFameList').innerHTML = '<p class="error-text">データの読み込みに失敗しました。</p>';
  }
}

// ========================================
// TOP10挑戦者読み込み（エクストラステージ専用）
// ========================================
async function loadTopChallengers() {
  try {
    // エクストラステージ固定
    const result = await quizAPI.getTopChallengers('エクストラステージ', '');
    console.log('TOP10挑戦者データ:', result);

    const topChallengersList = document.getElementById('topChallengersList');
    topChallengersList.innerHTML = '';

    if (!result.topChallengers || result.topChallengers.length === 0) {
      topChallengersList.innerHTML = '<p class="no-data-text">まだランキングデータがありません。</p>';
      return;
    }

    result.topChallengers.forEach((entry, index) => {
      const item = document.createElement('div');
      item.className = 'ranking-item';

      // 順位表示（メダルまたは数字）
      let rankText = '';
      if (index === 0) rankText = '🥇';
      else if (index === 1) rankText = '🥈';
      else if (index === 2) rankText = '🥉';
      else rankText = `${index + 1}位`;

      // 時間をフォーマット
      const timeStr = formatTime(entry.clearTime);

      item.innerHTML = `
        <div class="ranking-rank">${rankText}</div>
        <div class="ranking-info">
          <div class="ranking-nickname">${entry.nickname}</div>
          <div class="ranking-time">${entry.score}問正解（${timeStr}）</div>
          <div class="ranking-date">${entry.date || '日付不明'}</div>
        </div>
      `;

      topChallengersList.appendChild(item);
    });

  } catch (error) {
    console.error('TOP10挑戦者読み込みエラー:', error);
    document.getElementById('topChallengersList').innerHTML = '<p class="error-text">データの読み込みに失敗しました。</p>';
  }
}

// ========================================
// 時間フォーマット（ミリ秒まで表示）
// ========================================
function formatTime(seconds) {
  if (!seconds || seconds <= 0) {
    return '---';
  }

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  if (minutes > 0) {
    return `${minutes}分${secs}.${ms.toString().padStart(3, '0')}秒`;
  } else {
    return `${secs}.${ms.toString().padStart(3, '0')}秒`;
  }
}

// ========================================
// タブ切替
// ========================================
function showTab(tabName) {
  currentTab = tabName;

  // タブボタンのアクティブ状態を切り替え
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => btn.classList.remove('active'));

  if (tabName === 'hallOfFame') {
    tabBtns[0].classList.add('active');
    document.getElementById('hallOfFameTab').classList.add('active');
    document.getElementById('topChallengersTab').classList.remove('active');
  } else {
    tabBtns[1].classList.add('active');
    document.getElementById('hallOfFameTab').classList.remove('active');
    document.getElementById('topChallengersTab').classList.add('active');
  }
}

// ========================================
// ジャンル選択へ戻る
// ========================================
function backToGenreSelection() {
  window.location.href = 'genre-select.html';
}

// ========================================
// 画面切替
// ========================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
