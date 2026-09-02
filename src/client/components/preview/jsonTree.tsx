/**
 * JSON 对象树渲染。
 * 从 PreviewView 拆出：原始值着色、键值节点可折叠、根节点展开，供 json 文件预览使用。
 */
import { useState, type ReactNode } from "react";
import { S } from "./previewShared.js";

/** JSON 原始值着色渲染。 */
function JsonValue({ value }: { value: unknown }): ReactNode {
  if (value === null) return <span className={`${S}-jNull`}>null</span>;
  const t = typeof value;
  if (t === "string") return <span className={`${S}-jStr`}>"{String(value)}"</span>;
  if (t === "number") return <span className={`${S}-jNum`}>{String(value)}</span>;
  if (t === "boolean") return <span className={`${S}-jBool`}>{String(value)}</span>;
  return <span className={`${S}-jType`}>{String(value)}</span>;
}

/** JSON 单个键值节点：对象/数组可折叠，原始值直接展示。 */
function JsonNode({
  name,
  value,
  depth,
  isArrayItem,
}: {
  name: string;
  value: unknown;
  depth: number;
  isArrayItem?: boolean;
}): ReactNode {
  const isObj = value !== null && typeof value === "object";
  const [open, setOpen] = useState(depth < 1);
  const keyLabel = isArrayItem ? `[${name}]` : name;
  if (!isObj) {
    return (
      <div className={`${S}-jRow`} style={{ paddingLeft: depth * 16 + 10 }}>
        <span className={`${S}-jKey`}>{keyLabel}</span>
        <span className={`${S}-jColon`}>:</span>
        <JsonValue value={value} />
      </div>
    );
  }
  const isArr = Array.isArray(value);
  const entries = Object.entries(value as object);
  if (entries.length === 0) {
    return (
      <div className={`${S}-jRow`} style={{ paddingLeft: depth * 16 + 10 }}>
        <span className={`${S}-jKey`}>{keyLabel}</span>
        <span className={`${S}-jColon`}>:</span>
        <span className={`${S}-jType`}>{isArr ? "[]" : "{}"}</span>
      </div>
    );
  }
  return (
    <div>
      <div className={`${S}-jRow ${S}-jHead`} style={{ paddingLeft: depth * 16 + 10 }} onClick={() => setOpen(!open)}>
        <span className={`${S}-treeArrow ${open ? "open" : ""}`}>{open ? "▾" : "▸"}</span>
        <span className={`${S}-jKey`}>{keyLabel}</span>
        <span className={`${S}-jColon`}>:</span>
        <span className={`${S}-jType`}>{isArr ? `Array(${entries.length})` : `Object(${entries.length})`}</span>
      </div>
      {open && (
        <div>
          {entries.map(([k, v], i) => (
            <JsonNode key={i} name={String(k)} value={v} depth={depth + 1} isArrayItem={isArr} />
          ))}
        </div>
      )}
    </div>
  );
}

/** JSON 根渲染：顶层对象/数组直接展开条目。 */
export function JsonTree({ value }: { value: unknown }): ReactNode {
  if (value === null || typeof value !== "object") {
    return <JsonValue value={value} />;
  }
  const isArr = Array.isArray(value);
  const entries = Object.entries(value as object);
  return (
    <div>
      {entries.map(([k, v], i) => (
        <JsonNode key={i} name={String(k)} value={v} depth={0} isArrayItem={isArr} />
      ))}
    </div>
  );
}
