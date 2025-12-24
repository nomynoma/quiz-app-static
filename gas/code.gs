// ========================================
// クイズアプリ - 完全API化版 GAS
// ========================================

// ========================================
// グローバル定数
// ========================================
var GENRES = ['ジャンル1', 'ジャンル2', 'ジャンル3', 'ジャンル4', 'ジャンル5', 'ジャンル6'];
var LEVELS = ['初級', '中級', '上級'];
var RATE_LIMIT_WINDOW = 60;
var RATE_LIMIT_MAX_REQUESTS = 20;

// ========================================
// doGet - HTTPリクエストのルーティング
// ========================================
function doGet(e) {
  var path = e.parameter.path || 'ping';

  try {
    switch (path) {
      case 'ping':
        return jsonResponse({ status: 'ok', message: 'Quiz API is running' });

      case 'config':
        return jsonResponse(getConfig());

      default:
        return jsonResponse({ error: 'Unknown path' }, 404);
    }
  } catch (error) {
    Logger.log('doGet エラー: ' + error);
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ========================================
// doPost - POST APIのルーティング
// ========================================
function doPost(e) {
  var startTime = new Date().getTime();

  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    Logger.log('doPost action: ' + action);

    var result;
    switch (action) {
      case 'getQuestions':
        result = getQuestions(payload.genre, payload.level, payload.userId);
        break;

      case 'judgeAnswers':
        result = judgeAllAnswers(payload);
        break;

      case 'getUltraModeQuestions':
        result = getUltraModeQuestions(payload.genre, payload.userId);
        break;

      case 'getExtraModeQuestions':
        result = getAllQuestionsForExtraMode(payload.userId);
        break;

      case 'saveScore':
        result = saveScore(payload);
        break;

      case 'getTopScores':
        result = getTopScores(payload);
        break;

      default:
        return jsonResponse({ error: 'Unknown action: ' + action }, 400);
    }

    var endTime = new Date().getTime();
    var executionTime = endTime - startTime;

    Logger.log('実行時間: ' + executionTime + 'ms');

    // パフォーマンス情報を追加（デバッグ用）
    result._meta = {
      executionTime: executionTime,
      timestamp: new Date().toISOString()
    };

    return jsonResponse(result);

  } catch (error) {
    Logger.log('doPost エラー: ' + error);
    return jsonResponse({ error: error.toString() }, 500);
  }
}

// ========================================
// JSON レスポンスヘルパー
// ========================================
function jsonResponse(data, statusCode) {
  statusCode = statusCode || 200;

  var output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);

  return output;
}

// ========================================
// API: getConfig - アプリ設定を取得
// ========================================
function getConfig() {
  return {
    genres: GENRES,
    levels: LEVELS,
    deploymentUrl: ScriptApp.getService().getUrl()
  };
}

// ========================================
// API: getQuestions - 問題取得
// ========================================
function getQuestions(genre, level, userId) {
  if (userId && !checkRateLimit(userId)) {
    throw new Error('しばらく待ってから再度お試しください');
  }

  var cache = CacheService.getScriptCache();
  var cacheKey = 'q_' + genre + '_' + level;
  var cached = cache.get(cacheKey);

  if (!cached) {
    reloadSingleCache(genre, level);
    cached = cache.get(cacheKey);
    if (!cached) {
      throw new Error('キャッシュの生成に失敗しました: ' + cacheKey);
    }
  }

  var questions = JSON.parse(cached);

  // 問題順をシャッフル
  questions = shuffleArray(questions);

  // 必要数に制限（10問）
  var LIMIT = 10;
  if (questions.length > LIMIT) {
    questions = questions.slice(0, LIMIT);
  }

  // 各問題の選択肢をシャッフル
  for (var i = 0; i < questions.length; i++) {
    var q = questions[i];
    if (q.selectionType !== 'input') {
      var choices = [q.choiceA || '', q.choiceB || '', q.choiceC || '', q.choiceD || ''];
      var validChoices = choices.filter(function(c) { return c; });
      validChoices = shuffleArray(validChoices);

      q.choiceA = validChoices[0] || '';
      q.choiceB = validChoices[1] || '';
      q.choiceC = validChoices[2] || '';
      q.choiceD = validChoices[3] || '';
    }
  }

  return questions;
}

