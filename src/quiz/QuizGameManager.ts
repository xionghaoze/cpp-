/**
 * QuizGameManager — 答题塔防游戏流程编排器（重设计版）
 *
 * 新流程：
 * 1. 进入关卡 → 时间冻结 → 显示题目
 * 2. 答对题目 → 自动放置防御塔 → 时间流动 → 敌人出现
 * 3. 战斗中可以继续答题 → 答对升级防御塔
 * 4. 所有波次完成 → 自动进入下一关
 */
import Main from "../core/main";
import { GameMain } from "../core/gameMain";
import { EVENT_TYPE } from "../utils/enum";
import QuizEngine, { QuizEvents } from "./QuizEngine";
import QuizUI from "./QuizUI";
import QuizIntegration from "./QuizIntegration";
import { QuizLevel, QuizLevelWave } from "./quizLevels";

/** 游戏阶段枚举 */
enum GamePhase {
  UNINITIALIZED = "uninitialized",
  /** 答题中（时间冻结） */
  QUIZ = "quiz",
  /** 战斗中（时间流动） */
  COMBAT = "combat",
  /** 关卡过渡 */
  TRANSITION = "transition",
  /** 全部完成 */
  COMPLETE = "complete",
}

class QuizGameManager {
  private main: Main;
  private engine: QuizEngine;
  private ui: QuizUI;
  private integration: QuizIntegration;

  private phase: GamePhase = GamePhase.UNINITIALIZED;
  /** 本关卡是否已经解锁时间 */
  private timeUnlocked: boolean = false;

  constructor(main: Main) {
    this.main = main;
    this.engine = new QuizEngine();
    this.ui = new QuizUI(this.engine);
    this.integration = new QuizIntegration(main);
    this.wireEvents();
  }

  onSceneReady(): void {
    const sc = this.main.getNowScene();
    if (!sc) {
      console.warn("[QuizGameManager] onSceneReady called but no scene");
      return;
    }

    const sceneId = (sc as any).createData?.id || (sc as any).sceneId || "";
    const sceneName = (sc as any).createData?.name || "";
    if (sceneId === "start" || sceneId === "select" || sceneName === "start") {
      console.log("[QuizGameManager] 跳过菜单场景: " + (sceneId || sceneName));
      return;
    }

    console.log("[QuizGameManager] 启动答题系统 on scene: " + (sceneId || sceneName));
    this.registerLogicUpdate();
    this.startLevel(0);
  }

  private registerLogicUpdate(): void {
    this.main.on(EVENT_TYPE.FRAME_CALLS, (_frameTime: number) => {
      if (this.phase === GamePhase.COMBAT) {
        this.checkWaveCompletion();
      }
    });
  }

  private wireEvents(): void {
    const m = this.main;

    // ===== 答对题目 → 解锁时间 / 升级防御塔 =====
    m.on(QuizEvents.ANSWER_CORRECT as string, (_question: any, _code: string, reward: any) => {
      if (!this.timeUnlocked) {
        // 首次答对：自动放置塔 + 解锁时间 + 开始出怪
        console.log("[QuizGameManager] 🔓 首次答对，解锁时间流动！");
        this.timeUnlocked = true;
        if (reward) {
          this.integration.autoDeployTower(reward);
        }
        this.main.continueGame();
        this.integration.enableCombatMode();
        this.startWaves();
      } else {
        // 后续答对：升级防御塔
        console.log("[QuizGameManager] ⬆ 升级防御塔！");
        this.integration.handleUpgradeSuccess();
      }
      // 加载下一题（若无下一题则显示升级提示）
      const nextQ = this.engine.loadNextQuestion();
      if (nextQ) {
        this.ui.renderQuestion(nextQ);
      }
    });

    // ===== 题答完后仍可提交升级代码 =====
    m.on(QuizEvents.QUIZ_LEVEL_COMPLETE as string, (_level: QuizLevel, _score: number) => {
      console.log("[QuizGameManager] 题目全部完成，可继续提交升级代码");
      // 不锁定 UI，继续允许提交升级代码
    });

    // ===== 波次全部完成 → 进入下一关 =====
    m.on(EVENT_TYPE.QUIZ_WAVE_ALL_COMPLETE as string, () => {
      this.advanceLevel();
    });

    // ===== 全部完成 =====
    m.on(QuizEvents.ALL_COMPLETED as string, () => {
      this.phase = GamePhase.COMPLETE;
      console.log("[QuizGameManager] 全部关卡完成！");
    });

    // ===== 升级成功 =====
    m.on(QuizEvents.UPGRADE_SUCCESS as string, () => {
      this.integration.handleUpgradeSuccess();
    });
  }

