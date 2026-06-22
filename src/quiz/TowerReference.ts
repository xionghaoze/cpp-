/**
 * TowerReference — 防御塔 × C++ 代码参考面板
 * 在游戏画面右上角显示半透明参考卡片，讲解每个防御塔及其对应的 C++ 写法
 */
import Main from "../core/main";

/** 塔的参考信息 */
interface TowerRefEntry {
  /** 塔的创建 ID */
  role: string;
  /** 塔的显示名称 */
  displayName: string;
  /** 分类标签 */
  tag: string;
  /** 获取条件说明 */
  howToGet: string;
  /** C++ 代码示例 */
  codeExample: string;
}

/** 所有可用的防御塔参考数据 — 与quizLevels题库对应 */
const TOWER_REFS: TowerRefEntry[] = [
  {
    role: "pys_cook",
    displayName: "基础防御塔",
    tag: "第1关",
    howToGet: "定义 class Tower 及构造函数",
    codeExample: 'class Tower {\npublic:\n  int attack_;\n  Tower(int attack) {\n    attack_ = attack;\n  }\n};',
  },
  {
    role: "pys_soldier",
    displayName: "超级防御塔",
    tag: "第2关",
    howToGet: "公有继承 class SuperTower : public Tower",
    codeExample: 'class SuperTower : public Tower {\npublic:\n  SuperTower(int a) : Tower(a) {}\n};',
  },
  {
    role: "pys_policewoman",
    displayName: "狂暴防御塔",
    tag: "第3关",
    howToGet: "定义 upgradeAttack() 成员函数",
    codeExample: 'void upgradeAttack() {\n  attack_ = attack_ * 2;\n}',
  },
  {
    role: "pys_nurse",
    displayName: "全能防御塔",
    tag: "第4关",
    howToGet: "定义 upgrade(string, int) 参数化函数",
    codeExample: 'void upgrade(string attr, int value) {\n  if (attr == "attack")\n    attack_ += value;\n}',
  },
  {
    role: "pys_nun",
    displayName: "终极防御塔",
    tag: "第5关",
    howToGet: "使用 for 循环批量升级",
    codeExample: 'for (int i = 0; i < 3; i++) {\n  t.upgrade("attack", 10);\n}',
  },
];

/** 升级参考信息 */
const UPGRADE_REFS = [
  {
    title: "攻击力强化",
    code: "t.attack_ += 10;",
    effect: "选中塔攻击力 +10",
  },
  {
    title: "攻速提升",
    code: "t.fireInterval_ -= 0.2;",
    effect: "选中塔攻速加快",
  },
  {
    title: "攻击力翻倍",
    code: "t.attack_ = t.attack_ * 2;",
    effect: "选中塔攻击力翻倍",
  },
  {
    title: "for 循环批量升级",
    code: "for (int i = 0; i < 5; i++) {\n  t.upgrade(\"attack\", 10);\n}",
    effect: "选中塔攻击力 +50",
  },
];

class TowerReference {
  private container: HTMLElement | null = null;
  private isVisible: boolean = true;

  constructor() {
    this.createPanel();
  }

  /**
   * 创建参考面板 DOM
   */
  private createPanel(): void {
    const mouted = document.getElementById("mouted");
    if (!mouted) {
      console.warn("[TowerReference] 未找到 #mouted");
      return;
    }

    // 容器
    this.container = document.createElement("div");
    this.container.id = "tower-reference";
    this.container.style.cssText =
      "position:absolute;top:8px;right:8px;width:260px;max-height:calc(100% - 16px);" +
      "background:rgba(22,33,62,0.92);border:1px solid rgba(83,72,131,0.5);" +
      "border-radius:6px;padding:0;overflow-y:auto;z-index:100;" +
      "font-family:'Segoe UI','Microsoft YaHei',sans-serif;color:#e0e0e0;" +
      "font-size:12px;backdrop-filter:blur(4px);box-shadow:0 4px 16px rgba(0,0,0,0.5);";

    // 标题栏
    const header = document.createElement("div");
    header.style.cssText =
      "padding:10px 12px;background:rgba(233,69,96,0.15);" +
      "border-bottom:1px solid rgba(83,72,131,0.3);" +
      "display:flex;justify-content:space-between;align-items:center;cursor:pointer;";
    header.innerHTML =
      '<span style="font-weight:bold;font-size:13px;color:#e94560;">📖 防御塔 × C++ 参考</span>' +
      '<span id="ref-toggle" style="font-size:16px;color:#aaa;cursor:pointer;">−</span>';
    header.onclick = () => this.toggle();
    this.container.appendChild(header);

    // 内容区
    const content = document.createElement("div");
    content.id = "ref-content";
    content.style.cssText = "padding:8px 12px;";

    // === 防御塔获取 ===
    content.appendChild(this.makeSectionTitle("🏰 获取防御塔"));

    for (const ref of TOWER_REFS) {
      content.appendChild(this.makeTowerCard(ref));
    }

    // === 升级方法 ===
    content.appendChild(this.makeSectionTitle("⬆️ 升级防御塔"));

    for (const ref of UPGRADE_REFS) {
      content.appendChild(this.makeUpgradeCard(ref));
    }

    // === 提示 ===
    const tips = document.createElement("div");
    tips.style.cssText =
      "margin-top:8px;padding:6px 8px;background:rgba(243,156,18,0.1);" +
      "border:1px solid rgba(243,156,18,0.2);border-radius:4px;" +
      "font-size:11px;color:#f39c12;line-height:1.5;";
    tips.innerHTML =
      "💡 <b>提示：</b>在左侧面板中输入对应 C++ 代码，<br>" +
      "提交正确即可自动生成/升级防御塔。<br>" +
      "不能手动操作游戏画面。";
    content.appendChild(tips);

    this.container.appendChild(content);
    mouted.appendChild(this.container);
  }

