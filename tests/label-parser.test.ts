import { describe, it, expect } from 'vitest';
import { parseLabels, stripLabels } from '../src/index';

describe('parseLabels', () => {
  // ═══════════════════════════════════════════
  //  基础解析
  // ═══════════════════════════════════════════
  describe('基础解析', () => {
    it('单个标签', () => {
      const result = parseLabels('[创意写作]');
      expect(result).toHaveLength(1);
      expect(result[0].raw).toBe('[创意写作]');
      expect(result[0].content).toBe('创意写作');
      expect(result[0].startIndex).toBe(0);
      expect(result[0].endIndex).toBe(6); // 中文字符各占1个UTF-16码元 × 4 + [] = 6
    });

    it('多个标签', () => {
      const result = parseLabels('[创意写作][变量更新]');
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('创意写作');
      expect(result[1].content).toBe('变量更新');
    });

    it('标签在文本中间', () => {
      const result = parseLabels('前缀[标签]后缀');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('标签');
      expect(result[0].startIndex).toBe(2);
    });

    it('无标签文本 → 空数组', () => {
      expect(parseLabels('没有标签的文本')).toHaveLength(0);
    });

    it('空字符串 → 空数组', () => {
      expect(parseLabels('')).toHaveLength(0);
    });

    it('多个标签间有文本', () => {
      const result = parseLabels('[A] 中间文字 [B]');
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('A');
      expect(result[1].content).toBe('B');
    });
  });

  // ═══════════════════════════════════════════
  //  转义与代码块
  // ═══════════════════════════════════════════
  describe('转义与代码块', () => {
    it('反斜杠转义 \\[标签] → 不被识别', () => {
      const result = parseLabels('\\[标签]');
      expect(result).toHaveLength(0);
    });

    it('反引号包裹 `[标签]` → 不被识别', () => {
      const result = parseLabels('`[标签]`');
      expect(result).toHaveLength(0);
    });

    it('混合：转义标签 + 正常标签', () => {
      const result = parseLabels('\\[跳过][保留]');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('保留');
    });

    it('反引号内 + 反引号外', () => {
      const result = parseLabels('`[跳过]`[保留]');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('保留');
    });
  });

  // ═══════════════════════════════════════════
  //  内容提取
  // ═══════════════════════════════════════════
  describe('内容提取', () => {
    it('含空格', () => {
      const result = parseLabels('[创意 写作]');
      expect(result[0].content).toBe('创意 写作');
    });

    it('含特殊字符（变量条件）', () => {
      const result = parseLabels('["HP" >= 60]');
      expect(result[0].content).toBe('"HP" >= 60');
    });

    it('空标签 []', () => {
      const result = parseLabels('[]');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('');
    });

    it('含 OR 分隔符', () => {
      const result = parseLabels('[创意写作|变量更新]');
      expect(result[0].content).toBe('创意写作|变量更新');
    });

    it('含 NOT 前缀', () => {
      const result = parseLabels('[!Debug]');
      expect(result[0].content).toBe('!Debug');
    });

    it('含通配符', () => {
      const result = parseLabels('[创意***]');
      expect(result[0].content).toBe('创意***');
    });
  });

  // ═══════════════════════════════════════════
  //  嵌套标签
  // ═══════════════════════════════════════════
  describe('嵌套标签', () => {
    it('嵌套 [[标签]] → 匹配最外层', () => {
      const result = parseLabels('[[标签]]');
      expect(result).toHaveLength(1);
      expect(result[0].raw).toBe('[[标签]]');
      expect(result[0].content).toBe('[标签]');
    });
  });

  // ═══════════════════════════════════════════
  //  位置准确性
  // ═══════════════════════════════════════════
  describe('位置准确性', () => {
    it('startIndex 和 endIndex 精确', () => {
      const text = 'abc[tag]xyz';
      const result = parseLabels(text);
      expect(result[0].startIndex).toBe(3);
      expect(result[0].endIndex).toBe(8);
      expect(text.substring(result[0].startIndex, result[0].endIndex)).toBe('[tag]');
    });

    it('中文字符不影响位置', () => {
      const text = '你好[标签]世界';
      const result = parseLabels(text);
      expect(text.substring(result[0].startIndex, result[0].endIndex)).toBe('[标签]');
    });

    it('emoji 不影响位置计算', () => {
      const text = '🎉[标签]🎉';
      const result = parseLabels(text);
      expect(text.substring(result[0].startIndex, result[0].endIndex)).toBe('[标签]');
    });

    it('多个标签的位置连续准确', () => {
      const text = '[A][B][C]';
      const result = parseLabels(text);
      for (const label of result) {
        expect(text.substring(label.startIndex, label.endIndex)).toBe(label.raw);
      }
    });
  });

  // ═══════════════════════════════════════════
  //  边界情况
  // ═══════════════════════════════════════════
  describe('边界情况', () => {
    it('未闭合的 [ → 不被识别', () => {
      expect(parseLabels('[未闭合')).toHaveLength(0);
    });

    it('单独的 ] → 忽略', () => {
      expect(parseLabels('单独的]')).toHaveLength(0);
    });

    it('连续闭合 ]] → 正确处理', () => {
      const result = parseLabels('[a][b]]');
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('a');
      expect(result[1].content).toBe('b');
    });
  });
});

describe('stripLabels', () => {
  it('去除标签后返回纯净文本', () => {
    expect(stripLabels('[创意写作][!Debug] 我的提示词')).toBe('我的提示词');
  });

  it('无标签文本原样返回', () => {
    expect(stripLabels('没有标签')).toBe('没有标签');
  });

  it('标签在中间', () => {
    expect(stripLabels('前缀[标签]后缀')).toBe('前缀后缀');
  });

  it('空字符串', () => {
    expect(stripLabels('')).toBe('');
  });
});
