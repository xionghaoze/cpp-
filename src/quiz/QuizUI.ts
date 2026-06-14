/**
 * QuizUI — C++ 答题面板 DOM UI（关卡制增强版）
 * 在 #quiz-sidebar 内构建 HTML 界面，处理用户输入和反馈显示
 * 新增：参考代码按钮、关卡进度显示、关卡完成提示
 */
import Main from "../core/main";
import QuizEngine, { QuizEvents } from "./QuizEngine";
import { QuizLevel, QuizLevelQuestion } from "./quizLevels";

class QuizUI {
  /** 侧边栏容器 */
  private sidebar: HTMLElement;
  /** 关卡进度 */
  private levelProgressEl!: HTMLElement;
  /** 题目标题 */
  private titleEl!: HTMLElement;
  /** 题目描述 */
  private descriptionEl!: HTMLElement;
  /** 代码输入框 */
  private textarea!: HTMLTextAreaElement;
  /** 行号显示 */
  private lineNumbers!: HTMLElement;
  /** 提交按钮 */
  private submitBtn!: HTMLButtonElement;
  /** 参考代码按钮 */
  private hintBtn!: HTMLButtonElement;
  /** 反馈区域 */
  private feedbackEl!: HTMLElement;
  /** 得分显示 */
  private scoreValueEl!: HTMLElement;
  /** 完成数显示 */
  private completeValueEl!: HTMLElement;
  /** 得分容器 */
  private scoreContainer!: HTMLElement;
  /** 关卡完成覆盖层 */
  private levelCompleteOverlay!: HTMLElement;

  /** 题库 */
  private engine: QuizEngine;
  /** 待清理的事件监听 */
  private onDestroy: (() => void)[] = [];
  /** 是否正在冷却中 */
  private cooldown: boolean = false;
  /** 当前关卡信息 */
  private currentLevel: QuizLevel | null = null;

  constructor(engine: QuizEngine) {
    this.engine = engine;
    this.sidebar = document.getElementById("quiz-sidebar")!;
    if (!this.sidebar) {
      console.error(
        "[QuizUI] 未找到 #quiz-sidebar 元素，请检查 HTML 布局"
      );
      return;
    }
    this.sidebar.innerHTML = "";
    this.buildUI();
    this.bindEvents();
    this.bindQuizEvents();
  }

