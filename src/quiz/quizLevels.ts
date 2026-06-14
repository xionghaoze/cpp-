/**
 * C++ 答题关卡配置
 * 5 个关卡，由浅入深：构造函数 → 继承 → 成员函数 → 参数化函数 → 循环
 * 每关包含题目、验证规则、参考代码、奖励塔、敌人波次配置
 */
import { ValidationRule, Rules } from "./validators/index";

/** 奖励防御塔的定义 */
export interface QuizLevelReward {
  /** 游戏内塔的创建名称 (role name) */
  towerName: string;
  /** 展示名称 */
  displayName: string;
  /** 攻击力 */
  attack: number;
  /** 射程 */
  range: number;
  /** 攻击速度 (秒/次，越小越快) */
  attackSpeed: number;
  /** 描述 */
  description: string;
}

/** 敌人波次配置 */
export interface QuizLevelWave {
  /** 敌人角色名 */
  enemyName: string;
  /** 敌人数量 */
  count: number;
  /** 敌人血量 */
  hp: number;
  /** 敌人速度 */
  speed: number;
  /** 波次开始倒计时（秒） */
  createTime: number;
}

/** 单道题目 */
export interface QuizLevelQuestion {
  /** 题目 ID */
  id: string;
  /** 题目标题 */
  title: string;
  /** 题目描述（支持 HTML） */
  description: string;
  /** 可选提示 */
  hint: string;
  /** 参考代码（点击"查看参考代码"时填充） */
  referenceCode: string;
  /** 预填代码 */
  starterCode: string;
  /** 验证规则 */
  validationRules: ValidationRule[];
  /** 答对后获得的奖励塔索引（对应 level.rewards[]） */
  rewardIndex: number;
}

/** 关卡定义 */
export interface QuizLevel {
  /** 关卡 ID (1-5) */
  id: number;
  /** 关卡名称 */
  name: string;
  /** 关卡描述 */
  description: string;
  /** 题目列表 */
  questions: QuizLevelQuestion[];
  /** 该关卡可获得的奖励塔列表 */
  rewards: QuizLevelReward[];
  /** 敌人波次配置 */
  enemyWaves: QuizLevelWave[];
}

// ============================================================
//  5 个关卡定义
// ============================================================

