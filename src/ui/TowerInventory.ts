/**
 * TowerInventory — 塔库暂存区 UI（Pixi.js）
 *
 * 显示答题获得的、尚未部署的防御塔卡片。
 * 横向排列在游戏画面底部。点击卡片进入部署模式。
 *
 * 复用 ScrollBox 和 GameText 模式
 */
import * as PIXI from "pixi.js";
import Main from "../core/main";
import { QuizEvents } from "../quiz/QuizEngine";
import { QuizLevelReward } from "../quiz/quizLevels";
import { EVENT_TYPE } from "../utils/enum";
import { ScrollBox } from "./scrollbox";
import userUtilsPro from "../utils/utilsPro";
import { GameText } from "../class/gameText";

/** 单个塔库存条目 */
interface TowerEntry {
  reward: QuizLevelReward;
  deployed: boolean;
  container: PIXI.Container;
}

class TowerInventory extends PIXI.Container {
  /** 塔条目列表 */
  private entries: TowerEntry[] = [];
  /** 背景 */
  private bg: PIXI.Graphics;
  /** 可见性标记 */
  visible2: boolean = true;
  /** 标题文本 */
  private titleText: PIXI.Text | null = null;
  /** 卡片容器 */
  private cardsContainer: PIXI.Container;

  /** 外部部署回调 — 由 QuizGameManager 注入 */
  onDeployRequest: ((reward: QuizLevelReward) => void) | null = null;

  constructor() {
    super();
    this.name = "towerInventory";

    // 背景
    this.bg = new PIXI.Graphics();
    this.addChild(this.bg);

    // 卡片容器
    this.cardsContainer = new PIXI.Container();
    this.addChild(this.cardsContainer);

    this.interactive = true;

    // 监听事件
    this.bindEvents();
  }

  private bindEvents(): void {
    const m = Main.getMain();

    // 获得防御塔奖励 → 添加卡片
    m.on(QuizEvents.QUIZ_TOWER_EARNED as string, (reward: QuizLevelReward) => {
      this.addTower(reward);
    });

    // 部署成功 → 标记为已部署
    m.on(
      QuizEvents.QUIZ_DEPLOY_TOWER as string,
      (reward: QuizLevelReward) => {
        this.markDeployed(reward);
      }
    );

    // 关卡开始时清空（保留上一关已部署的塔在地图上，但清空库存）
    m.on(EVENT_TYPE.QUIZ_LEVEL_START as string, () => {
      this.clear();
    });
  }

  /**
   * 添加一个防御塔到塔库
   */
  addTower(reward: QuizLevelReward): void {
    const card = this.createTowerCard(reward);
    const entry: TowerEntry = {
      reward,
      deployed: false,
      container: card,
    };

    this.entries.push(entry);
    this.cardsContainer.addChild(card);

    // 重新排列卡片
    this.layoutCards();
    this.drawBackground();

    console.log(
      `[TowerInventory] 添加塔: ${reward.displayName} (${reward.towerName})`
    );
  }

  /**
   * 标记某座塔已部署
   */
  private markDeployed(reward: QuizLevelReward): void {
    const entry = this.entries.find(
      (e) => e.reward.towerName === reward.towerName && !e.deployed
    );
    if (entry) {
      entry.deployed = true;
      // 视觉：降低透明度、添加勾
      entry.container.alpha = 0.4;
      this.addCheckMark(entry.container);
    }
  }

  /**
   * 在已部署的塔卡片上添加勾标记
   */
  private addCheckMark(container: PIXI.Container): void {
    const check = new PIXI.Text("✓", {
      fontFamily: "Consolas, monospace",
      fontSize: 16,
      fontWeight: "bold",
      fill: "#2ecc71",
    });
    check.x = container.width - 16;
    check.y = 2;
    check.name = "checkMark";
    container.addChild(check);
  }

