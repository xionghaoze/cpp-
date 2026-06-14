/**
 * WaveButton — "开始出怪"按钮 UI（Pixi.js）
 *
 * 状态机：
 *   QUIZ_ACTIVE   → 答题中，灰色不可点击，"请先完成答题"
 *   READY         → 可出怪，红色脉冲，"开始出怪"
 *   COMBAT_ACTIVE → 战斗中，暗红色，"Wave X/N · 剩余 Y"
 *   ALL_COMPLETE  → 关卡完成，金色，"进入下一关"
 */
import * as PIXI from "pixi.js";
import Main from "../core/main";
import { QuizEvents } from "../quiz/QuizEngine";
import { EVENT_TYPE } from "../utils/enum";

/** 按钮状态枚举 */
export enum WaveButtonState {
  /** 答题中 — 不可点击 */
  QUIZ_ACTIVE = "quiz_active",
  /** 可出怪 — 点击开始 */
  READY = "ready",
  /** 战斗中 — 不可点击 */
  COMBAT_ACTIVE = "combat_active",
  /** 全部波次完成 — 进入下一关 */
  ALL_COMPLETE = "all_complete",
}

class WaveButton extends PIXI.Container {
  /** 当前状态 */
  private state: WaveButtonState = WaveButtonState.QUIZ_ACTIVE;

  /** 背景图形 */
  private bg: PIXI.Graphics;
  /** 文本 */
  private label: PIXI.Text;
  /** 子标题 */
  private subLabel: PIXI.Text | null = null;
  /** 脉冲动画计时器 */
  private pulseTimer: number = 0;
  /** 是否可见 */
  visible2: boolean = true;

  /** 当前波次 (1 起始) */
  private currentWave: number = 0;
  /** 总波次数 */
  private totalWaves: number = 0;
  /** 剩余敌人 */
  private enemiesRemaining: number = 0;

  constructor() {
    super();
    this.name = "waveButton";

    // 背景
    this.bg = new PIXI.Graphics();
    this.addChild(this.bg);

    // 主文本
    this.label = new PIXI.Text("开始出怪", {
      fontFamily: "Arial, sans-serif",
      fontSize: 14,
      fontWeight: "bold",
      fill: "#ffffff",
      align: "center",
    });
    this.label.anchor.set(0.5);
    this.addChild(this.label);

    this.interactive = true;
    this.buttonMode = true;
    this.on("pointerdown", (e: PIXI.InteractionEvent) => {
      e.stopPropagation();
      this.onClick();
    });

    // 默认 QUIZ_ACTIVE 状态
    this.updateVisuals();

    // 监听事件
    this.bindEvents();
  }

  private bindEvents(): void {
    const m = Main.getMain();

    // 关卡开始 → 重置为 QUIZ_ACTIVE
    m.on(EVENT_TYPE.QUIZ_LEVEL_START as string, () => {
      this.setState(WaveButtonState.QUIZ_ACTIVE);
    });

    // 关卡完成 → 切换到 READY
    m.on(EVENT_TYPE.QUIZ_LEVEL_COMPLETE as string, () => {
      this.setState(WaveButtonState.READY);
    });

    // 波次开始 → 切换到 COMBAT_ACTIVE
    m.on(QuizEvents.QUIZ_WAVE_START as string, () => {
      this.setState(WaveButtonState.COMBAT_ACTIVE);
    });

    // 波次全部完成 → 切换到 ALL_COMPLETE
    m.on(EVENT_TYPE.QUIZ_WAVE_ALL_COMPLETE as string, () => {
      this.setState(WaveButtonState.ALL_COMPLETE);
    });
  }

  /**
   * 设置波次信息（战斗中使用）
   */
  setWaveInfo(current: number, total: number, enemiesRemaining: number): void {
    this.currentWave = current;
    this.totalWaves = total;
    this.enemiesRemaining = enemiesRemaining;
    this.updateVisuals();
  }

  /**
   * 设置按钮状态
   */
  setState(newState: WaveButtonState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.updateVisuals();
  }

  /**
   * 获取当前状态
   */
  getState(): WaveButtonState {
    return this.state;
  }