// ========================================
// API: judgeAllAnswers - 一括採点
// ========================================
function judgeAllAnswers(payload) {
  Logger.log('judgeAllAnswers payload: %s', JSON.stringify(payload));

  if (payload.userId && !checkRateLimit(payload.userId)) {
    throw new Error('しばらく待ってから再度お試しください');
  }

  var cache = CacheService.getScriptCache();
  var answerCacheKey = 'a_' + payload.genre + '_' + payload.level;
  var answerMap = JSON.parse(cache.get(answerCacheKey) || '{}');

  if (Object.keys(answerMap).length === 0) {
    throw new Error('正解データが見つかりません: ' + answerCacheKey);
  }

  var hintCacheKey = 'h_' + payload.genre + '_' + payload.level;
  var hintMap = {};

  try {
    var cachedHints = cache.get(hintCacheKey);
    if (cachedHints) {
      hintMap = JSON.parse(cachedHints);
    }
  } catch (e) {
    Logger.log('ヒント情報の取得に失敗: ' + e);
  }

  var results = [];
  var wrongAnswers = [];

  for (var i = 0; i < payload.answers.length; i++) {
    var userAnswer = payload.answers[i];
    var correctAnswer = answerMap[userAnswer.questionId];

    if (correctAnswer === undefined) {
      Logger.log('警告: 問題ID ' + userAnswer.questionId + ' の正解が見つかりません');
      results.push(false);
      continue;
    }

    var isCorrect = checkAnswer(userAnswer.answer, correctAnswer);
    results.push(isCorrect);

    if (!isCorrect) {
      var hintData = hintMap[userAnswer.questionId] || {};
      wrongAnswers.push({
        questionNumber: i + 1,
        question: hintData.question || '',
        userAnswer: formatUserAnswer(userAnswer.answer),
        hintText: hintData.hintText || '',
        hintUrl: hintData.hintUrl || ''
      });
    }
  }

  return {
    results: results,
    wrongAnswers: wrongAnswers
  };
}

// ========================================
// API: getUltraModeQuestions - 超級モード問題取得
// ========================================
function getUltraModeQuestions(genre, userId) {
  if (userId && !checkRateLimit(userId)) {
    throw new Error('しばらく待ってから再度お試しください');
  }

  var cache = CacheService.getScriptCache();
  var allQuestions = [];

  for (var i = 0; i < LEVELS.length; i++) {
    var level = LEVELS[i];
    var cacheKey = 'q_' + genre + '_' + level;
    var answerCacheKey = 'a_' + genre + '_' + level;

    var cached = cache.get(cacheKey);
    var answerCached = cache.get(answerCacheKey);

    if (!cached || !answerCached) {
      reloadSingleCache(genre, level);
      cached = cache.get(cacheKey);
      answerCached = cache.get(answerCacheKey);
    }

    var questions = JSON.parse(cached);
    var answerMap = JSON.parse(answerCached);

    for (var j = 0; j < questions.length; j++) {
      var q = questions[j];
      var correctAnswer = answerMap[q.id];

      if (correctAnswer !== undefined) {
        q.correctHash = generateAnswerHash(correctAnswer);
      }

      if (q.selectionType !== 'input') {
        var choices = [q.choiceA || '', q.choiceB || '', q.choiceC || '', q.choiceD || ''];
        var validChoices = choices.filter(function(c) { return c; });
        validChoices = shuffleArray(validChoices);

        q.choiceA = validChoices[0] || '';
        q.choiceB = validChoices[1] || '';
        q.choiceC = validChoices[2] || '';
        q.choiceD = validChoices[3] || '';
      }

      allQuestions.push(q);
    }
  }

  allQuestions = shuffleArray(allQuestions);
  return allQuestions;
}