  /**
   * 创建单个塔卡片
   */
  private createTowerCard(reward: QuizLevelReward): PIXI.Container {
    const cardWidth = 90;
    const cardHeight = 56;

    const container = new PIXI.Container();
    container.name = reward.towerName;

    // 卡片背景
    const cardBg = new PIXI.Graphics();
    cardBg.lineStyle(1, 0x533483, 0.8);
    cardBg.beginFill(0x16213e, 0.9);
    cardBg.drawRoundedRect(0, 0, cardWidth, cardHeight, 4);
    cardBg.endFill();
    container.addChild(cardBg);

    // 塔图标（用小矩形 + 文字代替 spine，简化实现）
    const icon = new PIXI.Graphics();
    icon.beginFill(0xe94560, 0.8);
    icon.drawRoundedRect(4, 4, 24, 24, 3);
    icon.endFill();

    // 攻击力符号
    const iconText = new PIXI.Text("⚔", {
      fontFamily: "Arial",
      fontSize: 12,
      fill: "#ffffff",
    });
    iconText.x = 8;
    iconText.y = 7;
    container.addChild(icon);
    container.addChild(iconText);

    // 塔名称
    const nameText = new PIXI.Text(reward.displayName, {
      fontFamily: "Arial, sans-serif",
      fontSize: 10,
      fontWeight: "bold",
      fill: "#e0e0e0",
      wordWrap: true,
      wordWrapWidth: 58,
    });
    nameText.x = 32;
    nameText.y = 4;
    container.addChild(nameText);

    // 属性文本
    const statsText = new PIXI.Text(
      `ATK:${reward.attack} RNG:${reward.range}`,
      {
        fontFamily: "Consolas, monospace",
        fontSize: 8,
        fill: "#aaa",
      }
    );
    statsText.x = 32;
    statsText.y = 30;
    container.addChild(statsText);

    // 攻速
    const spdText = new PIXI.Text(`SPD:${reward.attackSpeed}s`, {
      fontFamily: "Consolas, monospace",
      fontSize: 8,
      fill: "#53a8b6",
    });
    spdText.x = 32;
    spdText.y = 40;
    container.addChild(spdText);

    // 交互：点击卡片进入部署模式
    container.interactive = true;
    container.buttonMode = true;
    container.on("pointerdown", (e: PIXI.InteractionEvent) => {
      e.stopPropagation();
      if (!this.isDeployed(reward)) {
        this.onCardClick(reward);
      }
    });

    // hover 效果
    container.on("pointerover", () => {
      if (!this.isDeployed(reward)) {
        cardBg.clear();
        cardBg.lineStyle(2, 0xff6b81, 1);
        cardBg.beginFill(0x1a2744, 0.95);
        cardBg.drawRoundedRect(0, 0, cardWidth, cardHeight, 4);
        cardBg.endFill();
      }
    });

    container.on("pointerout", () => {
      if (!this.isDeployed(reward)) {
        cardBg.clear();
        cardBg.lineStyle(1, 0x533483, 0.8);
        cardBg.beginFill(0x16213e, 0.9);
        cardBg.drawRoundedRect(0, 0, cardWidth, cardHeight, 4);
        cardBg.endFill();
      }
    });

    return container;
  }

  /**
   * 检查塔是否已部署
   */
  private isDeployed(reward: QuizLevelReward): boolean {
    const entry = this.entries.find(
      (e) => e.reward.towerName === reward.towerName
    );
    return entry?.deployed ?? false;
  }

  /**
   * 卡片点击 — 触发部署
   */
  private onCardClick(reward: QuizLevelReward): void {
    if (this.onDeployRequest) {
      this.onDeployRequest(reward);
    }
  }

  /**
   * 是否有未部署的塔
   */
  hasUndeployedTowers(): boolean {
    return this.entries.some((e) => !e.deployed);
  }

  /**
   * 清空塔库（关卡切换时）
   */
  clear(): void {
    this.entries.forEach((entry) => {
      this.cardsContainer.removeChild(entry.container);
      entry.container.destroy({ children: true });
    });
    this.entries = [];
    this.layoutCards();
    this.drawBackground();
  }

  /**
   * 重新排列卡片
   */
  private layoutCards(): void {
    const cardWidth = 90;
    const gap = 6;
    const padding = 8;
    let xOffset = padding;

    for (const entry of this.entries) {
      entry.container.x = xOffset;
      entry.container.y = 0;
      xOffset += cardWidth + gap;
    }
  }

  /**
   * 绘制背景
   */
  private drawBackground(): void {
    this.bg.clear();

    const cardWidth = 90;
    const gap = 6;
    const padding = 8;
    const cardHeight = 56;
    const count = this.entries.length;

    if (count === 0) {
      this.bg.visible = false;
      this.cardsContainer.visible = false;
      return;
    }

    this.bg.visible = true;
    this.cardsContainer.visible = true;

    const totalWidth = padding * 2 + count * cardWidth + (count - 1) * gap;
    const totalHeight = cardHeight + 4;

    this.bg.lineStyle(1, 0x533483, 0.6);
    this.bg.beginFill(0x0d1117, 0.85);
    this.bg.drawRoundedRect(0, 0, totalWidth, totalHeight, 6);
    this.bg.endFill();

    // 设置容器尺寸标识
    (this as any)._totalWidth = totalWidth;
    (this as any)._totalHeight = totalHeight;
  }

  /**
   * 每帧定位更新 — 游戏画面底部居中
   */
  logicOperation(_frameTime: number): void {
    const m = Main.getMain();
    const sc = m.getNowScene();
    if (!sc) return;

    const sbRect = sc.getSbRect();
    if (!sbRect) return;

    const totalWidth = (this as any)._totalWidth || 0;
    const totalHeight = (this as any)._totalHeight || 0;

    if (totalWidth === 0) {
      this.visible = false;
      return;
    }

    this.visible = true;

    // 底部居中，在 TowerSelect 上方
    const towerSelectHeight = 60; // TowerSelect 大约高度
    this.x = (sbRect.width - totalWidth) / 2;
    this.y = sbRect.height - totalHeight - towerSelectHeight - 10;
  }

  /**
   * 静态工厂方法 — 遵循项目 UI 组件模式
   */
  static _updateCreate(): TowerInventory {
    // TowerInventory 由 QuizGameManager 管理生命周期，不使用 Main UI mount 系统
    // 此方法保留以符合项目约定
    return new TowerInventory();
  }
}

export default TowerInventory;