  private startLevel(levelIndex: number): void {
    const level = this.engine.loadLevel(levelIndex);
    if (!level) {
      console.log("[QuizGameManager] 没有更多关卡");
      this.phase = GamePhase.COMPLETE;
      return;
    }

    this.phase = GamePhase.QUIZ;
    this.timeUnlocked = false;

    // 🧊 冻结时间 — 等待玩家答题解锁
    this.main.pauseGame();
    this.integration.enableQuizMode();

    const firstQuestion = this.engine.loadNextQuestion();
    if (firstQuestion) {
      this.ui.renderQuestion(firstQuestion);
    }

    console.log(`[QuizGameManager] ⏸ 关卡 ${level.id}: ${level.name} 开始 — 时间冻结，等待答题解锁`);
  }

  private startWaves(): void {
    const level = this.engine.currentLevel;
    if (!level) return;

    this.phase = GamePhase.COMBAT;

    const gm = GameMain.getGameMain();
    if (!gm || !gm.spawnEnemies) return;

    const se = gm.spawnEnemies;
    const sc = this.main.getNowScene();
    if (!sc || !sc.createData) return;

    const areas = sc.createData.areas || [];
    const startArea = areas.find((a: any) => a.areaId === "startArea1") || areas.find((a: any) => a.areaId === "start") || areas[0];
    const endArea = areas.find((a: any) => a.areaId === "endArea1") || areas.find((a: any) => a.areaId === "end") || areas[areas.length - 1];

    se.enemyWaves = level.enemyWaves.map((wave: QuizLevelWave) => ({
      startAreaId: startArea ? startArea.areaId || "startArea1" : "startArea1",
      endAreaId: endArea ? endArea.areaId || "endArea1" : "endArea1",
      name: wave.enemyName,
      level: 0,
      createTime: wave.createTime,
      count: wave.count,
    }));

    if (!se.areas || se.areas.length === 0) {
      se.areas = areas;
    }

    // 读取场景数据（包含 areas）
    if (gm.readSceneData) {
      gm.readSceneData();
    }

    se.nowWave = 0;
    se.isStart = true;
    se.isStart2 = false;
    se.start();

    console.log(`[QuizGameManager] ⚔ 开始出怪！共 ${level.enemyWaves.length} 波`);
  }

  private checkWaveCompletion(): void {
    if (this.phase !== GamePhase.COMBAT) return;

    const gm = GameMain.getGameMain();
    if (!gm || !gm.sceneUtils) return;

    const se = gm.spawnEnemies;
    const totalWaves = this.engine.currentLevel?.enemyWaves.length || 0;
    const allWavesSpawned = se && se.nowWave >= totalWaves;
    const atLeastOneWaveStarted = se && se.nowWave > 0;
    const enemies = gm.sceneUtils.getAllEnemy();
    const noEnemiesAlive = enemies.length === 0;

    if (allWavesSpawned && atLeastOneWaveStarted && noEnemiesAlive) {
      this.phase = GamePhase.TRANSITION;
      console.log("[QuizGameManager] 🏆 当前关卡所有波次已完成！");
      this.main.sendMessage(EVENT_TYPE.QUIZ_WAVE_ALL_COMPLETE as string);
    }
  }

  private advanceLevel(): void {
    this.phase = GamePhase.QUIZ;

    const gm = GameMain.getGameMain();
    if (gm && gm.spawnEnemies) {
      gm.spawnEnemies.clearStart();
      gm.spawnEnemies.clearTime();
    }

    const nextLevel = this.engine.advanceToNextLevel();
    if (!nextLevel) {
      this.phase = GamePhase.COMPLETE;
      console.log("[QuizGameManager] 🎉 所有关卡完成！");
      return;
    }

    this.timeUnlocked = false;
    // 🧊 冻结时间 — 下一关
    this.main.pauseGame();
    this.integration.enableQuizMode();

    const firstQuestion = this.engine.loadNextQuestion();
    if (firstQuestion) {
      this.ui.renderQuestion(firstQuestion);
    }

    console.log(`[QuizGameManager] ⏸ 进入关卡 ${nextLevel.id}: ${nextLevel.name} — 时间冻结`);
  }
}

export default QuizGameManager;
