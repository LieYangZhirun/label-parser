/**
 * 标签解析结果
 */
export interface ParsedLabels {
  /** 匹配标签（无前缀） */
  include: string[];
  /** 排除标签（! 前缀） */
  exclude: string[];
  /** 去除标签后的原始文本 */
  raw: string;
}

/**
 * 从文本中解析 [标签] 语法
 *
 * 标签格式：
 * - [标签名] → 匹配标签
 * - [!标签名] → 排除标签
 * - 支持任意 Unicode 字符作为标签名
 *
 * @param text 包含标签的文本（如预设标题 "[Agent1][!Debug] 我的提示词"）
 * @returns 解析结果
 */
export function parseLabels(text: string): ParsedLabels {
  // TODO: 实现标签解析逻辑
  throw new Error('Not implemented');
}