// ========================================
// API: getAllQuestionsForExtraMode - エクストラモード問題取得
// ========================================
function getAllQuestionsForExtraMode(userId) {
  if (userId && !checkRateLimit(userId)) {
    throw new Error('しばらく待ってから再度お試しください');
  }

  var cache = CacheService.getScriptCache();
  var allQuestions = [];

  for (var g = 0; g < GENRES.length; g++) {
    var genre = GENRES[g];

    for (var i = 0; i < LEVELS.length; i++) {
      var level = LEVELS[i];
      var cacheKey = 'q_' + genre + '_' + level;
      var answerCacheKey = 'a_' + genre + '_' + level;

      var cached = cache.get(cacheKey);
      var answerCached = cache.get(answerCacheKey);

      if (!cached || !answerCached) {
        Logger.log('エクストラモード: キャッシュが見つかりません: ' + cacheKey);
        continue;
      }

      var questions = JSON.parse(cached);
      var answerMap = JSON.parse(answerCached);

      for (var j = 0; j < questions.length; j++) {
        var q = questions[j];
        var correctAnswer = answerMap[q.id];

        if (correctAnswer !== undefined) {
          q.correctHash = generateAnswerHash(correctAnswer);
        }

        if (q.selectionType !== 'input') {
          var choices = [q.choiceA || '', q.choiceB || '', q.choiceC || '', q.choiceD || ''];
          var validChoices = choices.filter(function(c) { return c; });
          validChoices = shuffleArray(validChoices);

          q.choiceA = validChoices[0] || '';
          q.choiceB = validChoices[1] || '';
          q.choiceC = validChoices[2] || '';
          q.choiceD = validChoices[3] || '';
        }

        allQuestions.push(q);
      }
    }
  }

  allQuestions = shuffleArray(allQuestions);
  return allQuestions;
}

// ========================================
// API: saveScore - スコア保存
// ========================================
function saveScore(payload) {
  try {
    var browserId = payload.browserId;
    var nickname = payload.nickname;
    var score = payload.score;
    var totalQuestions = payload.totalQuestions;
    var genre = payload.genre || 'エクストラステージ';

    if (!browserId || !nickname || score === undefined || totalQuestions === undefined) {
      return { success: false, error: '必須パラメータが不足しています' };
    }

    var isPerfectScore = (score === totalQuestions);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = 'スコアランキング';
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['browserId', 'nickname', 'score', 'timestamp', 'genre', 'isPerfect']);
      sheet.getRange('A1:F1').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === browserId && data[i][4] === genre) {
        rowIndex = i + 1;
        break;
      }
    }

    var timestamp = new Date();

    if (rowIndex > 0) {
      var existingScore = data[rowIndex - 1][2];
      if (score > existingScore) {
        sheet.getRange(rowIndex, 2).setValue(nickname);
        sheet.getRange(rowIndex, 3).setValue(score);
        sheet.getRange(rowIndex, 4).setValue(timestamp);
        sheet.getRange(rowIndex, 6).setValue(isPerfectScore);
      }
    } else {
      sheet.appendRow([browserId, nickname, score, timestamp, genre, isPerfectScore]);
    }

    var rankingData = getTopScores({ genre: genre, limit: 100, browserId: browserId });
    var rank = -1;
    var isHallOfFame = isPerfectScore;

    if (!isPerfectScore) {
      for (var i = 0; i < rankingData.rankings.length; i++) {
        if (rankingData.rankings[i].browserId === browserId) {
          rank = i + 1;
          break;
        }
      }
    }

    return {
      success: true,
      rank: rank,
      isHallOfFame: isHallOfFame,
      message: 'スコアを保存しました'
    };

  } catch (error) {
    Logger.log('saveScore エラー: ' + error);
    return { success: false, error: error.toString() };
  }
}

