/**
 * 通用文本工具（host 侧共享）。
 */

/** 去掉 UTF-8 BOM（Windows 记事本/PowerShell 等工具可能写入），避免首字符解析失败。 */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}