/**
 * label-parser
 *
 * 内联标签解析器 —— 从文本中提取所有 [...] 标签
 *
 * 解析规则：
 * - 匹配所有 [...] 定界符对
 * - 转义：反斜杠前缀 \[...] 不被识别
 * - 代码块：反引号包裹的 `[...]` 不被识别
 * - 空标签 [] 正常提取（content 为空字符串）
 * - 支持任意 Unicode 字符作为标签内容
 * - 返回结果中 raw 含定界符，content 不含
 *
 * @module label-parser
 */

/**
 * 单个解析出的标签
 */
export interface ParsedLabel {
  /** 标签原始文本（含定界符 []） */
  raw: string;
  /** 标签内容（不含定界符） */
  content: string;
  /** 标签在原文中的起始位置（含 [） */
  startIndex: number;
  /** 标签在原文中的结束位置（] 的下一个位置） */
  endIndex: number;
}

/**
 * 从文本中解析所有 [...] 标签
 *
 * @param text 包含标签的文本（如预设标题 "[创意写作][!Debug] 我的提示词"）
 * @returns 解析出的标签数组（按出现顺序排列）
 */
export function parseLabels(text: string): ParsedLabel[] {
  const labels: ParsedLabel[] = [];

  if (!text) {
    return labels;
  }

  // Unicode 码位数组，用于正确处理多字节字符
  const chars = Array.from(text);
  const len = chars.length;

  // 追踪状态
  let i = 0;
  let inBacktick = false;       // 是否在反引号 ` 内

  while (i < len) {
    const ch = chars[i];

    // ─── 反引号区域检测 ───
    if (ch === '`') {
      inBacktick = !inBacktick;
      i++;
      continue;
    }

    // 在反引号区域内，跳过所有字符
    if (inBacktick) {
      i++;
      continue;
    }

    // ─── 转义检测：\[ 不被识别 ───
    if (ch === '\\' && i + 1 < len && chars[i + 1] === '[') {
      i += 2; // 跳过 \[
      continue;
    }

    // ─── 标签起始 [ ───
    if (ch === '[') {
      // 计算字符位置在原始字符串中的字节偏移
      const startIndex = charsToStringIndex(chars, i);

      // 查找匹配的 ]
      let depth = 1;
      let j = i + 1;

      while (j < len && depth > 0) {
        if (chars[j] === '\\' && j + 1 < len && chars[j + 1] === ']') {
          j += 2; // 跳过转义的 ]
          continue;
        }
        if (chars[j] === '[') {
          depth++;
        } else if (chars[j] === ']') {
          depth--;
        }
        j++;
      }

      if (depth === 0) {
        // 找到匹配的 ]
        const endIndex = charsToStringIndex(chars, j);
        const raw = text.substring(startIndex, endIndex);
        // content 是去掉最外层 [ 和 ] 后的内容
        const content = raw.slice(1, -1);

        labels.push({
          raw,
          content,
          startIndex,
          endIndex,
        });

        i = j; // 移动到 ] 之后
      } else {
        // 未找到匹配的 ]，跳过这个 [
        i++;
      }
    } else {
      i++;
    }
  }

  return labels;
}

/**
 * 将码位数组的索引转换为原始字符串的字符索引
 *
 * JavaScript 字符串使用 UTF-16 编码，Array.from() 按码位拆分。
 * 对于 BMP 字符，码位索引等于字符串索引；
 * 对于非 BMP 字符（如 emoji），一个码位对应两个 UTF-16 码元。
 */
function charsToStringIndex(chars: string[], charIndex: number): number {
  let strIndex = 0;
  for (let k = 0; k < charIndex; k++) {
    strIndex += chars[k].length; // surrogate pair → length 2
  }
  return strIndex;
}

/**
 * 从文本中移除所有标签，返回纯净文本
 *
 * @param text 包含标签的文本
 * @returns 去除所有标签后的文本（保留标签间和标签外的文本）
 */
export function stripLabels(text: string): string {
  const labels = parseLabels(text);
  if (labels.length === 0) return text;

  let result = '';
  let lastEnd = 0;

  for (const label of labels) {
    result += text.substring(lastEnd, label.startIndex);
    lastEnd = label.endIndex;
  }

  result += text.substring(lastEnd);
  return result.trim();
}