// ========================================
// API: getTopScores - ランキング取得
// ========================================
function getTopScores(payload) {
  try {
    var genre = (payload && payload.genre) || 'エクストラステージ';
    var limit = (payload && payload.limit) || 10;
    var browserId = (payload && payload.browserId) || null;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('スコアランキング');

    if (!sheet) {
      return { hallOfFame: [], rankings: [] };
    }

    var data = sheet.getDataRange().getValues();
    var perfectScores = [];
    var challengerScores = [];

    for (var i = 1; i < data.length; i++) {
      if (data[i][4] === genre) {
        var scoreData = {
          browserId: data[i][0],
          nickname: data[i][1],
          score: data[i][2],
          timestamp: data[i][3],
          isPerfect: data[i][5] || false
        };

        if (scoreData.isPerfect === true) {
          perfectScores.push(scoreData);
        } else {
          challengerScores.push(scoreData);
        }
      }
    }

    perfectScores.sort(function(a, b) {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    challengerScores.sort(function(a, b) {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    var topChallengers = challengerScores.slice(0, limit);

    var hallOfFame = perfectScores.map(function(item) {
      return {
        nickname: item.nickname,
        score: item.score,
        timestamp: Utilities.formatDate(new Date(item.timestamp), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
        browserId: item.browserId,
        isCurrentUser: browserId && item.browserId === browserId
      };
    });

    var rankings = topChallengers.map(function(item, index) {
      return {
        rank: index + 1,
        nickname: item.nickname,
        score: item.score,
        timestamp: Utilities.formatDate(new Date(item.timestamp), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
        browserId: item.browserId,
        isCurrentUser: browserId && item.browserId === browserId
      };
    });

    return { hallOfFame: hallOfFame, rankings: rankings };

  } catch (error) {
    Logger.log('getTopScores エラー: ' + error);
    return { hallOfFame: [], rankings: [], error: error.toString() };
  }
}

// ========================================
// 内部関数
// ========================================

function checkRateLimit(userId) {
  try {
    if (!userId) return false;

    var cache = CacheService.getScriptCache();
    var rateLimitKey = 'rate_' + userId;
    var cachedCount = cache.get(rateLimitKey);

    if (!cachedCount) {
      cache.put(rateLimitKey, '1', RATE_LIMIT_WINDOW);
      return true;
    }

    var requestCount = parseInt(cachedCount);

    if (requestCount >= RATE_LIMIT_MAX_REQUESTS) {
      Logger.log('制御発動: ' + userId + ' (' + requestCount + '回)');
      return false;
    }

    cache.put(rateLimitKey, (requestCount + 1).toString(), RATE_LIMIT_WINDOW);
    return true;

  } catch (error) {
    Logger.log('制御エラー: ' + error);
    return true;
  }
}

function reloadSingleCache(genre, level) {
  var cache = CacheService.getScriptCache();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(genre);

  if (!sheet) {
    throw new Error('シートが見つかりません: ' + genre);
  }

  var data = sheet.getDataRange().getValues();
  var questions = [];
  var answerMap = {};
  var hintMap = {};

  for (var r = 1; r < data.length; r++) {
    if (data[r][1] !== level) continue;

    var questionId = data[r][0];

    questions.push({
      id: questionId,
      level: data[r][1],
      selectionType: (data[r][2] || 'single').toLowerCase(),
      displayType: (data[r][3] || 'text').toLowerCase(),
      question: data[r][4],
      choiceA: data[r][5],
      choiceB: data[r][6],
      choiceC: data[r][7],
      choiceD: data[r][8]
    });

    hintMap[questionId] = {
      question: data[r][4] || '',
      hintUrl: data[r][10] || '',
      hintText: data[r][11] || ''
    };

    var ans = data[r][9];
    if (!questionId || ans === '') continue;

    var selectionType = data[r][2];
    if (selectionType !== 'input') {
      var correctLabels = ans.toString().trim().toUpperCase().split(',');
      var labelToText = {
        A: data[r][5],
        B: data[r][6],
        C: data[r][7],
        D: data[r][8]
      };

      answerMap[questionId] = correctLabels
        .map(function(c) { return labelToText[c]; })
        .filter(Boolean);
    } else {
      answerMap[questionId] = ans.toString().trim().toUpperCase();
    }
  }

  cache.put('q_' + genre + '_' + level, JSON.stringify(questions), 604800);
  cache.put('a_' + genre + '_' + level, JSON.stringify(answerMap), 604800);
  cache.put('h_' + genre + '_' + level, JSON.stringify(hintMap), 604800);
}

function reloadQuestionCache() {
  var cache = CacheService.getScriptCache();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  for (var g = 0; g < GENRES.length; g++) {
    var genreName = GENRES[g];
    var sheet = ss.getSheetByName(genreName);
    if (!sheet) continue;

    var data = sheet.getDataRange().getValues();

    for (var l = 0; l < LEVELS.length; l++) {
      var level = LEVELS[l];
      var questions = [];
      var answerMap = {};
      var hintMap = {};

      for (var r = 1; r < data.length; r++) {
        if (data[r][1] !== level) continue;

        var questionId = data[r][0];

        questions.push({
          id: questionId,
          level: data[r][1],
          selectionType: (data[r][2] || 'single').toLowerCase(),
          displayType: (data[r][3] || 'text').toLowerCase(),
          question: data[r][4],
          choiceA: data[r][5],
          choiceB: data[r][6],
          choiceC: data[r][7],
          choiceD: data[r][8]
        });

        hintMap[questionId] = {
          question: data[r][4] || '',
          hintUrl: data[r][10] || '',
          hintText: data[r][11] || ''
        };

        var ans = data[r][9];
        if (!questionId || ans === '') continue;

        var selectionType = data[r][2];
        if (selectionType !== 'input') {
          var correctLabels = ans.toString().trim().toUpperCase().split(',');
          var labelToText = {
            A: data[r][5],
            B: data[r][6],
            C: data[r][7],
            D: data[r][8]
          };

          answerMap[questionId] = correctLabels
            .map(function(c) { return labelToText[c]; })
            .filter(Boolean);
        } else {
          answerMap[questionId] = ans.toString().trim().toUpperCase();
        }
      }

      cache.put('q_' + genreName + '_' + level, JSON.stringify(questions), 604800);
      cache.put('a_' + genreName + '_' + level, JSON.stringify(answerMap), 604800);
      cache.put('h_' + genreName + '_' + level, JSON.stringify(hintMap), 604800);
    }
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('キャッシュを再構築しました', 'キャッシュリロード完了', 5);
}

function checkAnswer(userAnswer, correctAnswer) {
  function normalize(v) {
    if (v === null || v === undefined) return '';
    return v.toString().trim().toUpperCase();
  }

  if (Array.isArray(userAnswer)) {
    if (!Array.isArray(correctAnswer)) return false;
    if (userAnswer.length !== correctAnswer.length) return false;

    var ua = userAnswer.map(normalize).sort().join(',');
    var ca = correctAnswer.map(normalize).sort().join(',');
    return ua === ca;
  } else {
    if (Array.isArray(correctAnswer)) {
      if (correctAnswer.length !== 1) return false;
      return normalize(userAnswer) === normalize(correctAnswer[0]);
    }
    return normalize(userAnswer) === normalize(correctAnswer);
  }
}

function formatUserAnswer(answer) {
  if (Array.isArray(answer)) {
    return answer.join('、');
  }
  return answer || '（未回答）';
}

function generateAnswerHash(answer) {
  var normalized;

  if (Array.isArray(answer)) {
    normalized = answer
      .map(function(a) { return a.toString().trim().toUpperCase(); })
      .sort()
      .join(',');
  } else {
    normalized = answer.toString().trim().toUpperCase();
  }

  var hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    normalized,
    Utilities.Charset.UTF_8
  );

  var hashString = hash.map(function(byte) {
    var v = (byte < 0) ? 256 + byte : byte;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');

  return hashString;
}

function shuffleArray(array) {
  var shuffled = array.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}
