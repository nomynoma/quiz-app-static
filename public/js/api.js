// ========================================
// クイズアプリ - GAS API通信ライブラリ
// ========================================

class QuizAPI {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  // ========================================
  // GET リクエスト
  // ========================================
  async get(path) {
    try {
      const url = `${this.apiUrl}?path=${encodeURIComponent(path)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API GET エラー:', error);
      throw error;
    }
  }

  // ========================================
  // POST リクエスト
  // ========================================
  async post(action, data) {
    try {
      const payload = {
        action: action,
        ...data
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // エラーレスポンスのチェック
      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error('API POST エラー:', error);
      throw error;
    }
  }

  // ========================================
  // API メソッド
  // ========================================

  // ヘルスチェック
  async ping() {
    return await this.get('ping');
  }

  // アプリ設定を取得
  async getConfig() {
    return await this.get('config');
  }

  // 問題を取得
  async getQuestions(genre, level, userId) {
    return await this.post('getQuestions', {
      genre: genre,
      level: level,
      userId: userId
    });
  }

  // 回答を判定（一括採点）
  async judgeAnswers(genre, level, answers, userId) {
    return await this.post('judgeAnswers', {
      genre: genre,
      level: level,
      answers: answers,
      userId: userId
    });
  }

  // 超級モード用の問題を取得
  async getUltraModeQuestions(genre, userId) {
    return await this.post('getUltraModeQuestions', {
      genre: genre,
      userId: userId
    });
  }

  // エクストラモード用の問題を取得
  async getExtraModeQuestions(userId) {
    return await this.post('getExtraModeQuestions', {
      userId: userId
    });
  }

  // スコアを保存
  async saveScore(browserId, nickname, score, totalQuestions, genre) {
    return await this.post('saveScore', {
      browserId: browserId,
      nickname: nickname,
      score: score,
      totalQuestions: totalQuestions,
      genre: genre
    });
  }

  // ランキングを取得
  async getTopScores(genre, limit, browserId) {
    return await this.post('getTopScores', {
      genre: genre || 'エクストラステージ',
      limit: limit || 10,
      browserId: browserId
    });
  }

  // 殿堂入りを取得
  async getHallOfFame() {
    return await this.post('getHallOfFame', {});
  }

  // TOP10挑戦者を取得
  async getTopChallengers(genre, level) {
    return await this.post('getTopChallengers', {
      genre: genre,
      level: level
    });
  }
}

// APIインスタンスを作成（グローバル）
const quizAPI = new QuizAPI(GAS_API_URL);
