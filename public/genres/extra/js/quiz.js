// ========================================
// エクストラステージ - クイズ画面
// ========================================

// このファイルは extra 専用です
// 他のジャンルは同じファイルをコピーして使用してください

const GENRE_NUMBER = 7; // ★ジャンルごとに変更★
const GENRE_NAME = 'エクストラステージ'; // ★ジャンルごとに変更★

// ========================================
// グローバル変数
// ========================================
let currentLevel = ''; // 現在のレベル（初級/中級/上級/超級）
let questions = []; // 問題配列
let currentQuestionIndex = 0; // 現在の問題番号
let userAnswers = []; // ユーザーの回答 [{questionId, answer}, ...]
let selectedChoices = []; // 現在の問題で選択中の選択肢
let timerInterval = null; // タイマーのインターバルID
let remainingTime = 10; // 残り時間（秒）
let startTime = null; // 開始時刻

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

  // URLパラメータからレベルを取得
  const urlParams = new URLSearchParams(window.location.search);
  const level = urlParams.get('level');

  if (!level) {
    alert('レベルが指定されていません。');
    backToGenreSelection();
    return;
  }

  currentLevel = level;

  // イベントリスナーを設定
  setupQuizPageEventListenersCommon({
    backToGenreSelection: backToGenreSelection,
    previousQuestion: previousQuestion,
    nextQuestion: nextQuestion,
    submitAllAnswers: submitAllAnswers,
    goToPassPage: goToPassPage,
    shareFailToX: shareFailToX
  });

  // 問題を読み込み
  loadQuestions();
});

// ========================================
// 問題読み込み
// ========================================
async function loadQuestions() {
  showScreen('loading');

  try {
    // 共通API呼び出し
    questions = await loadQuestionsCommon(GENRE_NAME, currentLevel);

    if (!questions || questions.length === 0) {
      alert('問題の取得に失敗しました。');
      backToGenreSelection();
      return;
    }

    // ユーザー回答配列を初期化
    userAnswers = questions.map(q => ({
      questionId: q.id,
      answer: null
    }));

    currentQuestionIndex = 0;

    // 開始時刻を記録
    startTime = new Date();

    showQuestion();

  } catch (error) {
    console.error('問題読み込みエラー:', error);
    alert('問題の読み込みに失敗しました: ' + error.message);
    backToGenreSelection();
  }
}

// ========================================
// 問題表示
// ========================================
function showQuestion() {
  showScreen('questionScreen');

  if (currentQuestionIndex >= questions.length) {
    // 全問終了 → 採点
    submitAllAnswers();
    return;
  }

  const q = questions[currentQuestionIndex];
  const isMultiple = q.selectionType === 'multiple';
  const isInput = q.selectionType === 'input';
  const isImage = q.displayType === 'image';

  // 問題番号表示
  const questionNumberHeader = document.getElementById('questionNumberHeader');
  questionNumberHeader.textContent = `エクストラステージ問題 ${currentQuestionIndex + 1} / ${questions.length}`;

  // エクストラステージ専用: 進捗表示更新
  document.getElementById('extraCurrentNum').textContent = currentQuestionIndex + 1;
  document.getElementById('extraTotalNum').textContent = questions.length;

  // 複数選択の注意書き
  const multipleInstruction = document.getElementById('multipleInstruction');
  if (isMultiple) {
    multipleInstruction.style.display = 'block';
  } else {
    multipleInstruction.style.display = 'none';
  }

  // タイマーをリセットして開始
  startTimer();

  // 問題文表示
  const questionText = document.getElementById('questionText');
  const questionImage = document.getElementById('questionImage');

  if (isImage) {
    questionText.textContent = '';
    questionImage.innerHTML = `<img src="${q.question}" alt="問題画像" class="question-image">`;
    questionImage.style.display = 'block';
  } else {
    questionText.textContent = q.question;
    questionImage.style.display = 'none';
  }

  // 選択肢表示
  const choicesDiv = document.getElementById('choices');
  choicesDiv.innerHTML = '';

  if (isInput) {
    // 入力式
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-input';
    input.placeholder = '回答を入力';
    input.id = 'answerInput';

    // 既存の回答があれば復元
    const savedAnswer = userAnswers[currentQuestionIndex].answer;
    if (savedAnswer) {
      input.value = savedAnswer;
    }

    input.addEventListener('input', function() {
      userAnswers[currentQuestionIndex].answer = this.value;
      updateSubmitButton();
    });

    choicesDiv.appendChild(input);

  } else {
    // 選択式
    const choices = [q.choiceA, q.choiceB, q.choiceC, q.choiceD].filter(c => c);

    // 既存の選択を復元
    const savedAnswer = userAnswers[currentQuestionIndex].answer;
    if (savedAnswer) {
      selectedChoices = Array.isArray(savedAnswer) ? savedAnswer : [savedAnswer];
    } else {
      selectedChoices = [];
    }

    choices.forEach((choice, index) => {
      const btn = document.createElement('button');
      btn.className = 'btn choice-btn';
      btn.textContent = choice;

      // 既に選択されているかチェック
      if (selectedChoices.includes(choice)) {
        btn.classList.add('selected');
      }

      btn.onclick = function() {
        if (isMultiple) {
          // 複数選択
          if (selectedChoices.includes(choice)) {
            selectedChoices = selectedChoices.filter(c => c !== choice);
            btn.classList.remove('selected');
          } else {
            selectedChoices.push(choice);
            btn.classList.add('selected');
          }
        } else {
          // 単一選択 → エクストラステージでは正誤判定して即座に処理
          const allBtns = choicesDiv.querySelectorAll('.choice-btn');
          allBtns.forEach(b => b.classList.remove('selected'));

          selectedChoices = [choice];
          btn.classList.add('selected');
        }

        // 回答を保存
        if (isMultiple) {
          userAnswers[currentQuestionIndex].answer = selectedChoices.length > 0 ? selectedChoices : null;
        } else {
          userAnswers[currentQuestionIndex].answer = selectedChoices[0] || null;

          // エクストラステージ: 単一選択の場合は正誤を即座にチェック
          stopTimer();
          checkAnswerAndProceed(q, choice);
        }

        updateSubmitButton();
      };

      choicesDiv.appendChild(btn);
    });
  }

  // エクストラステージには前/次ボタンがないので、この呼び出しをコメントアウト
  // updateNavigationButtons();

  // エクストラステージではドットインジケーターを非表示
  const progressIndicatorHeader = document.getElementById('progressIndicatorHeader');
  if (progressIndicatorHeader) {
    progressIndicatorHeader.style.display = 'none';
  }

  // エクストラステージには採点ボタンがないので、この呼び出しをコメントアウト
  // updateSubmitButton();
}

