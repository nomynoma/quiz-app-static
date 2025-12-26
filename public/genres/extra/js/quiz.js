// ========================================
// エクストラステージ - クイズ画面
// ========================================

// このファイルはエクストラステージ専用です

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

// タイマー関連
let timerSeconds = 10; // 1問あたりの制限時間（秒）
let currentTimer = 10; // 現在の残り時間
let timerInterval = null; // タイマーのインターバルID

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

    // エクストラステージは専用API（全ジャンル×全レベルの問題を取得）
    questions = await quizAPI.getExtraModeQuestions(userId);

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
// タイマー開始
// ========================================
function startTimer() {
  // 既存のタイマーをクリア
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // タイマーをリセット
  currentTimer = timerSeconds;

  // タイマー表示を更新
  updateTimerDisplay();

  // タイマー開始
  timerInterval = setInterval(() => {
    currentTimer--;
    updateTimerDisplay();

    if (currentTimer <= 0) {
      clearInterval(timerInterval);
      // 時間切れ - ゲームオーバー
      handleTimeOut();
    }
  }, 1000);
}

// ========================================
// タイマー表示更新
// ========================================
function updateTimerDisplay() {
  const timerEl = document.getElementById('extraTimer');
  const progressBarEl = document.getElementById('extraTimerProgressBar');

  if (timerEl) {
    timerEl.textContent = currentTimer;

    // 3秒以下で警告状態
    if (currentTimer <= 3) {
      timerEl.classList.add('warning');
      progressBarEl.classList.add('warning');
    } else {
      timerEl.classList.remove('warning');
      progressBarEl.classList.remove('warning');
    }
  }

  if (progressBarEl) {
    const percentage = (currentTimer / timerSeconds) * 100;
    progressBarEl.style.width = percentage + '%';
  }
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
// 時間切れ処理
// ========================================
function handleTimeOut() {
  // ゲームオーバー
  showGameOver(currentQuestionIndex + 1);
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

  // 進捗表示を更新
  document.getElementById('extraCurrentNum').textContent = currentQuestionIndex + 1;
  document.getElementById('extraTotalNum').textContent = questions.length;

  // タイマー開始
  startTimer();
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

    // Enterキーで回答確定
    input.addEventListener('keypress', async function(e) {
      if (e.key === 'Enter' && this.value.trim() !== '') {
        await submitInputAnswer();
      }
    });

    choicesDiv.appendChild(input);

    // 入力式用の回答ボタンを追加
    const submitInputBtn = document.createElement('button');
    submitInputBtn.className = 'btn btn-green';
    submitInputBtn.textContent = '回答する';
    submitInputBtn.id = 'submitInputBtn';
    submitInputBtn.style.marginTop = '20px';
    submitInputBtn.onclick = submitInputAnswer;

    choicesDiv.appendChild(submitInputBtn);

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

      btn.onclick = async function() {
        if (isMultiple) {
          // 複数選択
          if (selectedChoices.includes(choice)) {
            selectedChoices = selectedChoices.filter(c => c !== choice);
            btn.classList.remove('selected');
          } else {
            selectedChoices.push(choice);
            btn.classList.add('selected');
          }

          // 回答を保存（複数選択は確定ボタン待ち）
          userAnswers[currentQuestionIndex].answer = selectedChoices.length > 0 ? selectedChoices : null;
          updateSubmitButton();

        } else {
          // 単一選択 - 即座に判定
          stopTimer(); // タイマー停止

          const allBtns = choicesDiv.querySelectorAll('.choice-btn');
          allBtns.forEach(b => b.disabled = true); // 連打防止

          selectedChoices = [choice];
          btn.classList.add('selected');

          // 回答を保存
          userAnswers[currentQuestionIndex].answer = choice;

          // ハッシュで正誤判定
          const isCorrect = await checkAnswerByHash(choice, q.correctHash);

          if (isCorrect) {
            // 正解
            btn.classList.add('correct');

            // 次の問題へ進む or 全問正解
            setTimeout(() => {
              if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                showQuestion();
              } else {
                // 全問正解！
                stopTimer();
                showResult(questions.length, questions.length, []);
              }
            }, 800);

          } else {
            // 不正解 - ゲームオーバー
            btn.classList.add('incorrect');

            setTimeout(() => {
              showGameOver(currentQuestionIndex + 1);
            }, 800);
          }
        }
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

  // エクストラステージでは前後移動を無効化（1問ミスでアウト）
  prevBtn.disabled = true;
  prevBtn.style.display = 'none';
  nextBtn.disabled = true;
  nextBtn.style.display = 'none';
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

    // エクストラステージではクリック無効（順番に解く必要がある）
    // dot.onclick は設定しない

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
// 入力式回答の送信
// ========================================
async function submitInputAnswer() {
  const input = document.getElementById('answerInput');
  const submitBtn = document.getElementById('submitInputBtn');

  if (!input || !submitBtn) return;

  const userAnswer = input.value.trim();
  if (!userAnswer) {
    alert('回答を入力してください');
    return;
  }

  // タイマー停止
  stopTimer();

  // ボタンを無効化
  submitBtn.disabled = true;
  submitBtn.textContent = '判定中...';
  input.disabled = true;

  const q = questions[currentQuestionIndex];

  // ハッシュで正誤判定
  const isCorrect = await checkAnswerByHash(userAnswer, q.correctHash);

  if (isCorrect) {
    // 正解
    submitBtn.textContent = '正解！';
    submitBtn.classList.add('btn-green');

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        showQuestion();
      } else {
        // 全問正解！
        showResult(questions.length, questions.length, []);
      }
    }, 800);

  } else {
    // 不正解 - ゲームオーバー
    submitBtn.textContent = '不正解';
    submitBtn.classList.remove('btn-green');
    submitBtn.classList.add('btn-red');

    setTimeout(() => {
      showGameOver(currentQuestionIndex + 1);
    }, 800);
  }
}

