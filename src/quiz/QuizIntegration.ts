/**
 * QuizIntegration — Quiz 事件 → 游戏操作的桥梁（关卡制重写）
 *
 * 职责变更：
 * - 不再自动放置防御塔（改为玩家手动从塔库部署）
 * - 监听 QUIZ_DEPLOY_TOWER 事件，在玩家选择的位置创建防御塔
 * - 保留升级和金币奖励处理
 * - 管理 SceneUtils.quizMode 状态
 */
import Message from "../class/message";
import Main from "../core/main";
import { GameMain } from "../core/gameMain";
import { Tower } from "../gameClass/tower";
import { SceneUtils } from "../gameClass/sceneUtils";
import { QuizEvents } from "./QuizEngine";
import { QuizLevelReward } from "./quizLevels";
import * as PIXI from "pixi.js";

/** 部署塔的位置信息 */
export interface TowerDeployPosition {
  x: number;
  y: number;
}

class QuizIntegration extends Message {
  private main: Main;

  constructor(main: Main) {
    super("quizIntegration");
    this.main = main;
    // 初始进入 quiz 模式
    SceneUtils.quizMode = true;
    this.bindEvents();
  }

  /**
   * 启用部署模式（允许在地图上点击放置塔）
   */
  enableDeployMode(): void {
    SceneUtils.quizMode = false;
  }

  /**
   * 启用战斗模式
   */
  enableCombatMode(): void {
    SceneUtils.quizMode = false;
  }

  /**
   * 回到答题模式
   */
  enableQuizMode(): void {
    SceneUtils.quizMode = true;
  }

  private bindEvents(): void {
    const m = this.main;

    // ===== 部署塔：玩家在 GhostPreview 确认位置后触发 =====
    m.on(
      QuizEvents.QUIZ_DEPLOY_TOWER as string,
      (reward: QuizLevelReward, position: TowerDeployPosition) => {
        this.handleDeployTower(reward, position);
      }
    );

    // ===== 升级塔（保留原有功能，用于答题时升级已部署的塔） =====
    m.on(QuizEvents.UPGRADE_TOWER as string, (data: any) => {
      this.handleUpgradeTower(data);
    });

    // ===== 升级所有塔 =====
    m.on(QuizEvents.UPGRADE_ALL_TOWERS as string, (data: any) => {
      this.handleUpgradeAllTowers(data);
    });

    // ===== 金币奖励 =====
    m.on(QuizEvents.GOLD_REWARD as string, (data: any) => {
      this.handleGoldReward(data);
    });

    // ===== 波次开始 — 切换到战斗模式 =====
    m.on(QuizEvents.QUIZ_WAVE_START as string, () => {
      this.enableCombatMode();
    });
  }

  /**
   * 在玩家选择的位置创建防御塔
   */
  private handleDeployTower(
    reward: QuizLevelReward,
    position: TowerDeployPosition
  ): void {
    const sc = this.main.getNowScene();
    if (!sc) {
      console.error("[QuizIntegration] 场景未加载，无法部署塔");
      this.emitPlacementFailed("场景未加载");
      return;
    }

    try {
      const tower = Tower.createTowerForScene(reward.towerName, {
        x: position.x,
        y: position.y,
      });

      if (tower) {
        // 选中刚创建的塔以高亮显示
        const gm = GameMain.getGameMain();
        if (gm && gm.sceneUtils) {
          gm.sceneUtils.addSelectRole(tower);
        }
        console.log(
          `[QuizIntegration] 防御塔 ${reward.displayName} 部署成功 at (${position.x}, ${position.y})`
        );
      } else {
        console.error(
          `[QuizIntegration] Tower.createTowerForScene 返回 null for ${reward.towerName}`
        );
        this.emitPlacementFailed("创建防御塔失败");
      }
    } catch (err) {
      console.error("[QuizIntegration] 部署防御塔出错:", err);
      this.emitPlacementFailed("部署防御塔时发生错误");
    }
  }

  /**
   * 升级指定防御塔
   */
  private handleUpgradeTower(data: any): void {
    const gm = GameMain.getGameMain();
    if (!gm || !gm.sceneUtils) {
      this.emitPlacementFailed("游戏未初始化");
      return;
    }

    const sc = this.main.getNowScene();
    if (!sc) {
      this.emitPlacementFailed("场景未加载");
      return;
    }

    // 优先使用当前选中的塔
    let targetTower: Tower | null = null;
    const selected = gm.sceneUtils._selectRoles;
    if (selected && selected.length > 0) {
      targetTower = selected[0] as Tower;
    }

    // 没有选中塔则找最新的
    if (!targetTower) {
      const allTowers = gm.sceneUtils.getAllTower();
      if (allTowers.length > 0) {
        targetTower = allTowers[allTowers.length - 1] as Tower;
      }
    }

    if (!targetTower) {
      this.emitPlacementFailed("没有可升级的防御塔");
      return;
    }

    const times = data?.onSuccess?.upgradeTimes || data?.upgradeTimes || 1;
    try {
      for (let i = 0; i < times; i++) {
        gm.sceneUtils.updateRole(targetTower);
      }
      gm.sceneUtils.addSelectRole(targetTower);

      if (data?.onSuccess?.goldReward) {
        this.addGold(data.onSuccess.goldReward);
      }
    } catch (err) {
      console.error("[QuizIntegration] 升级防御塔失败:", err);
      this.emitPlacementFailed("升级防御塔时发生错误");
    }
  }

  /**
   * 升级所有防御塔
   */
  private handleUpgradeAllTowers(data: any): void {
    const gm = GameMain.getGameMain();
    if (!gm || !gm.sceneUtils) {
      this.emitPlacementFailed("游戏未初始化");
      return;
    }

    const allTowers = gm.sceneUtils.getAllTower();
    if (allTowers.length === 0) {
      this.emitPlacementFailed("没有可升级的防御塔");
      return;
    }

    try {
      for (const tower of allTowers) {
        gm.sceneUtils.updateRole(tower as Tower);
      }

      if (data?.onSuccess?.goldReward) {
        this.addGold(data.onSuccess.goldReward);
      }
    } catch (err) {
      console.error("[QuizIntegration] 升级所有塔失败:", err);
      this.emitPlacementFailed("升级防御塔时发生错误");
    }
  }

  /**
   * 处理：直接金币奖励
   */
  private handleGoldReward(data: any): void {
    const amount = data?.onSuccess?.goldReward || data?.goldReward || 0;
    if (amount > 0) {
      this.addGold(amount);
    }
  }

  /**
   * 添加金币
   */
  private addGold(amount: number): void {
    if (!this.main.ui || !this.main.ui.resShow) return;
    try {
      this.main.ui.resShow.goldNumber += amount;
    } catch (_) {
      /* 静默失败 */
    }
  }

  /**
   * 发送放置失败事件
   */
  private emitPlacementFailed(message: string): void {
    this.main.sendMessage(QuizEvents.PLACEMENT_FAILED, message);
  }
}

export default QuizIntegration;
