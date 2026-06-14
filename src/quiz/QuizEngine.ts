/**
 * QuizEngine — C++ 答题引擎（关卡制）
 * 负责关卡加载、题目队列管理、答案验证调度、事件分发
 * 事件通过 Main.getMain().sendMessage() 广播，符合项目现有模式
 */
import Message from "../class/message";
import Main from "../core/main";
import { QuizQuestion } from "./quizBank";
import { validateCode, ValidationResult } from "./validators/index";
import {
  QuizLevel,
  QuizLevelReward,
  QuizLevelQuestion,
  quizLevels,
} from "./quizLevels";
import { EVENT_TYPE } from "../utils/enum";

/** Quiz 事件名称 */
export const QuizEvents = {
  ANSWER_CORRECT: EVENT_TYPE.QUIZ_ANSWER_CORRECT,
  ANSWER_WRONG: EVENT_TYPE.QUIZ_ANSWER_WRONG,
  SPAWN_TOWER: EVENT_TYPE.QUIZ_SPAWN_TOWER,
  UPGRADE_TOWER: EVENT_TYPE.QUIZ_UPGRADE_TOWER,
  SPAWN_SPECIAL_TOWER: EVENT_TYPE.QUIZ_SPAWN_SPECIAL_TOWER,
  UPGRADE_ALL_TOWERS: EVENT_TYPE.QUIZ_UPGRADE_ALL_TOWERS,
  GOLD_REWARD: EVENT_TYPE.QUIZ_GOLD_REWARD,
  SCORE_CHANGE: EVENT_TYPE.QUIZ_SCORE_CHANGE,
  PLACEMENT_FAILED: EVENT_TYPE.QUIZ_PLACEMENT_FAILED,
  ALL_COMPLETED: EVENT_TYPE.QUIZ_ALL_COMPLETED,
  // 新增关卡系统事件
  QUIZ_LEVEL_START: EVENT_TYPE.QUIZ_LEVEL_START,
  QUIZ_LEVEL_COMPLETE: EVENT_TYPE.QUIZ_LEVEL_COMPLETE,
  QUIZ_TOWER_EARNED: EVENT_TYPE.QUIZ_TOWER_EARNED,
  QUIZ_DEPLOY_START: EVENT_TYPE.QUIZ_DEPLOY_START,
  QUIZ_DEPLOY_TOWER: EVENT_TYPE.QUIZ_DEPLOY_TOWER,
  QUIZ_DEPLOY_CANCELLED: EVENT_TYPE.QUIZ_DEPLOY_CANCELLED,
  QUIZ_WAVE_START: EVENT_TYPE.QUIZ_WAVE_START,
  QUIZ_WAVE_ALL_COMPLETE: EVENT_TYPE.QUIZ_WAVE_ALL_COMPLETE,
} as const;

class QuizEngine extends Message {
  /** 所有关卡 */
  private allLevels: QuizLevel[];
  /** 当前关卡索引 */
  private currentLevelIndex: number;
  /** 当前关卡 */
  currentLevel: QuizLevel | null;
  /** 当前关卡内的题目列表 */
  private levelQuestions: QuizLevelQuestion[];
  /** 当前题目在 levelQuestions 中的索引 */
  private currentQuestionIndex: number;
  /** 当前显示的题目 */
  currentQuestion: QuizLevelQuestion | null;
  /** 累积得分 */
  score: number;
  /** 已完成题目数 */
  completedCount: number;
  /** 是否所有关卡已完成 */
  isAllCompleted: boolean;

  constructor() {
    super("quizEngine");
    this.allLevels = quizLevels;
    this.currentLevelIndex = -1;
    this.currentLevel = null;
    this.levelQuestions = [];
    this.currentQuestionIndex = 0;
    this.currentQuestion = null;
    this.score = 0;
    this.completedCount = 0;
    this.isAllCompleted = false;
  }

  /**
   * 通过 Main 实例发送事件
   */
  private emit(event: string, ...args: unknown[]): void {
    Main.getMain().sendMessage(event, ...args);
  }

