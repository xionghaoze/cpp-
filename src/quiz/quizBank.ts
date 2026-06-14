/**
 * C++ 答题题库
 * 每道题包含：ID、类型、题干、验证规则、成功时的游戏行为
 */
import { ValidationRule, Rules } from "./validators/index";

/** 答题成功后的游戏行为类型 */
export type QuizActionType =
  | "spawnTower"
  | "upgradeTower"
  | "spawnSpecialTower"
  | "upgradeAllTowers"
  | "goldReward";

/** 题目类型（用于分类统计） */
export type QuestionType =
  | "variable_declaration"
  | "object_construction"
  | "loop_upgrade"
  | "pointer_usage"
  | "inheritance";

export interface QuizQuestion {
  /** 唯一 ID */
  id: string;
  /** 题目类型 */
  type: QuestionType;
  /** 题目标题 */
  title: string;
  /** 题目描述（支持 HTML） */
  description: string;
  /** 预填代码（可选） */
  starterCode?: string;
  /** 验证规则列表 */
  validationRules: ValidationRule[];
  /** 成功时的游戏行为 */
  onSuccess: {
    action: QuizActionType;
    /** 要创建的塔名称（spawn 类 action 使用） */
    towerName?: string;
    /** 放置策略：随机可用位置 或 固定预设位置 */
    towerPosition?: "random" | "fixed";
    /** 升级目标：最近建造的 或 当前选中的 */
    upgradeTarget?: "latest" | "selected";
    /** 升级次数（loop_upgrade 使用） */
    upgradeTimes?: number;
    /** 奖励金币 */
    goldReward?: number;
  };
}

/**
 * 全部题目
 */
