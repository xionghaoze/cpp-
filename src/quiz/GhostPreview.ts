/**
 * GhostPreview — 防御塔部署时的鼠标跟随虚影系统
 *
 * 激活后：
 * 1. 半透明塔图标跟随鼠标移动
 * 2. 绿色方格 = 可放置区域，红色方格 = 不可放置
 * 3. 点击有效位置 → 发送 QUIZ_DEPLOY_TOWER，塔部署到该位置
 * 4. 右键 / Escape → 取消防御塔部署
 *
 * 复用 TowerSelect 的 canAddTowerBlock 验证逻辑
 */
import * as PIXI from "pixi.js";
import Main from "../core/main";
import { GameMain } from "../core/gameMain";
import { AREA_TYPE, EVENT_TYPE } from "../utils/enum";
import { ISceneDrawRect } from "../utils/types";
import { QuizEvents } from "./QuizEngine";
import { QuizLevelReward } from "./quizLevels";

class GhostPreview {
  /** 幽灵虚影 */
  private ghostSprite: PIXI.Sprite | null = null;
  /** 放置方格预览 */
  private placementRect: ISceneDrawRect | null = null;
  /** 当前是否处于部署模式 */
  isActive: boolean = false;
  /** 当前要部署的塔 */
  private currentReward: QuizLevelReward | null = null;

  /** 绑定的 move 回调 */
  private boundMouseMove: ((e: any) => void) | null = null;
  /** 绑定的 up 回调 */
  private boundMouseUp: ((e: any) => void) | null = null;
  /** 绑定的 keydown 回调 */
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  /** 绑定的右键回调 */
  private boundContextMenu: ((e: any) => void) | null = null;

  private main: Main;

  constructor() {
    this.main = Main.getMain();
  }

  /**
   * 进入部署模式
   * 点击塔库中的塔卡片时调用
   */
  beginDeploy(reward: QuizLevelReward): void {
    if (this.isActive) {
      this.cancelDeploy();
    }

    this.isActive = true;
    this.currentReward = reward;

    // 创建幽灵虚影（简单的彩色矩形 + 文字作为预览）
    this.ghostSprite = this.createGhostSprite(reward);

    // 创建放置方格预览
    this.placementRect = {
      r: { x: 0, y: 0, width: 48, height: 48 },
      color: 0x00ff00,
      a: 0.5,
      borderColor: 0xffffff,
      borderWidth: 2,
    };

    // 绑定场景事件（与 TowerSelect 相同的模式）
    const sc = this.main.getNowScene();
    if (!sc) {
      this.cancelDeploy();
      return;
    }

    const sbRect = sc.getSbRect();

    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);

    sbRect.on("moveCall", this.boundMouseMove);
    sbRect.on("upCall", this.boundMouseUp);

