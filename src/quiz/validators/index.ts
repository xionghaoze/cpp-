/**
 * C++ 代码验证框架
 * 通过字符串规则匹配判定答案是否正确（非真实编译器）
 */

export interface ValidationRule {
  /** 规则类型 */
  type: "contains" | "not-contains" | "pattern";
  /** 关键字或正则表达式 */
  value: string | RegExp;
  /** 失败时反馈的中文提示 */
  message: string;
}

export interface ValidationResult {
  /** 是否通过 */
  passed: boolean;
  /** 失败规则的中文提示列表 */
  failures: string[];
}

/**
 * 预处理代码：去除注释和字符串字面量减少误判
 */
function preprocessCode(code: string): string {
  // 去除单行注释 //
  let processed = code.replace(/\/\/.*$/gm, "");
  // 去除多行注释 /* */
  processed = processed.replace(/\/\*[\s\S]*?\*\//g, "");
  // 去除字符串字面量 "…"
  processed = processed.replace(/"([^"\\]|\\.)*"/g, '""');
  // 去除字符字面量 '…'
  processed = processed.replace(/'([^'\\]|\\.)*'/g, "''");
  return processed;
}

/**
 * 验证 C++ 代码是否符合规则
 * @param code 用户输入的代码
 * @param rules 验证规则数组
 * @returns 验证结果
 */
export function validateCode(code: string, rules: ValidationRule[]): ValidationResult {
  const processed = preprocessCode(code);
  const failures: string[] = [];

  for (const rule of rules) {
    let match = false;

    if (rule.type === "contains") {
      match = processed.includes(rule.value as string);
    } else if (rule.type === "not-contains") {
      match = !processed.includes(rule.value as string);
    } else if (rule.type === "pattern") {
      match = (rule.value as RegExp).test(processed);
    }

    if (!match) {
      failures.push(rule.message);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * 快捷创建规则集合的辅助函数
 */
export const Rules = {
  /** 必须包含某关键字 */
  contains(keyword: string, message?: string): ValidationRule {
    return {
      type: "contains",
      value: keyword,
      message: message || `代码中需要包含 "${keyword}"`,
    };
  },
  /** 不能包含某关键字 */
  notContains(keyword: string, message?: string): ValidationRule {
    return {
      type: "not-contains",
      value: keyword,
      message: message || `代码中不应包含 "${keyword}"`,
    };
  },
  /** 必须匹配某正则 */
  pattern(regex: RegExp, message: string): ValidationRule {
    return {
      type: "pattern",
      value: regex,
      message,
    };
  },
};
