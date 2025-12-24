// ========================================
// ジャンル2 - クイズ画面
// ========================================

// このファイルは genre2 専用です
// 他のジャンルは同じファイルをコピーして使用してください

const GENRE_NUMBER = 2; // ★ジャンルごとに変更★
const GENRE_NAME = 'ジャンル2'; // ★ジャンルごとに変更★

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

  // 問題を読み込み
  loadQuestions();
});

// ========================================
// 問題読み込み
// ========================================
async function loadQuestions() {
  showScreen('loading');

  try {
    markPerformance('loadStart');

    const userId = getBrowserId();

    // 超級モードの判定
    if (currentLevel === '超級') {
      questions = await quizAPI.getUltraModeQuestions(GENRE_NAME, userId);
    } else {
      questions = await quizAPI.getQuestions(GENRE_NAME, currentLevel, userId);
    }

    markPerformance('loadEnd');
    measurePerformance('loadStart', 'loadEnd');

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
  document.querySelector('.progress-indicator-header').style.display = 'none';
  document.getElementById('questionNumberHeader').textContent = '';

  if (score === total) {
    // 全問正解 → 合格表示
    document.getElementById('passResult').style.display = 'block';
    document.getElementById('failResult').style.display = 'none';

    document.getElementById('passResultText').innerHTML = `
      <div style="font-size: 48px; font-weight: bold; color: #27ae60; margin: 20px 0;">
        ${score} / ${total}
      </div>
      <p style="font-size: 18px; color: #666;">
        全問正解！おめでとうございます！
      </p>
    `;

    // sessionStorageに結果を保存（pass.htmlで使用）
    sessionStorage.setItem('quizResult', JSON.stringify({
      genre: GENRE_NAME,
      genreNumber: GENRE_NUMBER,
      level: currentLevel,
      score: score,
      total: total,
      wrongAnswers: wrongAnswers
    }));

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

// ========================================
// 誤答一覧表示
// ========================================
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
    }

    html += '</div>';

    wrongItem.innerHTML = html;
    wrongAnswersList.appendChild(wrongItem);
  });
}

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
  // 現在の結果から取得
  const failResultText = document.getElementById('failResultText');
  const scoreMatch = failResultText.textContent.match(/(\d+)\s*\/\s*(\d+)/);

  if (!scoreMatch) return;

  const score = scoreMatch[1];
  const total = scoreMatch[2];

  const text = `クイズアプリで${GENRE_NAME}の${currentLevel}に挑戦したよ！${score}/${total}問正解！君も挑戦してみよう！`;
  const url = HOSTING_BASE_URL;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

  window.open(twitterUrl, '_blank', 'width=550,height=420');
}

// ========================================
// もう一度挑戦する
// ========================================
function retryLevel() {
  // ページをリロードして最初から
  window.location.reload();
}

// ========================================
// ジャンル選択画面へ戻る
// ========================================
function backToGenreSelection() {
  if (confirm('クイズを中断してジャンル選択に戻りますか？')) {
    window.location.href = '../../genre-select.html';
  }
}

// ========================================
// 画面切替
// ========================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