  /**
   * 构建侧边栏 HTML 结构
   */
  private buildUI(): void {
    // 关卡进度
    this.levelProgressEl = document.createElement("div");
    this.levelProgressEl.style.cssText =
      "margin-bottom:8px;font-size:12px;color:#53a8b6;padding:4px 8px;background:rgba(83,72,131,0.2);border-radius:4px;text-align:center;";

    // 标题
    this.titleEl = document.createElement("h2");
    this.titleEl.style.cssText =
      "margin:0 0 8px;font-size:18px;color:#e94560;font-weight:bold;";

    // 得分行
    this.scoreContainer = document.createElement("div");
    this.scoreContainer.style.cssText =
      "margin-bottom:12px;font-size:13px;color:#aaa;";
    this.scoreContainer.innerHTML =
      '得分: <span id="quiz-score-value" style="color:#FFD700;font-weight:bold;">0</span> | 已完成: <span id="quiz-complete-value" style="color:#53a8b6;font-weight:bold;">0</span>';
    this.scoreValueEl =
      this.scoreContainer.querySelector("#quiz-score-value")!;
    this.completeValueEl = this.scoreContainer.querySelector(
      "#quiz-complete-value"
    )!;

    // 题目描述
    this.descriptionEl = document.createElement("div");
    this.descriptionEl.style.cssText =
      "margin-bottom:12px;font-size:14px;line-height:1.6;min-height:60px;color:#e0e0e0;padding:8px;background:rgba(15,52,96,0.5);border-radius:4px;border-left:3px solid #533483;";

    // 代码输入区（带行号）
    const codeArea = document.createElement("div");
    codeArea.style.cssText = "display:flex;margin-bottom:8px;";

    this.lineNumbers = document.createElement("div");
    this.lineNumbers.id = "quiz-line-nums";
    this.lineNumbers.style.cssText =
      "width:32px;background:#16213e;color:#666;font:13px 'Consolas','Courier New',monospace;text-align:right;padding:8px 6px;overflow:hidden;user-select:none;border-radius:4px 0 0 4px;line-height:1.5;border:1px solid #0f3460;border-right:none;";
    this.lineNumbers.textContent = "1";

    this.textarea = document.createElement("textarea");
    this.textarea.id = "quiz-textarea";
    this.textarea.style.cssText =
      "flex:1;height:140px;background:#0d1117;color:#c9d1d9;border:1px solid #0f3460;padding:8px;font:13px 'Consolas','Courier New',monospace;resize:vertical;border-radius:0 4px 4px 0;outline:none;line-height:1.5;";
    this.textarea.placeholder = "在此输入 C++ 代码...";
    this.textarea.spellcheck = false;

    codeArea.appendChild(this.lineNumbers);
    codeArea.appendChild(this.textarea);

    // 按钮区域
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;margin-bottom:8px;";

    // 提交按钮
    this.submitBtn = document.createElement("button");
    this.submitBtn.id = "quiz-submit";
    this.submitBtn.textContent = "提交答案 (Ctrl+Enter)";
    this.submitBtn.style.cssText =
      "flex:2;padding:10px;background:#e94560;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold;transition:background .2s;";
    this.submitBtn.onmouseover = () =>
      (this.submitBtn.style.background = "#ff6b81");
    this.submitBtn.onmouseout = () =>
      (this.submitBtn.style.background = "#e94560");

    // 参考代码按钮
    this.hintBtn = document.createElement("button");
    this.hintBtn.id = "quiz-hint";
    this.hintBtn.textContent = "📖 参考代码";
    this.hintBtn.style.cssText =
      "flex:1;padding:10px;background:#533483;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;transition:background .2s;";
    this.hintBtn.onmouseover = () =>
      (this.hintBtn.style.background = "#6b44a8");
    this.hintBtn.onmouseout = () =>
      (this.hintBtn.style.background = "#533483");

    btnRow.appendChild(this.submitBtn);
    btnRow.appendChild(this.hintBtn);

    // 反馈区域
    this.feedbackEl = document.createElement("div");
    this.feedbackEl.id = "quiz-feedback";
    this.feedbackEl.style.cssText =
      "margin-top:10px;padding:10px;border-radius:4px;font-size:13px;line-height:1.5;display:none;word-break:break-word;";

    // 关卡完成覆盖层（初始隐藏）
    this.levelCompleteOverlay = document.createElement("div");
    this.levelCompleteOverlay.id = "quiz-level-complete";
    this.levelCompleteOverlay.style.cssText =
      "margin-top:12px;padding:12px;background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.4);border-radius:6px;color:#2ecc71;text-align:center;font-size:14px;display:none;";

    // 拼装
    this.sidebar.appendChild(this.levelProgressEl);
    this.sidebar.appendChild(this.titleEl);
    this.sidebar.appendChild(this.scoreContainer);
    this.sidebar.appendChild(this.descriptionEl);
    this.sidebar.appendChild(codeArea);
    this.sidebar.appendChild(btnRow);
    this.sidebar.appendChild(this.feedbackEl);
    this.sidebar.appendChild(this.levelCompleteOverlay);
  }