export const quizLevels: QuizLevel[] = [
  // ==================== 第一关：类的构造函数 ====================
  {
    id: 1,
    name: "第一关：基础防御塔",
    description:
      "学习 C++ 类的构造函数，定义一个 Tower 类并获得你的第一座防御塔。",
    rewards: [
      {
        towerName: "pys_cook",
        displayName: "基础防御塔",
        attack: 20,
        range: 100,
        attackSpeed: 1.0,
        description: "基础防御塔 — 通过构造函数定义获得",
      },
    ],
    questions: [
      {
        id: "L1Q1",
        title: "定义一个 Tower 类的构造函数",
        description: `
          <p>请定义一个 <code>class Tower</code>，要求：</p>
          <ol>
            <li>类名为 <strong>Tower</strong></li>
            <li>包含一个 <strong>构造函数</strong>，接受 <code>int attack</code> 参数</li>
            <li>在构造函数中把参数 <code>attack</code> 赋值给成员变量 <code>attack_</code></li>
          </ol>
          <p style="color:#aaa;font-size:12px;margin-top:8px;">
            💡 提示：C++ 类定义格式为<br/>
            <code>class 类名 { public: 类名(参数) { ... } };</code>
          </p>
        `,
        hint: "构造函数名必须与类名相同，参数列表在括号中，函数体用 { } 包裹。",
        referenceCode: `class Tower {
public:
    int attack_;
    Tower(int attack) {
        attack_ = attack;
    }
};`,
        starterCode: "",
        validationRules: [
          Rules.contains("class", "需要包含 class 关键字"),
          Rules.contains("Tower", '类名应为 "Tower"'),
          Rules.pattern(
            /Tower\s*\(/,
            "需要定义构造函数 Tower(...)"
          ),
          Rules.contains("attack", "构造函数参数名应为 attack"),
          Rules.contains("attack_", "成员变量名应为 attack_"),
          Rules.contains("=", "需要在构造函数中赋值"),
          Rules.pattern(
            /class\s+Tower\s*\{/,
            "类定义格式不正确，应为 class Tower { ... }"
          ),
          Rules.contains("public", "建议使用 public 访问控制"),
          Rules.contains("{", "需要包含函数体的大括号 { }"),
          Rules.contains("}", "需要包含类结束的大括号 }"),
        ],
        rewardIndex: 0,
      },
    ],
    enemyWaves: [
      {
        enemyName: "enemy_basic",
        count: 5,
        hp: 50,
        speed: 1.0,
        createTime: 3,
      },
    ],
  },

  // ==================== 第二关：公有继承 ====================
  {
    id: 2,
    name: "第二关：超级防御塔",
    description:
      "学习 C++ 公有继承，定义一个 SuperTower 类继承自 Tower。",
    rewards: [
      {
        towerName: "pys_soldier",
        displayName: "超级防御塔",
        attack: 40,
        range: 120,
        attackSpeed: 0.8,
        description: "超级防御塔 — 通过公有继承获得",
      },
    ],
    questions: [
      {
        id: "L2Q1",
        title: "公有继承自 Tower 类",
        description: `
          <p>定义一个类 <code>SuperTower</code>，要求：</p>
          <ol>
            <li>类名为 <strong>SuperTower</strong></li>
            <li><strong>公有继承</strong>自 <code>Tower</code> 类</li>
            <li>类体可以为空（不需要额外成员）</li>
          </ol>
          <p style="color:#aaa;font-size:12px;margin-top:8px;">
            💡 提示：C++ 公有继承格式为<br/>
            <code>class 子类名 : public 父类名 { };</code>
          </p>
        `,
        hint: "使用 public 关键字放在父类名前面，表示公有继承。",
        referenceCode: `class SuperTower : public Tower {
public:
    SuperTower(int attack) : Tower(attack) {}
};`,
        starterCode: "",
        validationRules: [
          Rules.contains("class", "需要包含 class 关键字"),
          Rules.contains("SuperTower", '类名应为 "SuperTower"'),
          Rules.contains("public", "需要使用 public 继承方式"),
          Rules.contains("Tower", "需要继承自 Tower 类"),
          Rules.pattern(
            /:\s*public\s+Tower/,
            "继承语法不正确，应为 : public Tower"
          ),
          Rules.contains("{", "需要包含类体的大括号"),
          Rules.contains("}", "需要包含类结束的大括号"),
        ],
        rewardIndex: 0,
      },
    ],
    enemyWaves: [
      {
        enemyName: "enemy_medium",
        count: 8,
        hp: 80,
        speed: 1.3,
        createTime: 4,
      },
    ],
  },

  // ==================== 第三关：成员函数升级攻击力 ====================
  {
    id: 3,
    name: "第三关：狂暴防御塔",
    description:
      "学习 C++ 成员函数，为 Tower 类添加 upgradeAttack() 方法来翻倍攻击力。",
    rewards: [
      {
        towerName: "pys_policewoman",
        displayName: "狂暴防御塔",
        attack: 50,
        range: 90,
        attackSpeed: 1.5,
        description: "狂暴防御塔 — 通过定义升级函数获得",
      },
    ],
    questions: [
      {
        id: "L3Q1",
        title: "定义 upgradeAttack() 成员函数",
        description: `
          <p>在 <code>Tower</code> 类中设计一个成员函数 <code>upgradeAttack()</code>，要求：</p>
          <ol>
            <li>函数名为 <strong>upgradeAttack</strong></li>
            <li>返回类型为 <strong>void</strong></li>
            <li>调用后，成员变量 <code>attack_</code> 的值<strong>翻倍</strong>（乘以 2）</li>
          </ol>
          <p style="color:#aaa;font-size:12px;margin-top:8px;">
            💡 提示：<code>void upgradeAttack() { attack_ = attack_ * 2; }</code>
          </p>
        `,
        hint: "函数定义格式：返回类型 函数名() { 函数体 }。翻倍可以用 *= 2 或 = attack_ * 2。",
        referenceCode: `class Tower {
public:
    int attack_;
    Tower(int attack) { attack_ = attack; }
    void upgradeAttack() {
        attack_ = attack_ * 2;
    }
};`,
        starterCode: "",
        validationRules: [
          Rules.contains("void", "返回类型应为 void"),
          Rules.contains("upgradeAttack", '函数名应为 "upgradeAttack"'),
          Rules.contains("attack_", "需要使用成员变量 attack_"),
          Rules.pattern(
            /attack_\s*\*\s*2|attack_\s*=\s*attack_\s*\*\s*2|attack_\s*\*=\s*2/,
            "需要将 attack_ 翻倍（乘以 2）"
          ),
          Rules.contains("{", "需要包含函数体大括号"),
          Rules.contains("}", "需要包含函数结束大括号"),
        ],
        rewardIndex: 0,
      },
    ],
    enemyWaves: [
      {
        enemyName: "enemy_fast",
        count: 10,
        hp: 100,
        speed: 1.8,
        createTime: 5,
      },
    ],
  },

  // ==================== 第四关：参数化升级函数 ====================
  {
    id: 4,
    name: "第四关：全能防御塔",
    description:
      "学习带参数的成员函数，设计 upgrade(attr, value) 根据属性名修改不同属性。",
    rewards: [
      {
        towerName: "pys_nurse",
        displayName: "全能防御塔",
        attack: 35,
        range: 130,
        attackSpeed: 1.2,
        description: "全能防御塔 — 通过参数化函数获得（附带治疗特效）",
      },
    ],
    questions: [
      {
        id: "L4Q1",
        title: "设计参数化升级函数",
        description: `
          <p>在 <code>Tower</code> 类中设计一个升级函数 <code>upgrade(string attr, int value)</code>，要求：</p>
          <ol>
            <li>函数名 <strong>upgrade</strong>，接受两个参数：<code>string attr</code> 和 <code>int value</code></li>
            <li>使用 <strong>if 判断</strong>，根据 <code>attr</code> 的值修改不同属性：
              <ul>
                <li>若 attr 为 <code>"attack"</code>，则将 <code>attack_</code> 增加 value</li>
                <li>若 attr 为 <code>"range"</code>，则将 <code>range_</code> 增加 value</li>
              </ul>
            </li>
          </ol>
          <p style="color:#aaa;font-size:12px;margin-top:8px;">
            💡 提示：用 <code>if (attr == "attack") { ... }</code> 来判断属性名。
          </p>
        `,
        hint: "参数类型为 string 和 int。使用 == 比较字符串。注意双引号表示字符串。",
        referenceCode: `class Tower {
public:
    int attack_;
    int range_;
    Tower(int attack, int range) {
        attack_ = attack;
        range_ = range;
    }
    void upgrade(string attr, int value) {
        if (attr == "attack") {
            attack_ += value;
        } else if (attr == "range") {
            range_ += value;
        }
    }
};`,
        starterCode: "",
        validationRules: [
          Rules.contains("upgrade", '函数名应为 "upgrade"'),
          Rules.contains("string", "需要包含 string 类型参数"),
          Rules.contains("int", "需要包含 int 类型参数"),
          Rules.contains("attr", '参数名应为 "attr"'),
          Rules.contains("value", '参数名应为 "value"'),
          Rules.contains("if", "需要使用 if 条件判断"),
          Rules.contains("attack", '需要处理 "attack" 属性'),
          Rules.contains("range", '需要处理 "range" 属性'),
          Rules.contains("{", "需要包含函数体大括号"),
          Rules.contains("}", "需要包含函数结束大括号"),
        ],
        rewardIndex: 0,
      },
    ],
    enemyWaves: [
      {
        enemyName: "enemy_armored",
        count: 12,
        hp: 120,
        speed: 1.5,
        createTime: 5,
      },
    ],
  },

  // ==================== 第五关：循环批量升级 ====================
  {
    id: 5,
    name: "第五关：终极防御塔",
    description:
      "学习 for 循环，批量调用 upgrade 函数来打造最强防御塔。",
    rewards: [
      {
        towerName: "pys_nun",
        displayName: "终极防御塔",
        attack: 80,
        range: 150,
        attackSpeed: 0.6,
        description: "终极防御塔 — 通过循环升级获得",
      },
    ],
    questions: [
      {
        id: "L5Q1",
        title: "使用 for 循环批量升级攻击力",
        description: `
          <p>假设已经有一个 <code>Tower</code> 对象 <code>t</code>，请编写代码：</p>
          <ol>
            <li>使用 <strong>for 循环</strong>，循环 <strong>3 次</strong></li>
            <li>每次循环调用 <code>t.upgrade("attack", 10)</code></li>
            <li>最终使攻击力增加 30</li>
          </ol>
          <p style="color:#aaa;font-size:12px;margin-top:8px;">
            💡 提示：<code>for(int i = 0; i &lt; 3; i++) { t.upgrade("attack", 10); }</code>
          </p>
        `,
        hint: "for 循环三要素：初始化(i=0)、条件(i<3)、增量(i++)。循环体用 { } 包裹。",
        referenceCode: `for (int i = 0; i < 3; i++) {
    t.upgrade("attack", 10);
}`,
        starterCode: "",
        validationRules: [
          Rules.contains("for", "需要包含 for 关键字"),
          Rules.pattern(/for\s*\(/, "for 循环括号语法不正确"),
          Rules.contains("3", "循环次数应为 3"),
          Rules.contains("upgrade", '需要调用 upgrade 函数'),
          Rules.contains("attack", '需要升级 "attack" 属性'),
          Rules.contains("10", "每次增加的攻击力应为 10"),
          Rules.contains("{", "需要包含循环体大括号"),
          Rules.contains("}", "需要包含循环体结束大括号"),
        ],
        rewardIndex: 0,
      },
    ],
    enemyWaves: [
      {
        enemyName: "enemy_boss",
        count: 15,
        hp: 200,
        speed: 1.0,
        createTime: 6,
      },
    ],
  },
];