// ========================================
// 回答チェックして次へ進む（エクストラステージ専用）
// ========================================
function checkAnswerAndProceed(question, selectedAnswer) {
  // クライアント側でBase64ハッシュ比較
  const userAnswerHash = generateAnswerHashClient(selectedAnswer);
  const isCorrect = userAnswerHash === question.correctHash;

  if (!isCorrect) {
    // 不正解 → 即座に失敗画面へ
    setTimeout(() => {
      showFailResult();
    }, 300);
  } else {
    // 正解 → 次の問題へ
    setTimeout(() => {
      currentQuestionIndex++;
      showQuestion();
    }, 300);
  }
}

// ========================================
// クライアント側で回答ハッシュを生成（Base64）
// ========================================
function generateAnswerHashClient(answer) {
  let normalized;

  if (Array.isArray(answer)) {
    normalized = answer
      .map(a => a.toString().trim().toUpperCase())
      .sort()
      .join(',');
  } else {
    normalized = answer.toString().trim().toUpperCase();
  }

  // Base64エンコード（GAS側と同じ方法）
  return btoa(unescape(encodeURIComponent(normalized)));
}

// ========================================
// タイマー開始
// ========================================
function startTimer() {
  // 既存のタイマーを停止
  stopTimer();

  // タイマーをリセット
  remainingTime = 10;
  updateTimerDisplay();

  // 1秒ごとにカウントダウン
  timerInterval = setInterval(() => {
    remainingTime--;
    updateTimerDisplay();

    if (remainingTime <= 0) {
      // 時間切れ → 即座に失敗画面へ
      stopTimer();
      showFailResult();
    }
  }, 1000);
}

// ========================================
// タイマー停止
// ========================================
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ========================================
// タイマー表示更新
// ========================================
function updateTimerDisplay() {
  const timerEl = document.getElementById('extraTimer');
  const progressBar = document.getElementById('extraTimerProgressBar');

  if (timerEl) {
    timerEl.textContent = remainingTime;
  }

  if (progressBar) {
    const percentage = (remainingTime / 10) * 100;
    progressBar.style.width = percentage + '%';
  }
}

// ========================================
// 前の問題へ
// ========================================
function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    showQuestion();
  }
}

// ========================================
// 次の問題へ
// ========================================
function nextQuestion() {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    showQuestion();
  }
}