    // 绑定键盘事件 (Escape 取消)
    this.boundKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.cancelDeploy();
      }
    };
    window.addEventListener("keydown", this.boundKeyDown);

    // 绑定右键取消
    this.boundContextMenu = (e: any) => {
      e.preventDefault();
      this.cancelDeploy();
    };
    window.addEventListener("contextmenu", this.boundContextMenu);

    // 发送部署开始事件
    this.main.sendMessage(QuizEvents.QUIZ_DEPLOY_START as string, reward);

    console.log(
      `[GhostPreview] 进入部署模式: ${reward.displayName}`
    );
  }

  /**
   * 鼠标移动回调
   */
  private onMouseMove(e: any): void {
    if (!this.isActive || !this.ghostSprite || !this.placementRect) return;

    const sc = this.main.getNowScene();
    if (!sc) return;

    const global = e.data.global as PIXI.Point;
    const localPix = sc.toLocal(global);

    // 转换为网格坐标
    const blockP = sc.pixelCoorToGridCoor(localPix) as PIXI.Point;
    const pixP = sc.gridCoorToPixelCoor(blockP) as PIXI.Point;

    // 更新幽灵虚影位置（像素坐标，居中）
    this.ghostSprite.x = pixP.x + 24 - this.ghostSprite.width / 2;
    this.ghostSprite.y = pixP.y + 24 - this.ghostSprite.height / 2;

    // 检查是否可以放置
    const canPlace = this.canPlaceAt(blockP);

    // 更新方格颜色
    if (canPlace) {
      this.placementRect.color = 0x00ff00;
      this.placementRect.a = 0.5;
    } else {
      this.placementRect.color = 0xff0000;
      this.placementRect.a = 0.6;
    }

    // 移除旧方格，添加新方格
    sc.removeDrawRect(this.placementRect);
    this.placementRect.r.x = pixP.x;
    this.placementRect.r.y = pixP.y;
    sc.addDrawRect(this.placementRect);
  }

  /**
   * 鼠标松开回调
   */
  private onMouseUp(e: any): void {
    if (!this.isActive || !this.currentReward) return;

    const sc = this.main.getNowScene();
    if (!sc) {
      this.cancelDeploy();
      return;
    }

    const global = e.data.global as PIXI.Point;
    const localPix = sc.toLocal(global);
    const blockP = sc.pixelCoorToGridCoor(localPix) as PIXI.Point;
    const canPlace = this.canPlaceAt(blockP);

    if (canPlace) {
      // 计算像素级塔位置（格子中心）
      const pixP = sc.gridCoorToPixelCoor(blockP) as PIXI.Point;
      const deployPos = {
        x: pixP.x + 24,
        y: pixP.y + 24,
      };

      // 发送部署事件
      this.main.sendMessage(
        QuizEvents.QUIZ_DEPLOY_TOWER as string,
        this.currentReward,
        deployPos
      );

      console.log(
        `[GhostPreview] 防御塔 ${this.currentReward.displayName} 部署到 (${deployPos.x}, ${deployPos.y})`
      );
    }

    // 无论放置成功与否，退出部署模式
    this.cancelDeploy();
  }

  /**
   * 取消防御塔部署（不放置塔）
   */
  cancelDeploy(): void {
    if (!this.isActive) return;

    const sc = this.main.getNowScene();

    // 清理幽灵虚影
    if (this.ghostSprite && sc) {
      sc.removeUiChild(this.ghostSprite);
      this.ghostSprite.destroy();
      this.ghostSprite = null;
    }

    // 清理放置方格
    if (this.placementRect && sc) {
      sc.removeDrawRect(this.placementRect);
      this.placementRect = null;
    }

    // 解绑场景事件
    if (sc && this.boundMouseMove && this.boundMouseUp) {
      const sbRect = sc.getSbRect();
      sbRect.off("moveCall", this.boundMouseMove);
      sbRect.off("upCall", this.boundMouseUp);
    }

    // 解绑键盘事件
    if (this.boundKeyDown) {
      window.removeEventListener("keydown", this.boundKeyDown);
    }
    if (this.boundContextMenu) {
      window.removeEventListener("contextmenu", this.boundContextMenu);
    }

    this.isActive = false;
    this.currentReward = null;
    this.boundMouseMove = null;
    this.boundMouseUp = null;
    this.boundKeyDown = null;
    this.boundContextMenu = null;

    // 发送取消事件
    this.main.sendMessage(QuizEvents.QUIZ_DEPLOY_CANCELLED as string);

    console.log("[GhostPreview] 退出部署模式");
  }

  /**
   * 检查指定网格位置是否可以放置防御塔
   * 复用 TowerSelect 的验证逻辑
   */
  private canPlaceAt(blockP: PIXI.Point): boolean {
    const sc = this.main.getNowScene();
    if (!sc) return false;

    // 检查碰撞区域
    const blockData = sc.getBlockAreaData(blockP);
    if (!blockData || blockData.type === AREA_TYPE.COLLSION_AREA) {
      return false;
    }

    // 检查是否已有塔
    const gm = GameMain.getGameMain();
    if (gm && gm.sceneUtils) {
      const existingTowers = gm.sceneUtils.getAllTower((item: any) => {
        const blockP2 = sc.pixelCoorToGridCoor(item);
        return blockP2.x === blockP.x && blockP2.y === blockP.y;
      });
      if (existingTowers.length > 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * 创建幽灵虚影（直接使用 Graphics）
   */
  private createGhostSprite(reward: QuizLevelReward): PIXI.Sprite {
    const sc = this.main.getNowScene()!;

    // 使用 Graphics 绘制塔形虚影
    const graphics = new PIXI.Graphics();

    // 外框（代表塔的占地范围）
    graphics.lineStyle(2, 0x00ff88, 1);
    graphics.beginFill(0x00ff88, 0.3);
    graphics.drawRoundedRect(0, 0, 44, 44, 6);
    graphics.endFill();

    // 内十字（瞄准符号）
    graphics.lineStyle(2, 0xffffff, 0.7);
    graphics.moveTo(22, 8);
    graphics.lineTo(22, 36);
    graphics.moveTo(8, 22);
    graphics.lineTo(36, 22);

    // 将 Graphics 包装为 Sprite 以便添加到 UI 层
    const sprite = new PIXI.Sprite(
      this.main.$app.renderer.generateTexture(
        graphics,
        PIXI.SCALE_MODES.LINEAR,
        1
      )
    );
    sprite.alpha = 0.8;

    // 添加到场景 UI 层
    sc.addUiChild(sprite);

    return sprite;
  }
}

export default GhostPreview;