  /**
   * 绑定 UI 事件
   */
  private bindEvents(): void {
    // 提交按钮
    const submitHandler = () => {
      if (this.cooldown) return;
      this.handleSubmit();
    };
    this.submitBtn.addEventListener("click", submitHandler);
    this.onDestroy.push(() =>
      this.submitBtn.removeEventListener("click", submitHandler)
    );

    // 参考代码按钮 — 将 referenceCode 填入 textarea
    const hintHandler = () => {
      this.showReferenceCode();
    };
    this.hintBtn.addEventListener("click", hintHandler);
    this.onDestroy.push(() =>
      this.hintBtn.removeEventListener("click", hintHandler)
    );

    // Ctrl+Enter 快捷键
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        submitHandler();
      }
    };
    this.textarea.addEventListener("keydown", keyHandler);
    this.onDestroy.push(() =>
      this.textarea.removeEventListener("keydown", keyHandler)
    );

    // 行号同步滚动
    const scrollHandler = () => {
      this.lineNumbers.scrollTop = this.textarea.scrollTop;
    };
    this.textarea.addEventListener("scroll", scrollHandler);
    this.onDestroy.push(() =>
      this.textarea.removeEventListener("scroll", scrollHandler)
    );

    // 更新行号
    const inputHandler = () => {
      const lines = this.textarea.value.split("\n");
      if (lines.length <= 1) {
        this.lineNumbers.textContent = "1";
      } else {
        this.lineNumbers.innerHTML = lines
          .map((_, i) => `${i + 1}`)
          .join("<br>");
      }
      this.lineNumbers.scrollTop = this.textarea.scrollTop;
    };
    this.textarea.addEventListener("input", inputHandler);
    this.onDestroy.push(() =>
      this.textarea.removeEventListener("input", inputHandler)
    );

    // 聚焦时暂停游戏，失焦时恢复
    const focusHandler = () => {
      try {
        Main.getMain().pauseGame();
      } catch (_) {
        /* Main 可能尚未初始化 */
      }
    };
    const blurHandler = () => {
      try {
        Main.getMain().continueGame();
      } catch (_) {
        /* Main 可能尚未初始化 */
      }
    };
    this.textarea.addEventListener("focus", focusHandler);
    this.textarea.addEventListener("blur", blurHandler);
    this.onDestroy.push(() =>
      this.textarea.removeEventListener("focus", focusHandler)
    );
    this.onDestroy.push(() =>
      this.textarea.removeEventListener("blur", blurHandler)
    );
  }

  /**
   * 绑定 QuizEngine 事件 → UI 更新
   */
  private bindQuizEvents(): void {
    const m = Main.getMain();
    if (!m) return;

    m.on(QuizEvents.ANSWER_WRONG, (failures: string[]) => {
      this.showFeedback(
        "error",
        "❌ 请修正以下问题：<br>" +
          failures.map((f) => "&#10007; " + f).join("<br>")
      );
      this.enableSubmit();
    });

    m.on(QuizEvents.ANSWER_CORRECT, () => {
      this.showFeedback("success", "✅ 答案正确！获得新防御塔奖励！");
      // 按钮保持禁用，等待下一题
    });

    m.on(QuizEvents.SCORE_CHANGE, (score: number, completed: number) => {
      this.updateScore(score, completed);
    });

    m.on(QuizEvents.QUIZ_LEVEL_START, (level: QuizLevel) => {
      this.currentLevel = level;
      this.updateLevelProgress();
      this.levelCompleteOverlay.style.display = "none";
    });

    m.on(
      QuizEvents.QUIZ_LEVEL_COMPLETE,
      (level: QuizLevel, score: number) => {
        this.showLevelComplete(level);
      }
    );

    m.on(QuizEvents.ALL_COMPLETED, () => {
      this.showFeedback(
        "success",
        "🎉 所有关卡已完成！你是 C++ 防御大师！"
      );
      this.submitBtn.disabled = true;
      this.submitBtn.textContent = "全部完成";
      this.submitBtn.style.background = "#666";
      this.submitBtn.style.cursor = "not-allowed";
      this.hintBtn.style.display = "none";
    });
  }

  /**
   * 提交处理
   */
  private handleSubmit(): void {
    const code = this.textarea.value;
    if (!code.trim()) {
      this.showFeedback("error", "请输入代码后再提交");
      return;
    }

    this.cooldown = true;
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = "验证中...";
    this.submitBtn.style.background = "#888";
    this.submitBtn.style.cursor = "wait";

    setTimeout(() => {
      this.engine.submitAnswer(code);
    }, 100);
  }

  /**
   * 显示参考代码
   */
  private showReferenceCode(): void {
    if (this.engine.currentQuestion?.referenceCode) {
      const confirmed = confirm(
        "查看参考代码会显示标准答案。确定要查看吗？\n（查看参考代码不影响得分，但建议先自己尝试！）"
      );
      if (!confirmed) return;
      this.textarea.value = this.engine.currentQuestion.referenceCode;
      this.textarea.dispatchEvent(new Event("input"));
      this.showFeedback(
        "warning",
        "📖 已填入参考代码。你可以直接提交，也可以修改后提交。"
      );
      setTimeout(() => this.textarea.focus(), 100);
    } else {
      this.showFeedback("warning", "当前题目没有参考代码");
    }
  }

  /**
   * 显示关卡完成提示
   */
  private showLevelComplete(level: QuizLevel): void {
    this.levelCompleteOverlay.style.display = "block";
    const isLastLevel =
      level.id === this.engine.totalLevels;
    this.levelCompleteOverlay.innerHTML = `
      <div style="font-size:18px;font-weight:bold;margin-bottom:6px;">
        🏆 ${level.name} — 通过！
      </div>
      <div style="font-size:13px;color:#aaa;">
        ${isLastLevel
          ? "所有关卡已完成！你已掌握了 C++ 核心概念。"
          : "请在右侧地图部署防御塔，然后点击「开始出怪」按钮！"
        }
      </div>
      ${!isLastLevel
        ? '<div style="margin-top:8px;font-size:12px;color:#53a8b6;">⬇ 部署塔后点击「开始出怪」进入下一关</div>'
        : ""
      }
    `;
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = "关卡完成";
    this.submitBtn.style.background = "#2ecc71";
    this.submitBtn.style.cursor = "not-allowed";
    this.hintBtn.style.display = "none";
  }

  /**
   * 启用提交按钮
   */
  private enableSubmit(): void {
    this.cooldown = false;
    this.submitBtn.disabled = false;
    this.submitBtn.textContent = "提交答案 (Ctrl+Enter)";
    this.submitBtn.style.background = "#e94560";
    this.submitBtn.style.cursor = "pointer";
  }

  /**
   * 渲染题目
   */
  renderQuestion(q: QuizLevelQuestion): void {
    this.titleEl.textContent = `📝 ${q.title}`;
    this.descriptionEl.innerHTML = q.description;
    this.textarea.value = q.starterCode || "";
    this.textarea.dispatchEvent(new Event("input"));
    this.hideFeedback();
    this.levelCompleteOverlay.style.display = "none";
    this.hintBtn.style.display = "inline-block";
    this.enableSubmit();
    this.updateLevelProgress();
    setTimeout(() => this.textarea.focus(), 200);
  }

  /**
   * 更新关卡进度显示
   */
  updateLevelProgress(): void {
    if (this.currentLevel) {
      this.levelProgressEl.textContent = `关卡 ${this.currentLevel.id}/${this.engine.totalLevels} · ${this.currentLevel.name} · 题目 ${this.engine.currentQuestionNumber}/${this.engine.currentLevelQuestionCount}`;
    } else {
      this.levelProgressEl.textContent = "等待关卡加载...";
    }
  }

  /**
   * 显示反馈
   */
  showFeedback(
    type: "success" | "error" | "warning",
    message: string
  ): void {
    this.feedbackEl.style.display = "block";
    switch (type) {
      case "success":
        this.feedbackEl.style.background = "rgba(46,204,113,0.15)";
        this.feedbackEl.style.color = "#2ecc71";
        this.feedbackEl.style.border = "1px solid rgba(46,204,113,0.3)";
        break;
      case "error":
        this.feedbackEl.style.background = "rgba(231,76,60,0.15)";
        this.feedbackEl.style.color = "#e74c3c";
        this.feedbackEl.style.border = "1px solid rgba(231,76,60,0.3)";
        break;
      case "warning":
        this.feedbackEl.style.background = "rgba(243,156,18,0.15)";
        this.feedbackEl.style.color = "#f39c12";
        this.feedbackEl.style.border = "1px solid rgba(243,156,18,0.3)";
        break;
    }
    this.feedbackEl.innerHTML = message;
  }

  /**
   * 隐藏反馈
   */
  hideFeedback(): void {
    this.feedbackEl.style.display = "none";
  }

  /**
   * 更新得分显示
   */
  updateScore(score: number, completed: number): void {
    if (this.scoreValueEl)
      this.scoreValueEl.textContent = String(score);
    if (this.completeValueEl)
      this.completeValueEl.textContent = String(completed);
  }

  /**
   * 清理所有 DOM 事件监听
   */
  destroy(): void {
    this.onDestroy.forEach((fn) => fn());
    this.onDestroy = [];
    if (this.sidebar) {
      this.sidebar.innerHTML = "";
    }
  }
}

export default QuizUI;
