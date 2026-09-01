/**
 * Prism.js 语法高亮包装组件。
 *
 * 按需加载语言包，使用 prism-tomorrow 深色主题（适配宿主黑夜模式）。
 * 通过 useEffect + highlightElement 实现代码变更时自动重新高亮。
 */
import { useEffect, useRef } from "react";
import Prism from "prismjs";

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
