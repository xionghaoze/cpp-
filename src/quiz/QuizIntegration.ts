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
    // 允许游戏区域点击
    SceneUtils.quizMode = false;
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
   * 回到答题模式 — 游戏时间冻结但界面仍可点击
   */
  enableQuizMode(): void {
    SceneUtils.quizMode = false; // 不阻止游戏区域点击
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

    // ===== 升级代码编译通过 — 升级一座防御塔 =====
    m.on(QuizEvents.UPGRADE_SUCCESS as string, () => {
      this.handleUpgradeSuccess();
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
   * 自动放置防御塔（答对题时调用）
   * 在地图中间靠上的可放置位置创建塔
   */
  autoDeployTower(reward: QuizLevelReward): void {
    const sc = this.main.getNowScene();
    if (!sc || !reward) return;

    const pos = this.findPlaceablePosition(sc);
    if (!pos) {
      console.warn("[QuizIntegration] 找不到可放置塔的位置");
      return;
    }

    try {
      const tower = Tower.createTowerForScene(reward.towerName, pos);
      if (tower) {
        const gm = GameMain.getGameMain();
        if (gm && gm.sceneUtils) {
          gm.sceneUtils.addSelectRole(tower);
        }
        console.log(`[QuizIntegration] 自动部署: ${reward.displayName} at (${pos.x}, ${pos.y})`);
      }
    } catch (err) {
      console.error("[QuizIntegration] 自动部署失败:", err);
    }
  }

  /**
   * 在场景中寻找可放置塔的位置
   */
  private findPlaceablePosition(sc: any): { x: number; y: number } | null {
    const sbRect = sc.getSbRect();
    // 扫描地图中间靠上区域
    const startX = sbRect.width * 0.3;
    const startY = sbRect.height * 0.2;
    const endX = sbRect.width * 0.7;
    const endY = sbRect.height * 0.5;
    const step = 48; // 网格大小

    for (let y = startY; y < endY; y += step) {
      for (let x = startX; x < endX; x += step) {
        const blockP = sc.pixelCoorToGridCoor({ x, y });
        const blockData = sc.getBlockAreaData(blockP);
        if (blockData && blockData.type !== 1) {
          // 找到可放置位置
          const pixP = sc.gridCoorToPixelCoor(blockP);
          return { x: pixP.x + 24, y: pixP.y + 24 };
        }
      }
    }
    // 没找到合适位置，返回地图中心
    return { x: sbRect.width / 2, y: sbRect.height / 3 };
  }

  /**
   * 升级一座已部署的防御塔（公开方法）
   */
  handleUpgradeSuccess(): void {
    const gm = GameMain.getGameMain();
    if (!gm || !gm.sceneUtils) return;

    // 优先升级当前选中的塔，否则升级最新部署的塔
    let target: Tower | null = null;
    const selected = gm.sceneUtils._selectRoles;
    if (selected && selected.length > 0) {
      target = selected[0] as Tower;
    }
    if (!target) {
      const all = gm.sceneUtils.getAllTower();
      if (all.length > 0) target = all[all.length - 1] as Tower;
    }
    if (!target) {
      console.warn("[QuizIntegration] 没有可升级的防御塔");
      return;
    }

    try {
      gm.sceneUtils.updateRole(target);
      gm.sceneUtils.addSelectRole(target);
      console.log("[QuizIntegration] 防御塔升级成功");
    } catch (err) {
      console.error("[QuizIntegration] 升级失败:", err);
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
