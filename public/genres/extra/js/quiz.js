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
    return;
  }

  const q = questions[currentQuestionIndex];
  const isMultiple = q.selectionType === 'multiple';
  const isInput = q.selectionType === 'input';
  const isImage = q.displayType === 'image';

  // 問題番号表示
  const questionNumberHeader = document.getElementById('questionNumberHeader');
  questionNumberHeader.textContent = `${currentLevel}問題 ${currentQuestionIndex + 1} / ${questions.length}`;

  // 複数選択の注意書き
  const multipleInstruction = document.getElementById('multipleInstruction');
  if (isMultiple) {
    multipleInstruction.style.display = 'block';
  } else {
    multipleInstruction.style.display = 'none';
  }

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
          // 単一選択
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
        }

        updateSubmitButton();
      };

      choicesDiv.appendChild(btn);
    });
  }

  // ナビゲーションボタンの状態更新
  updateNavigationButtons();

  // 回答状況インジケーター更新
  updateProgressIndicator();

  // 採点ボタンの状態更新
  updateSubmitButton();
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

  prevBtn.disabled = currentQuestionIndex === 0;
  nextBtn.disabled = currentQuestionIndex === questions.length - 1;
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
    const result = await quizAPI.judgeAnswers(
      GENRE_NAME,
      currentLevel,
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
