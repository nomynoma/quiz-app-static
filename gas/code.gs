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
// doOptions - CORS プリフライトリクエスト対応
// ========================================
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
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

      case 'getHallOfFame':
        result = getHallOfFame();
        break;

      case 'getTopChallengers':
        result = getTopChallengers(payload.genre, payload.level);
        break;

      case 'judgeExtraAnswer':
        result = judgeExtraAnswer(payload);
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

  // エクストラステージの場合は全ジャンルの問題を統合
  if (genre === 'エクストラステージ') {
    return getExtraStageQuestions(level, cache);
  }

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
  var answerMap = {};
  var hintMap = {};

  // 超級の場合は全レベルの正解データを統合
  if (payload.level === '超級') {
    for (var i = 0; i < LEVELS.length; i++) {
      var level = LEVELS[i];
      var answerCacheKey = 'a_' + payload.genre + '_' + level;
      var levelAnswerMap = JSON.parse(cache.get(answerCacheKey) || '{}');

      // 各レベルの正解データをマージ
      for (var questionId in levelAnswerMap) {
        answerMap[questionId] = levelAnswerMap[questionId];
      }

      var hintCacheKey = 'h_' + payload.genre + '_' + level;
      var levelHintMap = JSON.parse(cache.get(hintCacheKey) || '{}');

      // 各レベルのヒントデータをマージ
      for (var questionId in levelHintMap) {
        hintMap[questionId] = levelHintMap[questionId];
      }
    }
  } else {
    // 通常レベルの場合は単一のキャッシュから取得
    var answerCacheKey = 'a_' + payload.genre + '_' + payload.level;
    answerMap = JSON.parse(cache.get(answerCacheKey) || '{}');

    var hintCacheKey = 'h_' + payload.genre + '_' + payload.level;
    try {
      var cachedHints = cache.get(hintCacheKey);
      if (cachedHints) {
        hintMap = JSON.parse(cachedHints);
      }
    } catch (e) {
      Logger.log('ヒント情報の取得に失敗: ' + e);
    }
  }

  if (Object.keys(answerMap).length === 0) {
    throw new Error('正解データが見つかりません: ' + payload.genre + ' ' + payload.level);
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
// API: judgeExtraAnswer - エクストラステージ専用採点
// ========================================
function judgeExtraAnswer(payload) {
  Logger.log('judgeExtraAnswer payload: %s', JSON.stringify(payload));

  if (payload.userId && !checkRateLimit(payload.userId)) {
    throw new Error('しばらく待ってから再度お試しください');
  }

  var cache = CacheService.getScriptCache();
  var answerMap = {};
  var hintMap = {};

  // 全ジャンル・全レベルの正解データを統合
  for (var g = 0; g < GENRES.length; g++) {
    var genre = GENRES[g];
    for (var i = 0; i < LEVELS.length; i++) {
      var level = LEVELS[i];
      var answerCacheKey = 'a_' + genre + '_' + level;
      var levelAnswerMap = JSON.parse(cache.get(answerCacheKey) || '{}');

      // 各レベルの正解データをマージ
      for (var questionId in levelAnswerMap) {
        answerMap[questionId] = levelAnswerMap[questionId];
      }

      var hintCacheKey = 'h_' + genre + '_' + level;
      var levelHintMap = JSON.parse(cache.get(hintCacheKey) || '{}');

      // 各レベルのヒントデータをマージ
      for (var questionId in levelHintMap) {
        hintMap[questionId] = levelHintMap[questionId];
      }
    }
  }

  if (Object.keys(answerMap).length === 0) {
    throw new Error('正解データが見つかりません: エクストラステージ');
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
// エクストラステージ問題取得（全ジャンル統合）
// ========================================
function getExtraStageQuestions(level, cache) {
  var allQuestions = [];
  var missingCache = false;

  // 全ジャンルの指定レベルの問題を統合
  for (var i = 0; i < GENRES.length; i++) {
    var genre = GENRES[i];
    var cacheKey = 'q_' + genre + '_' + level;
    var cached = cache.get(cacheKey);

    if (!cached) {
      missingCache = true;
      break;
    }
  }

  // キャッシュが不足している場合は全キャッシュをリロード
  if (missingCache) {
    Logger.log('エクストラステージ用のキャッシュが不足しているため、全キャッシュをリロードします');
    for (var i = 0; i < GENRES.length; i++) {
      var genre = GENRES[i];
      reloadSingleCache(genre, level);
    }
  }

  // 全ジャンルの問題を統合（正解ハッシュも追加）
  for (var i = 0; i < GENRES.length; i++) {
    var genre = GENRES[i];
    var cacheKey = 'q_' + genre + '_' + level;
    var answerCacheKey = 'a_' + genre + '_' + level;

    var cached = cache.get(cacheKey);
    var answerCached = cache.get(answerCacheKey);

    if (cached && answerCached) {
      var genreQuestions = JSON.parse(cached);
      var answerMap = JSON.parse(answerCached);

      // 各問題に正解ハッシュを追加
      for (var j = 0; j < genreQuestions.length; j++) {
        var q = genreQuestions[j];
        var correctAnswer = answerMap[q.id];

        if (correctAnswer !== undefined) {
          q.correctHash = generateAnswerHash(correctAnswer);
        }

        allQuestions.push(q);
      }
    }
  }

  if (allQuestions.length === 0) {
    throw new Error('エクストラステージの問題が見つかりません');
  }

  // 問題順をシャッフル
  allQuestions = shuffleArray(allQuestions);

  // 必要数に制限（10問）
  var LIMIT = 10;
  if (allQuestions.length > LIMIT) {
    allQuestions = allQuestions.slice(0, LIMIT);
  }

  // 各問題の選択肢をシャッフル
  for (var i = 0; i < allQuestions.length; i++) {
    var q = allQuestions[i];
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

  return allQuestions;
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
    var time = payload.time; // エクストラステージ用の経過時間（ミリ秒）

    if (!browserId || !nickname || score === undefined || totalQuestions === undefined) {
      return { success: false, error: '必須パラメータが不足しています' };
    }

    var isPerfectScore = (score === totalQuestions);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = 'スコアランキング';
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['browserId', 'nickname', 'score', 'timestamp', 'genre', 'isPerfect', 'time']);
      sheet.getRange('A1:G1').setFontWeight('bold');
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
      var existingTime = data[rowIndex - 1][6] || null;

      // エクストラステージの場合: スコアが高い、または同じスコアで時間が短い場合に更新
      var shouldUpdate = false;
      if (genre === 'エクストラステージ' && time !== undefined) {
        if (score > existingScore) {
          shouldUpdate = true;
        } else if (score === existingScore && existingTime !== null && time < existingTime) {
          shouldUpdate = true;
        }
      } else {
        // 通常のジャンル: スコアが高い場合のみ更新
        shouldUpdate = (score > existingScore);
      }

      if (shouldUpdate) {
        sheet.getRange(rowIndex, 2).setValue(nickname);
        sheet.getRange(rowIndex, 3).setValue(score);
        sheet.getRange(rowIndex, 4).setValue(timestamp);
        sheet.getRange(rowIndex, 6).setValue(isPerfectScore);
        if (time !== undefined) {
          sheet.getRange(rowIndex, 7).setValue(time);
        }
      }
    } else {
      var row = [browserId, nickname, score, timestamp, genre, isPerfectScore];
      if (time !== undefined) {
        row.push(time);
      }
      sheet.appendRow(row);
    }

    // キャッシュをクリア（スコア登録時に最新データに更新）
    clearRankingCache();

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
          isPerfect: data[i][5] || false,
          time: data[i][6] || null
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

    // エクストラステージの場合は時間も考慮してソート
    if (genre === 'エクストラステージ') {
      challengerScores.sort(function(a, b) {
        // スコアが高い方が上位
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // スコアが同じ場合は時間が短い方が上位
        if (a.time !== null && b.time !== null) {
          return a.time - b.time;
        }
        // 時間データがない場合はタイムスタンプで判定
        return new Date(a.timestamp) - new Date(b.timestamp);
      });
    } else {
      // 通常のジャンル: スコア優先、同点ならタイムスタンプ
      challengerScores.sort(function(a, b) {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return new Date(a.timestamp) - new Date(b.timestamp);
      });
    }

    var topChallengers = challengerScores.slice(0, limit);

    var hallOfFame = perfectScores.map(function(item) {
      var result = {
        nickname: item.nickname,
        score: item.score,
        timestamp: Utilities.formatDate(new Date(item.timestamp), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
        browserId: item.browserId,
        isCurrentUser: browserId && item.browserId === browserId
      };
      if (item.time !== null) {
        result.time = item.time;
      }
      return result;
    });

    var rankings = topChallengers.map(function(item, index) {
      var result = {
        rank: index + 1,
        nickname: item.nickname,
        score: item.score,
        timestamp: Utilities.formatDate(new Date(item.timestamp), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
        browserId: item.browserId,
        isCurrentUser: browserId && item.browserId === browserId
      };
      if (item.time !== null) {
        result.time = item.time;
      }
      return result;
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
  // 全ジャンル×全レベルのキャッシュを再構築
  for (var g = 0; g < GENRES.length; g++) {
    for (var l = 0; l < LEVELS.length; l++) {
      reloadSingleCache(GENRES[g], LEVELS[l]);
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

  // Base64エンコード（UTF-8対応）
  return Utilities.base64Encode(normalized, Utilities.Charset.UTF_8);
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

// ========================================
// ユーティリティ: 日付フォーマット
// ========================================
function formatDate(date) {
  if (!date) return '';

  var d = new Date(date);
  var year = d.getFullYear();
  var month = ('0' + (d.getMonth() + 1)).slice(-2);
  var day = ('0' + d.getDate()).slice(-2);
  var hours = ('0' + d.getHours()).slice(-2);
  var minutes = ('0' + d.getMinutes()).slice(-2);

  return year + '/' + month + '/' + day + ' ' + hours + ':' + minutes;
}

// ========================================
// API: getHallOfFame - 殿堂入り取得
// ========================================
function getHallOfFame() {
  try {
    var cache = CacheService.getScriptCache();
    var cacheKey = 'hallOfFame';

    // キャッシュから取得を試みる
    var cached = cache.get(cacheKey);
    if (cached) {
      Logger.log('getHallOfFame: キャッシュから取得');
      return JSON.parse(cached);
    }

    Logger.log('getHallOfFame: データベースから取得');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('スコアランキング');

    if (!sheet) {
      return { hallOfFame: [] };
    }

    var data = sheet.getDataRange().getValues();
    var hallOfFameList = [];

    // ヘッダー行をスキップ（i=1から開始）
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var browserId = row[0];
      var nickname = row[1];
      var score = row[2];
      var timestamp = row[3];
      var genre = row[4];
      var isPerfect = row[5];
      var time = row[6] || null;

      // エクストラステージで全問正解（isPerfect = true）の人だけを抽出
      if (genre === 'エクストラステージ' && isPerfect === true) {
        hallOfFameList.push({
          nickname: nickname,
          completionDate: formatDate(timestamp),
          time: time,
          timestamp: timestamp
        });
      }
    }

    // 時間が短い順にソート（時間が同じ場合はタイムスタンプの早い順）
    hallOfFameList.sort(function(a, b) {
      if (a.time !== null && b.time !== null) {
        if (a.time !== b.time) {
          return a.time - b.time;
        }
      }
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    var result = { hallOfFame: hallOfFameList };

    // キャッシュに保存（600秒 = 10分）
    cache.put(cacheKey, JSON.stringify(result), 600);

    return result;

  } catch (error) {
    Logger.log('getHallOfFame エラー: ' + error);
    return { hallOfFame: [], error: error.toString() };
  }
}

// ========================================
// API: getTopChallengers - TOP10挑戦者取得
// ========================================
// エクストラステージTOP10挑戦者取得
// ========================================
function getTopChallengers(genre, level) {
  try {
    var cache = CacheService.getScriptCache();
    var cacheKey = 'topChallengers_extra';

    // キャッシュから取得を試みる
    var cached = cache.get(cacheKey);
    if (cached) {
      Logger.log('getTopChallengers: キャッシュから取得（エクストラステージ）');
      return JSON.parse(cached);
    }

    Logger.log('getTopChallengers: データベースから取得（エクストラステージ）');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('スコアランキング');

    if (!sheet) {
      return {
        topChallengers: []
      };
    }

    var data = sheet.getDataRange().getValues();
    var challengersList = [];

    // ヘッダー行をスキップ（i=1から開始）
    // 列: A=browserId, B=nickname, C=score, D=timestamp, E=genre, F=isPerfect, G=time
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue; // 空行スキップ

      var rowGenre = row[4]; // E列: genre
      var score = row[2]; // C列: score（正解数）
      var timestamp = row[3]; // D列: timestamp
      var time = row[6] || null; // G列: time

      // エクストラステージのみ抽出（全問正解者は除く＝殿堂入りと重複しない）
      if (rowGenre === 'エクストラステージ' && time !== null) {
        challengersList.push({
          browserId: row[0],
          nickname: row[1],
          score: score, // 正解数
          clearTime: time / 1000, // ミリ秒を秒に変換
          date: formatDate(timestamp),
          timestamp: timestamp
        });
      }
    }

    // スコア（正解数）の多い順、同スコアならタイムの短い順にソート
    challengersList.sort(function(a, b) {
      if (a.score !== b.score) {
        return b.score - a.score; // スコアの降順（多い順）
      }
      if (a.clearTime !== b.clearTime) {
        return a.clearTime - b.clearTime; // タイムの昇順（短い順）
      }
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    // TOP10だけ取得
    var top10 = challengersList.slice(0, 10);

    var result = {
      topChallengers: top10
    };

    // キャッシュに保存（600秒 = 10分）
    cache.put(cacheKey, JSON.stringify(result), 600);

    return result;

  } catch (error) {
    Logger.log('getTopChallengers エラー: ' + error);
    return {
      topChallengers: [],
      error: error.toString()
    };
  }
}

// ========================================
// ユーティリティ: ランキングキャッシュをクリア
// ========================================
function clearRankingCache() {
  try {
    var cache = CacheService.getScriptCache();

    // 殿堂入りキャッシュをクリア
    cache.remove('hallOfFame');

    // TOP10挑戦者キャッシュをクリア（エクストラステージ専用）
    cache.remove('topChallengers_extra');

    Logger.log('ランキングキャッシュをクリアしました');
  } catch (error) {
    Logger.log('clearRankingCache エラー: ' + error);
  }
}