  /**
   * 创建分区标题
   */
  private makeSectionTitle(text: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText =
      "margin:8px 0 6px;padding-bottom:4px;font-size:12px;font-weight:bold;" +
      "color:#53a8b6;border-bottom:1px solid rgba(83,72,131,0.2);";
    el.textContent = text;
    return el;
  }

  /**
   * 创建单个塔的卡片
   */
  private makeTowerCard(ref: TowerRefEntry): HTMLElement {
    const card = document.createElement("div");
    card.style.cssText =
      "margin-bottom:6px;padding:6px 8px;background:rgba(15,52,96,0.4);" +
      "border-radius:4px;border:1px solid rgba(83,72,131,0.2);";

    const tagColors: Record<string, string> = {
      "基础": "#2ecc71",
      "中级": "#3498db",
      "高级": "#e94560",
      "特殊": "#f39c12",
    };

    const tag = document.createElement("span");
    tag.style.cssText =
      `display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;` +
      `background:${tagColors[ref.tag] || "#888"};color:#fff;margin-right:6px;`;
    tag.textContent = ref.tag;

    const name = document.createElement("span");
    name.style.cssText = "font-weight:bold;font-size:12px;";
    name.textContent = ref.displayName;

    const how = document.createElement("div");
    how.style.cssText = "font-size:11px;color:#aaa;margin-top:3px;";
    how.textContent = "📝 " + ref.howToGet;

    const code = document.createElement("pre");
    code.style.cssText =
      "margin:4px 0 0;padding:4px 6px;background:#0d1117;border-radius:3px;" +
      "font:11px 'Consolas','Courier New',monospace;color:#c9d1d9;" +
      "border:1px solid #30363d;white-space:pre-wrap;word-break:break-all;";
    code.textContent = ref.codeExample;

    card.appendChild(tag);
    card.appendChild(name);
    card.appendChild(how);
    card.appendChild(code);
    return card;
  }

  /**
   * 创建升级卡片
   */
  private makeUpgradeCard(ref: { title: string; code: string; effect: string }): HTMLElement {
    const card = document.createElement("div");
    card.style.cssText =
      "margin-bottom:6px;padding:6px 8px;background:rgba(15,52,96,0.4);" +
      "border-radius:4px;border:1px solid rgba(83,72,131,0.2);";

    const title = document.createElement("div");
    title.style.cssText = "font-weight:bold;font-size:12px;color:#FFD700;";
    title.textContent = ref.title;

    const effect = document.createElement("div");
    effect.style.cssText = "font-size:11px;color:#aaa;margin-top:2px;";
    effect.textContent = "✨ " + ref.effect;

    const code = document.createElement("pre");
    code.style.cssText =
      "margin:4px 0 0;padding:4px 6px;background:#0d1117;border-radius:3px;" +
      "font:11px 'Consolas','Courier New',monospace;color:#c9d1d9;" +
      "border:1px solid #30363d;white-space:pre-wrap;word-break:break-all;";
    code.textContent = ref.code;

    card.appendChild(title);
    card.appendChild(effect);
    card.appendChild(code);
    return card;
  }

  /**
   * 折叠/展开
   */
  private toggle(): void {
    this.isVisible = !this.isVisible;
    const content = document.getElementById("ref-content");
    const toggleBtn = document.getElementById("ref-toggle");
    if (content) {
      content.style.display = this.isVisible ? "block" : "none";
    }
    if (toggleBtn) {
      toggleBtn.textContent = this.isVisible ? "−" : "+";
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }
}

export default TowerReference;
