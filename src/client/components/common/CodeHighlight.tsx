/**
 * Prism.js 语法高亮包装组件。
 *
 * 按需加载语言包，使用 prism-tomorrow 深色主题（适配宿主黑夜模式）。
 * 通过 useEffect + highlightElement 实现代码变更时自动重新高亮。
 */
import { useEffect, useRef } from "react";
import Prism, { type TokenObject } from "prismjs";

// 核心主题（深色）
import "prismjs/themes/prism-tomorrow.css";

// 按需加载语言包
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-toml";
import "prismjs/components/prism-markup"; // XML/HTML/SVG

// Prism 官方 YAML 语法的 key 模式（plainKey 含 (?:A|B)* 嵌套重复组）在「无空格密集冒号」的行
// （长 URL、压缩数据等）上会灾难性回溯：150KB 即可让高亮耗时 ~14s，直接把主线程卡死。
// 这里在运行时用等价但安全的 key 模式替换（plain key 不允许内含冒号/空格/引号，避免回溯），
// 消除该瓶颈，同时保留引号 key、锚点/标签前缀等正常高亮。实测 180KB 病态输入由 14s+ 降至 ~90ms。
// 代价：不再高亮「key 内含冒号」的写法（a:b: c 这类，实际配置中极少见）。
(() => {
  const yaml = Prism.languages["yaml"] as Record<string, TokenObject> | undefined;
  if (!yaml || !yaml.key) return;
  const anchorOrAlias = /[*&][^\s[\]{},]+/.source;
  const tag = /!(?:<[\w\-%#;/?:@&=+$,.!~*'()[\]]+>|(?:[a-zA-Z\d-]*!)?[\w\-%#;/?:@&=+$.~*'()]+)?/.source;
  const properties = `(?:${tag}(?:[ \t]+${anchorOrAlias})?|${anchorOrAlias}(?:[ \t]+${tag})?)`;
  const string = /"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'/.source;
  const plainKey = /[^\s:,[\]{}()"']+/.source;
  const keySrc = /((?:^|[:\-,[{\r\n?])[ \t]*(?:<<prop>>[ \t]+)?)<<key>>(?=\s*:\s)/.source
    .replace(/<<prop>>/g, () => properties)
    .replace(/<<key>>/g, () => `(?:${plainKey}|${string})`);
  yaml.key.pattern = RegExp(keySrc, "m");
})();

interface CodeHighlightProps {
  code: string;
  language: string; // 'typescript' | 'javascript' | 'python' | ...
  showLineNumbers?: boolean;
}

export function CodeHighlight({ code, language, showLineNumbers = true }: CodeHighlightProps) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (preRef.current) {
      Prism.highlightElement(preRef.current);
    }
  }, [code, language]);

  return (
    <pre
      ref={preRef}
      className={`language-${language}${showLineNumbers ? " line-numbers" : ""}`}
    >
      <code className={`language-${language}`}>{code}</code>
    </pre>
  );
}
