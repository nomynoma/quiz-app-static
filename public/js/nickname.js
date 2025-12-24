// ========================================
// ニックネーム入力画面
// ========================================

let isEditMode = false; // 編集モードかどうか

// ========================================
// 初期化
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  // URLパラメータから編集モードを判定
  const urlParams = new URLSearchParams(window.location.search);
  isEditMode = urlParams.get('edit') === 'true';

  // 編集モードの場合、既存のニックネームを表示
  if (isEditMode) {
    const currentNickname = getNickname();
    if (currentNickname) {
      document.getElementById('nicknameInput').value = currentNickname;
      document.getElementById('nicknameWarning').style.display = 'block';
      document.getElementById('cancelBtn').style.display = 'block';
    }
  }

  // Enterキーで送信
  document.getElementById('nicknameInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      submitNickname();
    }
  });

  // 入力フォーカス
  document.getElementById('nicknameInput').focus();
});

// ========================================
// ニックネーム送信
// ========================================
function submitNickname() {
  const input = document.getElementById('nicknameInput').value.trim();
  const errorDiv = document.getElementById('nicknameError');
  const submitBtn = document.getElementById('submitBtn');

  // エラーメッセージをクリア
  errorDiv.style.display = 'none';
  errorDiv.textContent = '';

  // バリデーション
  const validation = validateNickname(input);

  if (!validation.valid) {
    errorDiv.textContent = validation.message;
    errorDiv.style.display = 'block';
    return;
  }

  // ボタンを無効化
  submitBtn.disabled = true;
  submitBtn.textContent = '保存中...';

  // ニックネームを保存
  const saved = saveNickname(input);

  if (!saved) {
    errorDiv.textContent = 'ニックネームの保存に失敗しました。ブラウザの設定を確認してください。';
    errorDiv.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = '次へ';
    return;
  }

  // 成功
  console.log('ニックネーム保存成功:', input);

  // ジャンル選択画面へ遷移
  setTimeout(function() {
    if (isEditMode) {
      // 編集モードの場合は元のページに戻る
      window.location.href = 'genre-select.html';
    } else {
      // 新規登録の場合はジャンル選択へ
      window.location.href = 'genre-select.html';
    }
  }, 300);
}

// ========================================
// キャンセル（編集モード時のみ）
// ========================================
function cancel() {
  if (confirm('ニックネームの変更をキャンセルしますか？')) {
    window.location.href = 'genre-select.html';
  }
}