// ========================================
// 複数選択の回答確定
// ========================================
async function submitAllAnswers() {
  const q = questions[currentQuestionIndex];

  if (q.selectionType !== 'multiple') {
    return;
  }

  // タイマー停止
  stopTimer();

  const submitBtn = document.getElementById('submitAllBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '判定中...';

  // 選択肢をすべて無効化
  const allBtns = document.querySelectorAll('.choice-btn');
  allBtns.forEach(b => b.disabled = true);

  // ハッシュで正誤判定
  const isCorrect = await checkAnswerByHash(selectedChoices, q.correctHash);

  if (isCorrect) {
    // 正解
    submitBtn.textContent = '正解！';

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        showQuestion();
      } else {
        // 全問正解！
        showResult(questions.length, questions.length, []);
      }
    }, 800);

  } else {
    // 不正解 - ゲームオーバー
    submitBtn.textContent = '不正解';

    setTimeout(() => {
      showGameOver(currentQuestionIndex + 1);
    }, 800);
  }
}

// ========================================
// ゲームオーバー表示
// ========================================
function showGameOver(reachedQuestion) {
  // 結果画面に切り替え
  showScreen('resultScreen');

  // ヘッダーを非表示
  document.querySelector('.progress-indicator-header').style.display = 'none';
  document.getElementById('questionNumberHeader').textContent = '';

  // 不合格表示
  document.getElementById('passResult').style.display = 'none';
  document.getElementById('failResult').style.display = 'block';

  document.getElementById('failResultText').innerHTML = `
    <div style="font-size: 48px; font-weight: bold; color: #e74c3c; margin: 20px 0;">
      問題 ${reachedQuestion} で失敗
    </div>
    <p style="font-size: 18px; color: #666;">
      エクストラステージは1問でも間違えると終了です。<br>
      もう一度挑戦してみましょう！
    </p>
  `;

  // 誤答一覧は非表示
  const wrongAnswersList = document.getElementById('wrongAnswersList');
  if (wrongAnswersList) {
    wrongAnswersList.style.display = 'none';
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
  const url = getAppBaseUrl();
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