export const quizBank: QuizQuestion[] = [
  // ===== 题型 1: 变量声明 =====
  {
    id: "q001",
    type: "variable_declaration",
    title: "声明一个防御塔等级变量",
    description: `
      <p>声明一个 <code>int</code> 类型的变量 <code>towerLevel</code>，并将其初始化为 <code>1</code>。</p>
      <p style="color:#aaa;font-size:12px;margin-top:8px;">💡 提示：C++ 中声明整型变量的格式为 <code>int 变量名 = 值;</code></p>
    `,
    starterCode: "",
    validationRules: [
      Rules.contains("int", "请使用 int 类型声明变量"),
      Rules.contains("towerLevel", '变量名应为 "towerLevel"'),
      Rules.contains("=", "需要使用 = 进行初始化赋值"),
      Rules.contains("1", "初始值应为 1"),
      Rules.notContains("float", "请使用 int 而不是 float"),
      Rules.notContains("double", "请使用 int 而不是 double"),
    ],
    onSuccess: {
      action: "spawnTower",
      towerName: "pys_cook",
      towerPosition: "random",
      goldReward: 30,
    },
  },

  // ===== 题型 1 变体: 多变量声明 =====
  {
    id: "q001b",
    type: "variable_declaration",
    title: "声明防御塔属性变量",
    description: `
      <p>声明两个 <code>int</code> 类型变量：<code>damage</code> 初始化为 <code>50</code>，<code>range</code> 初始化为 <code>100</code>。</p>
    `,
    starterCode: "int ",
    validationRules: [
      Rules.contains("int", "请使用 int 类型"),
      Rules.contains("damage", '需要声明 "damage" 变量'),
      Rules.contains("range", '需要声明 "range" 变量'),
      Rules.contains("50", "damage 的初始值应为 50"),
      Rules.contains("100", "range 的初始值应为 100"),
      Rules.contains("=", "需要使用 = 进行初始化"),
    ],
    onSuccess: {
      action: "spawnTower",
      towerName: "pys_policewoman",
      towerPosition: "random",
      goldReward: 40,
    },
  },

  // ===== 题型 2: 对象构造 =====
  {
    id: "q002",
    type: "object_construction",
    title: "创建一个防御塔对象",
    description: `
      <p>使用 <code>new</code> 关键字创建一个 <code>Tower</code> 类的对象，赋值给变量 <code>myTower</code>。</p>
      <p style="color:#aaa;font-size:12px;margin-top:8px;">💡 提示：C++ 中创建对象的格式为 <code>类名* 变量名 = new 类名(参数);</code> 或 <code>类名 变量名(参数);</code></p>
    `,
    starterCode: "",
    validationRules: [
      Rules.contains("Tower", "未找到 Tower 类型"),
      Rules.pattern(/Tower\s*[(*]/, "Tower 的声明格式不正确，需要 Tower 后跟 ( 或 *"),
      Rules.contains("myTower", '变量名应为 "myTower"'),
      Rules.notContains("int Tower", "Tower 不应与 int 混用"),
    ],
    onSuccess: {
      action: "spawnTower",
      towerName: "pys_soldier",
      towerPosition: "random",
      goldReward: 50,
    },
  },

  // ===== 题型 2 变体: 指针方式构造 =====
  {
    id: "q002b",
    type: "object_construction",
    title: "用指针创建防御塔",
    description: `
      <p>使用 <code>new</code> 关键字在堆上创建一个 <code>Tower</code> 对象，并用指针 <code>pTower</code> 指向它。</p>
      <p style="color:#aaa;font-size:12px;margin-top:8px;">💡 提示：格式为 <code>Tower* pTower = new Tower();</code></p>
    `,
    starterCode: "",
    validationRules: [
      Rules.contains("Tower", "未找到 Tower 类型"),
      Rules.contains("*", "需要使用指针语法（*）"),
      Rules.contains("new", "缺少 new 关键字"),
      Rules.contains("pTower", '指针变量名应为 "pTower"'),
    ],
    onSuccess: {
      action: "spawnSpecialTower",
      towerName: "pys_nurse",
      towerPosition: "random",
      goldReward: 60,
    },
  },

  // ===== 题型 3: 循环升级 =====
  {
    id: "q003",
    type: "loop_upgrade",
    title: "循环升级防御塔",
    description: `
      <p>假设有一个 <code>Tower</code> 对象 <code>t</code>，请使用 <code>for</code> 循环让 <code>t</code> 调用 <code>upgrade()</code> 方法 <strong>3 次</strong>。</p>
      <p style="color:#aaa;font-size:12px;margin-top:8px;">💡 提示：<code>for(int i = 0; i &lt; 3; i++) { ... }</code></p>
    `,
    starterCode: "",
    validationRules: [
      Rules.contains("for", "需要包含 for 关键字"),
      Rules.pattern(/for\s*\(/, "for 循环的括号语法不正确，应为 for(...)"),
      Rules.contains("upgrade()", "缺少 upgrade() 调用"),
      Rules.contains("3", "循环次数应为 3 次"),
      Rules.contains("{", "需要包含循环体的大括号 { }"),
    ],
    onSuccess: {
      action: "upgradeTower",
      upgradeTarget: "selected",
      upgradeTimes: 3,
      goldReward: 80,
    },
  },

  // ===== 题型 3 变体: while 循环升级 =====
  {
    id: "q003b",
    type: "loop_upgrade",
    title: "while 循环持续升级",
    description: `
      <p>使用 <code>while</code> 循环，在 <code>level &lt; 5</code> 的条件下，每次循环调用 <code>tower.upgrade()</code>。</p>
      <p style="color:#aaa;font-size:12px;margin-top:8px;">💡 提示：<code>while(条件) { ... }</code></p>
    `,
    starterCode: "",
    validationRules: [
      Rules.contains("while", "需要包含 while 关键字"),
      Rules.pattern(/while\s*\(/, "while 循环的括号语法不正确"),
      Rules.contains("upgrade()", "缺少 upgrade() 调用"),
      Rules.contains("5", "条件中需要包含 5"),
      Rules.contains("level", "条件中需要使用 level 变量"),
    ],
    onSuccess: {
      action: "upgradeTower",
      upgradeTarget: "latest",
      upgradeTimes: 5,
      goldReward: 100,
    },
  },

  // ===== 题型 4: 指针使用 =====
  {
    id: "q004",
    type: "pointer_usage",
    title: "通过指针调用方法",
    description: `
      <p>假设已经有一个 <code>Tower* ptr</code> 指针指向一个防御塔对象。请通过指针调用它的 <code>upgrade()</code> 方法和 <code>attack()</code> 方法。</p>
      <p style="color:#aaa;font-size:12px;margin-top:8px;">💡 提示：指针调用成员使用 <code>-></code> 运算符</p>
    `,
    starterCode: "",
    validationRules: [
      Rules.contains("->upgrade()", '缺少 "->upgrade()" 指针调用'),
      Rules.contains("->attack()", '缺少 "->attack()" 指针调用'),
      Rules.contains("Tower", "需要包含 Tower 类型"),
      Rules.contains("*", "需要包含指针声明符号 *"),
      Rules.contains("ptr", '指针变量名应为 "ptr"'),
    ],
    onSuccess: {
      action: "spawnSpecialTower",
      towerName: "pys_nun",
      towerPosition: "random",
      goldReward: 70,
    },
  },

  // ===== 题型 5: 类继承 =====
  {
    id: "q005",
    type: "inheritance",
    title: "定义一个继承类",
    description: `
      <p>定义一个类 <code>SuperTower</code>，它<strong>公有继承</strong>自 <code>Tower</code> 类。类体可以为空。</p>
      <p style="color:#aaa;font-size:12px;margin-top:8px;">💡 提示：<code>class SuperTower : public Tower { };</code></p>
    `,
    starterCode: "",
    validationRules: [
      Rules.contains("class", "需要包含 class 关键字"),
      Rules.contains("SuperTower", '需要定义 "SuperTower" 类'),
      Rules.contains("public", "需要使用 public 继承方式"),
      Rules.contains("Tower", "需要继承自 Tower 类"),
      Rules.contains("{", "需要包含类体的大括号"),
    ],
    onSuccess: {
      action: "upgradeAllTowers",
      goldReward: 120,
    },
  },

  // ===== 题型 5 变体: 带构造函数的继承 =====
  {
    id: "q005b",
    type: "inheritance",
    title: "定义带构造函数的子类",
    description: `
      <p>定义一个类 <code>FireTower</code>，<strong>公有继承</strong>自 <code>Tower</code>。<br>
      在类内定义一个<strong>构造函数</strong> <code>FireTower(int x, int y)</code>，函数体可以为空。</p>
      <p style="color:#aaa;font-size:12px;margin-top:8px;">💡 提示：构造函数名与类名相同</p>
    `,
    starterCode: "",
    validationRules: [
      Rules.contains("class", "需要包含 class 关键字"),
      Rules.contains("FireTower", '需要定义 "FireTower" 类'),
      Rules.contains("public", "需要使用 public 继承"),
      Rules.contains("Tower", "需要继承自 Tower 类"),
      Rules.contains("FireTower(int", "需要在类内定义构造函数 FireTower(int x, int y)"),
      Rules.contains("x", "构造函数参数需要包含 x"),
      Rules.contains("y", "构造函数参数需要包含 y"),
    ],
    onSuccess: {
      action: "upgradeAllTowers",
      goldReward: 150,
    },
  },
];
