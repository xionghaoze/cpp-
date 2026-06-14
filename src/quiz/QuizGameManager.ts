/**
 * QuizGameManager — 答题塔防游戏流程编排器
 *
 * 职责：
 * 1. 初始化所有 Quiz 相关组件（Engine, UI, Integration, Inventory, WaveButton, GhostPreview）
 * 2. 管理完整的游戏状态机：答题 → 部署 → 出怪 → 战斗 → 下一关
 * 3. 协调 SpawnEnemies 与 Quiz 关卡系统的集成
 * 4. 检测波次完成并触发关卡推进
 */
import Main from "../core/main";
import { GameMain } from "../core/gameMain";
import { EVENT_TYPE } from "../utils/enum";
import QuizEngine, { QuizEvents } from "./QuizEngine";
import QuizUI from "./QuizUI";
import QuizIntegration from "./QuizIntegration";
import TowerInventory from "../ui/TowerInventory";
import WaveButton, { WaveButtonState } from "../ui/WaveButton";
import GhostPreview from "./GhostPreview";
import { QuizLevel, QuizLevelReward, QuizLevelWave } from "./quizLevels";

/** 游戏阶段枚举 */
enum GamePhase {
  /** 尚未初始化 */
  UNINITIALIZED = "uninitialized",
  /** 答题中 */
  QUIZ = "quiz",
  /** 部署塔（答题完成，等待玩家放置塔） */
  DEPLOY = "deploy",
  /** 战斗中 */
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
  private inventory!: TowerInventory;
  private waveButton!: WaveButton;
  private ghost!: GhostPreview;

  /** 当前游戏阶段 */
  private phase: GamePhase = GamePhase.UNINITIALIZED;
  /** 波次完成检测定时器 ID */
  private waveCheckInterval: number | null = null;
  /** 已部署塔计数 */
  private deployedCount: number = 0;

  constructor(main: Main) {
    this.main = main;

    // 创建各子系统
    this.engine = new QuizEngine();
    this.ui = new QuizUI(this.engine);
    this.integration = new QuizIntegration(main);

    // 这些在场景就绪后才创建（需要 PIXI scene）
    this.wireEvents();
  }

  /**
   * 场景加载完成后调用
   */
  onSceneReady(): void {
    const sc = this.main.getNowScene();
    if (!sc) {
      console.warn("[QuizGameManager] onSceneReady called but no scene");
      return;
    }

    // 创建场景内 UI 组件
    this.inventory = new TowerInventory();
    this.waveButton = new WaveButton();
    this.ghost = new GhostPreview();

    // 添加到场景 UI 层
    sc.addUiChild(this.inventory);
    sc.addUiChild(this.waveButton);

    // 注册 logicOperation 更新
    this.registerLogicUpdate(sc);

    // 连接部署回调
    this.inventory.onDeployRequest = (reward: QuizLevelReward) => {
      this.ghost.beginDeploy(reward);
    };

    // 加载第一关
    this.startLevel(0);
  }

  /**
   * 注册每帧逻辑更新
   * 使用 EVENT_TYPE.FRAME_CALLS（每帧自动发送）
   */
  private registerLogicUpdate(_sc: any): void {
    this.main.on(EVENT_TYPE.FRAME_CALLS, (frameTime: number) => {
      if (this.inventory) {
        this.inventory.logicOperation(frameTime);
      }
      if (this.waveButton) {
        this.waveButton.logicOperation(frameTime);
      }
      // 战斗中检查波次完成
      if (this.phase === GamePhase.COMBAT) {
        this.checkWaveCompletion();
      }
    });
  }