  /**
   * 加载指定关卡（0 索引）
   * @returns 关卡对象，若已全部完成则返回 null
   */
  loadLevel(levelIndex: number): QuizLevel | null {
    if (levelIndex >= this.allLevels.length) {
      this.currentLevel = null;
      this.isAllCompleted = true;
      this.emit(QuizEvents.ALL_COMPLETED, this.score, this.completedCount);
      return null;
    }
    this.currentLevel = this.allLevels[levelIndex];
    this.currentLevelIndex = levelIndex;
    this.levelQuestions = [...this.currentLevel.questions];
    this.currentQuestionIndex = 0;
    this.emit(QuizEvents.QUIZ_LEVEL_START, this.currentLevel);
    return this.currentLevel;
  }

  /**
   * 进入下一关
   * @returns 下一关对象，若全部完成返回 null
   */
  advanceToNextLevel(): QuizLevel | null {
    return this.loadLevel(this.currentLevelIndex + 1);
  }

  /**
   * 获取总关卡数
   */
  get totalLevels(): number {
    return this.allLevels.length;
  }

  /**
   * 获取当前关卡号（1 起始）
   */
  get currentLevelNumber(): number {
    return this.currentLevelIndex + 1;
  }

  /**
   * 加载下一道题。返回 null 表示当前关卡题目已耗尽（或全部完成）
   */
  loadNextQuestion(): QuizLevelQuestion | null {
    if (!this.currentLevel) {
      this.isAllCompleted = true;
      this.emit(QuizEvents.ALL_COMPLETED, this.score, this.completedCount);
      return null;
    }

    if (this.currentQuestionIndex >= this.levelQuestions.length) {
      // 当前关卡题目全部完成
      this.currentQuestion = null;
      this.emit(
        QuizEvents.QUIZ_LEVEL_COMPLETE,
        this.currentLevel,
        this.score
      );
      return null;
    }

    this.currentQuestion = this.levelQuestions[this.currentQuestionIndex];
    this.currentQuestionIndex++;
    return this.currentQuestion;
  }

  /**
   * 提交答案
   * @returns 验证结果
   */
  submitAnswer(code: string): ValidationResult {
    if (!this.currentQuestion) {
      return { passed: false, failures: ["当前没有题目"] };
    }

    const result = validateCode(
      code.trim(),
      this.currentQuestion.validationRules
    );

    if (result.passed) {
      this.completedCount++;
      this.score += 10;

      // 获取奖励塔
      const reward = this.getCurrentReward();

      this.emit(
        QuizEvents.ANSWER_CORRECT,
        this.currentQuestion,
        code,
        reward
      );
      this.emit(QuizEvents.SCORE_CHANGE, this.score, this.completedCount);

      // 若有奖励塔，发送奖励事件
      if (reward) {
        this.emit(QuizEvents.QUIZ_TOWER_EARNED, reward, this.currentLevel);
      }
    } else {
      this.emit(
        QuizEvents.ANSWER_WRONG,
        result.failures,
        this.currentQuestion
      );
    }

    return result;
  }

  /**
   * 获取当前题目对应的奖励塔
   */
  getCurrentReward(): QuizLevelReward | null {
    if (!this.currentQuestion || !this.currentLevel) return null;
    const idx = this.currentQuestion.rewardIndex;
    if (
      idx >= 0 &&
      idx < this.currentLevel.rewards.length
    ) {
      return this.currentLevel.rewards[idx];
    }
    return null;
  }

  /**
   * 获取当前关卡的题目总数
   */
  get currentLevelQuestionCount(): number {
    return this.levelQuestions.length;
  }

  /**
   * 获取当前题目在当前关卡中的编号（1 起始）
   */
  get currentQuestionNumber(): number {
    return this.currentQuestionIndex;
  }

  /**
   * 重置所有（回到第一关）
   */
  reset(): void {
    this.currentLevelIndex = -1;
    this.currentLevel = null;
    this.levelQuestions = [];
    this.currentQuestionIndex = 0;
    this.currentQuestion = null;
    this.score = 0;
    this.completedCount = 0;
    this.isAllCompleted = false;
  }
}

export default QuizEngine;