// ========================================
// ナビゲーションボタンの状態更新
// ========================================
function updateNavigationButtons() {
  const prevBtn = document.getElementById('prevQuestionBtn');
  const nextBtn = document.getElementById('nextQuestionBtn');

  // エクストラステージには前/次ボタンがないので、nullチェック
  if (prevBtn) prevBtn.disabled = currentQuestionIndex === 0;
  if (nextBtn) nextBtn.disabled = currentQuestionIndex === questions.length - 1;
}

// ========================================
// 回答状況インジケーター更新
// ========================================
function updateProgressIndicator() {
  const progressDots = document.getElementById('progressDots');
  progressDots.innerHTML = '';

  userAnswers.forEach((ans, index) => {
    const dot = document.createElement('span');
    dot.className = 'progress-dot';

    if (ans.answer !== null && ans.answer !== '') {
      dot.classList.add('answered');
    }

    if (index === currentQuestionIndex) {
      dot.classList.add('current');
    }

    dot.onclick = function() {
      currentQuestionIndex = index;
      showQuestion();
    };

    progressDots.appendChild(dot);
  });
}

// ========================================
// 採点ボタンの状態更新
// ========================================
function updateSubmitButton() {
  const submitBtn = document.getElementById('submitAllBtn');

  // エクストラステージには採点ボタンがないので、nullチェック
  if (!submitBtn) return;

  // 全問回答済みかチェック
  const allAnswered = userAnswers.every(ans => {
    return ans.answer !== null && ans.answer !== '';
  });

  if (allAnswered) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('disabled');
  } else {
    submitBtn.disabled = true;
    submitBtn.classList.add('disabled');
  }
}