  /**
   * 绑定核心事件
   */
  private wireEvents(): void {
    const m = this.main;

    // ===== 关卡加载（场景就绪后） =====
    // 外部调用 onSceneReady → startLevel → 加载关卡

    // ===== 关卡完成 → 切换到部署阶段 =====
    m.on(
      QuizEvents.QUIZ_LEVEL_COMPLETE as string,
      (level: QuizLevel, _score: number) => {
        this.phase = GamePhase.DEPLOY;
        console.log(
          `[QuizGameManager] 关卡 ${level.id} 答题完成，进入部署阶段`
        );
      }
    );

    // ===== 波次开始 =====
    m.on(QuizEvents.QUIZ_WAVE_START as string, () => {
      this.startWaves();
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

    // ===== 部署开始 — 切换到部署模式 =====
    m.on(
      QuizEvents.QUIZ_DEPLOY_START as string,
      (_reward: QuizLevelReward) => {
        this.phase = GamePhase.DEPLOY;
        this.integration.enableDeployMode();
      }
    );

    // ===== 部署完成/取消 — 检查是否可以开始波次 =====
    m.on(QuizEvents.QUIZ_DEPLOY_TOWER as string, () => {
      this.deployedCount++;
      this.integration.enableDeployMode(); // 保持部署模式
    });

    m.on(QuizEvents.QUIZ_DEPLOY_CANCELLED as string, () => {
      if (this.phase === GamePhase.DEPLOY) {
        if (this.deployedCount > 0) {
          // 已有塔部署，保持部署模式
        } else {
          // 没有塔，回到答题后的部署模式
        }
      }
    });
  }

  /**
   * 开始一个关卡
   */
  private startLevel(levelIndex: number): void {
    const level = this.engine.loadLevel(levelIndex);
    if (!level) {
      console.log("[QuizGameManager] 没有更多关卡");
      this.phase = GamePhase.COMPLETE;
      return;
    }

    this.phase = GamePhase.QUIZ;
    this.deployedCount = 0;

    // 加载第一道题
    const firstQuestion = this.engine.loadNextQuestion();
    if (firstQuestion) {
      this.ui.renderQuestion(firstQuestion);
    }

    // 设置波次按钮状态
    this.waveButton.setState(WaveButtonState.QUIZ_ACTIVE);

    // 设置答题模式
    this.integration.enableQuizMode();

    // 注入波次数（用于显示）
    this.waveButton.setWaveInfo(1, level.enemyWaves.length, 0);

    console.log(
      `[QuizGameManager] === 关卡 ${level.id}: ${level.name} 开始 ===`
    );
  }

  /**
   * 开始出怪
   */
  private startWaves(): void {
    const level = this.engine.currentLevel;
    if (!level) {
      console.warn("[QuizGameManager] 无当前关卡，无法开始出怪");
      return;
    }

    this.phase = GamePhase.COMBAT;
    this.integration.enableCombatMode();

    const gm = GameMain.getGameMain();
    if (!gm || !gm.spawnEnemies) {
      console.warn("[QuizGameManager] GameMain 或 SpawnEnemies 不可用");
      return;
    }

    const se = gm.spawnEnemies;
    const sc = this.main.getNowScene();

    if (!sc || !sc.createData) {
      console.warn("[QuizGameManager] 场景数据不可用");
      return;
    }

    // 注入关卡定义的波次到 SpawnEnemies
    const areas = sc.createData.areas || [];
    const startArea = areas.find((a: any) => a.areaId === "startArea1") || areas[0];
    const endArea = areas.find((a: any) => a.areaId === "endArea1") || areas[areas.length - 1];

    if (!startArea || !endArea) {
      console.warn(
        "[QuizGameManager] 场景缺少 start/end area，尝试使用默认区域"
      );
      // 如果场景没有定义 area，尝试创建默认的
      // 大多数场景会通过 readSceneData 加载
    }

    // 将关卡定义的波次直接注入到 SpawnEnemies
    se.enemyWaves = level.enemyWaves.map(
      (wave: QuizLevelWave, index: number) => ({
        startAreaId: startArea ? startArea.areaId || "startArea1" : "startArea1",
        endAreaId: endArea ? endArea.areaId || "endArea1" : "endArea1",
        name: wave.enemyName,
        level: 0,
        createTime: wave.createTime,
        count: wave.count,
      })
    );

    // 保留场景的 areas（如果 SpawnEnemies 还没读取）
    if (!se.areas || se.areas.length === 0) {
      se.areas = areas;
    }

    se.nowWave = 0;
    se.isStart = true;
    se.isStart2 = false;

    // 启动波次系统
    se.start();

    // 更新按钮状态
    this.waveButton.setState(WaveButtonState.COMBAT_ACTIVE);
    this.waveButton.setWaveInfo(1, level.enemyWaves.length, level.enemyWaves[0]?.count || 0);

    console.log(
      `[QuizGameManager] ⚔ 开始出怪！共 ${level.enemyWaves.length} 波`
    );
  }

  /**
   * 持续检测波次是否全部完成
   * 在 logicOperation 中每帧调用
   */
  private checkWaveCompletion(): void {
    if (this.phase !== GamePhase.COMBAT) return;

    const gm = GameMain.getGameMain();
    if (!gm || !gm.sceneUtils) return;

    const se = gm.spawnEnemies;

    // 检查条件：所有波次已生成完毕 且 地图上没有存活的敌人
    const allWavesSpawned =
      se && se.nowWave >= (this.engine.currentLevel?.enemyWaves.length || 0);

    const enemies = gm.sceneUtils.getAllEnemy();
    const noEnemiesAlive = enemies.length === 0;

    if (allWavesSpawned && noEnemiesAlive && se.isStart2) {
      // 波次全部完成！
      this.onWavesComplete();
    }

    // 更新波次按钮的敌人剩余数
    if (this.waveButton.getState() === WaveButtonState.COMBAT_ACTIVE) {
      this.waveButton.setWaveInfo(
        Math.min(se.nowWave + 1, this.engine.currentLevel?.enemyWaves.length || 1),
        this.engine.currentLevel?.enemyWaves.length || 1,
        enemies.length
      );
    }
  }

  /**
   * 波次全部完成回调
   */
  private onWavesComplete(): void {
    this.phase = GamePhase.TRANSITION;
    console.log("[QuizGameManager] 🏆 当前关卡所有波次已完成！");

    // 清理波次检测
    this.waveButton.setWaveInfo(
      this.engine.currentLevel?.enemyWaves.length || 0,
      this.engine.currentLevel?.enemyWaves.length || 0,
      0
    );
    this.waveButton.setState(WaveButtonState.ALL_COMPLETE);
  }

  /**
   * 进入下一关
   */
  private advanceLevel(): void {
    this.phase = GamePhase.QUIZ;

    const gm = GameMain.getGameMain();
    if (gm && gm.spawnEnemies) {
      // 停止当前波次计时器，保留 areas 数据
      gm.spawnEnemies.clearStart();
      gm.spawnEnemies.clearTime();
    }

    const nextLevel = this.engine.advanceToNextLevel();
    if (!nextLevel) {
      this.phase = GamePhase.COMPLETE;
      console.log("[QuizGameManager] 🎉 所有关卡完成！");
      return;
    }

    this.deployedCount = 0;

    // 清空塔库（已部署的塔保留在地图上）
    this.inventory.clear();

    // 加载第一道题
    const firstQuestion = this.engine.loadNextQuestion();
    if (firstQuestion) {
      this.ui.renderQuestion(firstQuestion);
    }

    // 重置波次按钮
    this.waveButton.setState(WaveButtonState.QUIZ_ACTIVE);
    this.waveButton.setWaveInfo(1, nextLevel.enemyWaves.length, 0);

    // 回到答题模式
    this.integration.enableQuizMode();

    console.log(
      `[QuizGameManager] === 进入关卡 ${nextLevel.id}: ${nextLevel.name} ===`
    );
  }
}

export default QuizGameManager;