  /**
   * 更新视觉
   */
  private updateVisuals(): void {
    const btnWidth = 140;
    const btnHeight = 44;

    this.bg.clear();

    switch (this.state) {
      case WaveButtonState.QUIZ_ACTIVE:
        // 灰色，不可点击
        this.bg.lineStyle(1, 0x555555, 0.7);
        this.bg.beginFill(0x333333, 0.8);
        this.bg.drawRoundedRect(0, 0, btnWidth, btnHeight, 8);
        this.bg.endFill();
        this.label.text = "📝 答题中...";
        this.label.style.fill = "#888888";
        this.interactive = false;
        this.buttonMode = false;
        this.hideSubLabel();
        break;

      case WaveButtonState.READY:
        // 红色脉冲，可点击
        this.bg.lineStyle(2, 0xff6b81, 0.9);
        this.bg.beginFill(0xe94560, 0.9);
        this.bg.drawRoundedRect(0, 0, btnWidth, btnHeight, 8);
        this.bg.endFill();
        this.label.text = "⚔ 开始出怪";
        this.label.style.fill = "#ffffff";
        this.interactive = true;
        this.buttonMode = true;
        this.showSubLabel("部署塔后可开始");
        break;

      case WaveButtonState.COMBAT_ACTIVE:
        // 暗红色，不可点击
        this.bg.lineStyle(1, 0x8b0000, 0.7);
        this.bg.beginFill(0x4a0000, 0.85);
        this.bg.drawRoundedRect(0, 0, btnWidth, btnHeight, 8);
        this.bg.endFill();
        this.label.text = "⚡ 战斗中...";
        this.label.style.fill = "#ff4444";
        this.interactive = false;
        this.buttonMode = false;
        this.showSubLabel(
          `波次 ${this.currentWave}/${this.totalWaves} · 剩余 ${this.enemiesRemaining}`
        );
        break;

      case WaveButtonState.ALL_COMPLETE:
        // 金色，可点击
        this.bg.lineStyle(2, 0xffd700, 0.9);
        this.bg.beginFill(0xb8860b, 0.9);
        this.bg.drawRoundedRect(0, 0, btnWidth, btnHeight, 8);
        this.bg.endFill();
        this.label.text = "🏆 进入下一关";
        this.label.style.fill = "#ffd700";
        this.interactive = true;
        this.buttonMode = true;
        this.showSubLabel("波次已全部清除！");
        break;
    }

    // 文本居中
    this.label.x = btnWidth / 2;
    this.label.y = btnHeight / 2 - (this.subLabel ? 6 : 0);
  }

  private showSubLabel(text: string): void {
    if (!this.subLabel) {
      this.subLabel = new PIXI.Text("", {
        fontFamily: "Arial, sans-serif",
        fontSize: 10,
        fill: "#aaa",
        align: "center",
      });
      this.subLabel.anchor.set(0.5);
      this.addChild(this.subLabel);
    }
    this.subLabel.text = text;
    this.subLabel.x = 70; // btnWidth / 2
    this.subLabel.y = 36;
    this.subLabel.visible = true;
  }

  private hideSubLabel(): void {
    if (this.subLabel) {
      this.subLabel.visible = false;
    }
  }

  /**
   * 点击处理
   */
  private onClick(): void {
    const m = Main.getMain();

    switch (this.state) {
      case WaveButtonState.READY: {
        // 发送波次开始事件
        m.sendMessage(QuizEvents.QUIZ_WAVE_START as string);
        console.log("[WaveButton] 触发开始出怪");
        break;
      }
      case WaveButtonState.ALL_COMPLETE: {
        // 进入下一关
        m.sendMessage(EVENT_TYPE.QUIZ_WAVE_ALL_COMPLETE as string);
        console.log("[WaveButton] 触发进入下一关");
        // 重置为答题模式
        this.setState(WaveButtonState.QUIZ_ACTIVE);
        break;
      }
      case WaveButtonState.QUIZ_ACTIVE:
      case WaveButtonState.COMBAT_ACTIVE:
      default:
        // 不可点击 — 静默忽略
        break;
    }
  }

  /**
   * 每帧更新
   */
  logicOperation(frameTime: number): void {
    const m = Main.getMain();
    const sc = m.getNowScene();
    if (!sc) return;

    const sbRect = sc.getSbRect();
    if (!sbRect) return;

    // 右上角定位
    const marginX = 12;
    const marginY = 12;
    this.x = sbRect.width - 140 - marginX; // btnWidth = 140
    this.y = marginY;

    // READY 状态脉冲动画
    if (this.state === WaveButtonState.READY) {
      this.pulseTimer += frameTime;
      const scale =
        1.0 + Math.sin(this.pulseTimer * 3) * 0.03;
      this.scale.set(scale);
    } else {
      this.scale.set(1.0);
    }
  }

  /**
   * 静态工厂方法 — 遵循项目 UI 组件模式
   */
  static _updateCreate(): WaveButton {
    return new WaveButton();
  }
}

export default WaveButton;
export { WaveButton };