// ========================================
// 全問一括採点
// ========================================
async function submitAllAnswers() {
  const submitBtn = document.getElementById('submitAllBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '採点中...';

  try {
    markPerformance('judgeStart');

    const userId = getBrowserId();
    const result = await quizAPI.judgeExtraAnswers(
      userAnswers,
      userId
    );

    markPerformance('judgeEnd');
    measurePerformance('judgeStart', 'judgeEnd');

    // 正解数をカウント
    const correctCount = result.results.filter(r => r === true).length;
    const totalCount = result.results.length;

    console.log(`採点結果: ${correctCount}/${totalCount}問正解`);

    // 結果を表示
    showResult(correctCount, totalCount, result.wrongAnswers);

  } catch (error) {
    console.error('採点エラー:', error);
    alert('採点に失敗しました: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = '採点する';
  }
}

// ========================================
// 失敗結果を即座に表示
// ========================================
function showFailResult() {
  // 結果画面に切り替え
  showScreen('resultScreen');

  // ヘッダーを非表示
  document.getElementById('progressIndicatorHeader').style.display = 'none';
  document.getElementById('questionNumberHeader').textContent = '';

  // 不合格表示
  document.getElementById('passResult').style.display = 'none';
  document.getElementById('failResult').style.display = 'block';

  // 経過時間を計算
  const endTime = new Date();
  const elapsedMs = endTime - startTime;

  // 今回のスコア
  const currentScore = {
    correctCount: currentQuestionIndex,
    time: elapsedMs
  };

  // 自己ベストを取得
  const bestScore = getExtraBestScore();

  // 自己ベストと比較
  const isNewBest = isBetterScore(currentScore, bestScore);

  // スコア表示HTML
  let scoreHtml = `
    <div style="font-size: 48px; font-weight: bold; color: #e74c3c; margin: 20px 0;">
      ${currentQuestionIndex} / ${questions.length}
    </div>
    <p style="font-size: 18px; color: #666;">
      ${currentQuestionIndex + 1}問目で失敗しました
    </p>
    <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
      <div style="font-size: 16px; margin-bottom: 10px;">
        <strong>今回のスコア：</strong>${currentQuestionIndex}問（${formatTime(currentScore.time)}）
      </div>
  `;

  if (bestScore) {
    scoreHtml += `
      <div style="font-size: 14px; color: #666;">
        <strong>自己ベスト：</strong>${bestScore.correctCount}問（${formatTime(bestScore.time)}）
      </div>
    `;
  }

  scoreHtml += `</div>`;

  if (isNewBest) {
    scoreHtml += `
      <div style="margin: 15px 0;">
        <p style="color: #27ae60; font-weight: bold;">🎉 自己ベスト更新！</p>
        <button id="saveBestScoreBtn" class="btn" style="margin-top: 10px;">最高スコアとして登録する</button>
      </div>
    `;
  }

  document.getElementById('failResultText').innerHTML = scoreHtml;

  // 最高スコア登録ボタンのイベントリスナー
  if (isNewBest) {
    const saveBestScoreBtn = document.getElementById('saveBestScoreBtn');
    if (saveBestScoreBtn) {
      saveBestScoreBtn.onclick = async function() {
        saveBestScoreBtn.disabled = true;
        saveBestScoreBtn.textContent = '登録中...';

        // LocalStorageに保存
        saveExtraBestScore(currentScore);

        // GASにも登録
        try {
          const browserId = getBrowserId();
          const nickname = getNickname();

          // エクストラステージ用のAPI呼び出し（時間データも送信）
          const payload = {
            browserId: browserId,
            nickname: nickname,
            score: currentScore.correctCount,
            totalQuestions: questions.length,
            genre: 'エクストラステージ',
            time: currentScore.time
          };

          const result = await quizAPI.post('saveScore', payload);

          if (result.success) {
            saveBestScoreBtn.textContent = '登録しました！';
          } else {
            saveBestScoreBtn.textContent = '登録失敗';
            console.error('スコア登録エラー:', result.error);
          }
        } catch (error) {
          saveBestScoreBtn.textContent = '登録失敗';
          console.error('スコア登録エラー:', error);
        }
      };
    }
  }

  // 誤答一覧は空にする（エクストラステージは即失敗なので詳細不要）
  document.getElementById('wrongAnswersList').innerHTML = '';
}

// ========================================
// 結果表示
// ========================================
function showResult(score, total, wrongAnswers) {
  // 結果画面に切り替え
  showScreen('resultScreen');

  // ヘッダーを非表示
  document.getElementById('progressIndicatorHeader').style.display = 'none';
  document.getElementById('questionNumberHeader').textContent = '';

  if (score === total) {
    // 全問正解 → 合格証ページへ直接遷移
    // sessionStorageに結果を保存（pass.htmlで使用）
    sessionStorage.setItem('quizResult', JSON.stringify({
      genre: GENRE_NAME,
      genreNumber: GENRE_NUMBER,
      level: currentLevel,
      score: score,
      total: total,
      wrongAnswers: wrongAnswers
    }));

    // 合格証ページへ遷移
    window.location.href = 'pass.html';

  } else {
    // 不正解あり → 不合格表示
    document.getElementById('passResult').style.display = 'none';
    document.getElementById('failResult').style.display = 'block';

    document.getElementById('failResultText').innerHTML = `
      <div style="font-size: 48px; font-weight: bold; color: #e74c3c; margin: 20px 0;">
        ${score} / ${total}
      </div>
      <p style="font-size: 18px; color: #666;">
        あと ${total - score}問！
      </p>
    `;

    // 誤答一覧を表示
    displayWrongAnswers(wrongAnswers);
  }
}

// displayWrongAnswers() は common.js に移動済み

// ========================================
// 合格証ページへ遷移
// ========================================
function goToPassPage() {
  window.location.href = 'pass.html';
}

// ========================================
// X共有（不合格時）
// ========================================
function shareFailToX() {
  const failResultText = document.getElementById('failResultText');
  const scoreMatch = failResultText.textContent.match(/(\d+)\s*\/\s*(\d+)/);

  if (!scoreMatch) return;

  const score = scoreMatch[1];
  const total = scoreMatch[2];

  shareToXCommon(GENRE_NAME, currentLevel, false, score, total);
}

// retryLevel(), backToGenreSelection(), showScreen() は common.js に移動済み

// ========================================
// エクストラステージ自己ベスト管理
// ========================================

// 経過時間を日本語形式に変換（HH時間MM分SS秒）
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let result = '';
  if (hours > 0) {
    result += `${hours}時間`;
  }
  if (minutes > 0 || hours > 0) {
    result += `${minutes}分`;
  }
  result += `${seconds}秒`;

  return result;
}

// 自己ベストを取得
function getExtraBestScore() {
  try {
    const stored = localStorage.getItem('extraBestScore');
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (e) {
    console.error('自己ベスト取得エラー:', e);
    return null;
  }
}

// 自己ベストを保存
function saveExtraBestScore(score) {
  try {
    localStorage.setItem('extraBestScore', JSON.stringify(score));
    console.log('自己ベストを保存しました:', score);
  } catch (e) {
    console.error('自己ベスト保存エラー:', e);
  }
}

// スコア比較（currentがbestより良ければtrue）
function isBetterScore(current, best) {
  if (!best) return true; // 自己ベストがない場合は更新

  // 正解数が多い方が良い
  if (current.correctCount > best.correctCount) return true;
  if (current.correctCount < best.correctCount) return false;

  // 正解数が同じ場合は時間が短い方が良い
  return current.time < best.time;
}
