/**
 * CSV 解析与表格渲染。
 * 从 PreviewView 拆出：支持双引号包裹字段与转义引号（""），首行作为表头。
 */
import type { ReactNode } from "react";
import { S } from "./previewShared.js";

/** 简易 CSV 解析：支持双引号包裹字段与转义引号（""）。 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // 去掉末尾全空行
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c.trim() === "")) rows.pop();
  return rows;
}

/** CSV 表格渲染：首行作为表头（至少两行时）。 */
export function CsvTable({ rows }: { rows: string[][] }): ReactNode {
  if (rows.length === 0) return <div className={`${S}-empty`}>—</div>;
  const header = rows.length > 1 ? rows[0] : null;
  const body = header ? rows.slice(1) : rows;
  return (
    <div className={`${S}-csvWrap`}>
      <table className={`${S}-csvTable`}>
        {header && (
          <thead>
            <tr>
              {header.map((c, ci) => (
                <th key={ci}>{c}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) => (
                <td key={ci}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
