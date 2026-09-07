/**
 * 会话产物导出器。
 *
 * 一键导出会话期间创建/修改的所有文件为 ZIP 格式。
 * 支持排除规则（node_modules、临时文件等）。
 */
import { useState } from "react";
import JSZip from "jszip";
import type { PreviewFileEntry } from "../../utils/api.js";
import { readPreviewFile } from "../../utils/api.js";
import { type PLTranslate, usePLT } from "../../utils/i18n.js";

interface ArtifactExporterProps {
  files: PreviewFileEntry[];
  sessionTitle?: string;
  t?: PLTranslate;
}

/** 需要排除的路径模式 */
const EXCLUDE_PATTERNS = [
  /node_modules\//,
  /\.git\//,
  /\.svn\//,
  /\.hg\//,
  /dist\//,
  /build\//,
  /\.DS_Store$/,
  /Thumbs\.db$/,
  /\.log$/, // 日志文件通常不是产物
];

/** 判断文件是否应该被排除 */
function shouldExclude(path: string): boolean {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(path));
}

/** 从绝对路径中提取相对路径 */
function extractRelativePath(filePath: string, baseDir?: string): string {
  if (!baseDir) return filePath.split("/").pop() || filePath;
  
  // 如果路径以 baseDir 开头，去掉前缀
  if (filePath.startsWith(baseDir)) {
    return filePath.slice(baseDir.length).replace(/^\/+/, "");
  }
  
  // 否则返回文件名
  return filePath.split("/").pop() || filePath;
}

/** 格式化文件大小 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 获取文件类型图标 */
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    ts: "📘", js: "📗", py: "🐍", go: "🔵", rs: "🦀", java: "☕",
    c: "⚙️", cpp: "⚙️", yml: "⚙️", yaml: "⚙️", toml: "⚙️", xml: "📄",
    json: "📋", md: "📝", txt: "📄", csv: "📊", log: "📋",
    png: "🖼️", jpg: "🖼️", jpeg: "🖼️", gif: "🖼️", svg: "🎨", mp4: "🎬",
  };
  return icons[type] || "📄";
}

export function ArtifactExporter({ files, sessionTitle, t }: ArtifactExporterProps) {
  const T = usePLT(t);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // 过滤出可导出的文件（排除噪音）
  const exportableFiles = files.filter((f) => !shouldExclude(f.path));

  // 初始化时默认全选
  const initializeSelection = () => {
    const allPaths = new Set(exportableFiles.map((f) => f.path));
    setSelectedFiles(allPaths);
    setShowSelector(true);
  };

  // 切换单个文件的选择状态
  const toggleFile = (filePath: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  // 全选/取消全选
  const toggleAll = () => {
    if (selectedFiles.size === exportableFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(exportableFiles.map((f) => f.path)));
    }
  };

  const handleExport = async () => {
    if (selectedFiles.size === 0) {
      alert(T("pl.exporter.noSelection"));
      return;
    }
    
    setExporting(true);
    setShowSelector(false);
    setProgress({ current: 0, total: selectedFiles.size });

    try {
      const zip = new JSZip();
      
      // 只导出选中的文件
      const filesToExport = exportableFiles.filter((f) => selectedFiles.has(f.path));
      
      setProgress({ current: 0, total: filesToExport.length });

      // 逐个读取并添加到 ZIP
      for (let i = 0; i < filesToExport.length; i++) {
        const file = filesToExport[i];
        
        try {
          const data = await readPreviewFile(file.path);
          const relativePath = extractRelativePath(file.name);
          
          // 根据文件类型决定编码方式
          if (["png", "jpg", "jpeg", "gif", "svg"].includes(file.type)) {
            // 二进制文件：base64 解码后添加
            const binaryString = atob(data.content);
            const bytes = new Uint8Array(binaryString.length);
            for (let j = 0; j < binaryString.length; j++) {
              bytes[j] = binaryString.charCodeAt(j);
            }
            zip.file(relativePath, bytes);
          } else {
            // 文本文件：直接添加
            zip.file(relativePath, data.content);
          }
          
          setProgress({ current: i + 1, total: filesToExport.length });
        } catch (err) {
          console.warn(`Failed to read file: ${file.path}`, err);
        }
      }

      // 生成 ZIP 文件
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      // 触发下载
      const fileName = sessionTitle
        ? `${sessionTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")}_artifacts.zip`
        : `session_artifacts_${new Date().toISOString().slice(0, 10)}.zip`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(null);
    } catch (err) {
      console.error("Export failed:", err);
      alert(T("pl.exporter.fail"));
    } finally {
      setExporting(false);
      setProgress(null);
    }
  };

  const exportableCount = exportableFiles.length;
  const selectedCount = selectedFiles.size;

  return (
    <div className="artifact-exporter">
      <button
        type="button"
        className="export-btn"
        onClick={initializeSelection}
        disabled={exportableCount === 0}
        title={T("pl.exporter.selectHint", { count: String(exportableCount) })}
      >
        {T("pl.exporter.btn")}
        {selectedCount > 0 && selectedCount < exportableCount && (
          <span className="badge">{selectedCount}</span>
        )}
      </button>
      
      {/* 文件选择器 */}
      {showSelector && (
        <div className="selector-overlay" onClick={() => setShowSelector(false)}>
          <div className="selector-panel" onClick={(e) => e.stopPropagation()}>
            <div className="selector-header">
              <h4>{T("pl.exporter.title")}</h4>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowSelector(false)}
                title={T("pl.close")}
              >
                ✕
              </button>
            </div>
            
            <div className="selector-actions">
              <button
                type="button"
                className="action-btn"
                onClick={toggleAll}
              >
                {selectedFiles.size === exportableFiles.length
                  ? T("pl.exporter.deselectAll")
                  : T("pl.exportSelectAll")}
              </button>
              <span className="counter">
                {T("pl.exporter.selected", {
                  selected: String(selectedFiles.size),
                  total: String(exportableFiles.length),
                })}
              </span>
            </div>
            
            <div className="selector-list">
              {exportableFiles.map((file) => (
                <label
                  key={file.path}
                  className={`file-item ${selectedFiles.has(file.path) ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.path)}
                    onChange={() => toggleFile(file.path)}
                  />
                  <span className="file-icon">
                    {getTypeIcon(file.type)}
                  </span>
                  <span className="file-name" title={file.name}>
                    {file.name}
                  </span>
                  <span className="file-size">
                    {formatFileSize(file.size)}
                  </span>
                </label>
              ))}
            </div>
            
            <div className="selector-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowSelector(false)}
              >
                {T("pl.cancel")}
              </button>
              <button
                type="button"
                className="confirm-btn"
                onClick={handleExport}
                disabled={selectedFiles.size === 0 || exporting}
              >
                {exporting
                  ? T("pl.exporter.exporting")
                  : T("pl.exporter.export", { count: String(selectedFiles.size) })}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {progress && (
        <div className="export-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <div className="progress-text">
            {progress.current} / {progress.total}
          </div>
        </div>
      )}

      <style>{`
        .artifact-exporter {
          display: inline-flex;
          flex-direction: column;
          gap: 4px;
        }

        .export-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: 1px solid var(--dsw-alias-border-l2);
          border-radius: 6px;
          background: var(--dsw-alias-bg-layer-1);
          color: var(--dsw-alias-label-primary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .export-btn:hover:not(:disabled) {
          border-color: var(--dsw-static-blue-450);
          background: var(--dsw-alias-interactive-bg-hover);
        }

        .export-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid var(--dsw-alias-border-l2);
          border-top-color: var(--dsw-static-blue-450);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .export-progress {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          color: var(--dsw-alias-label-secondary);
        }

        .progress-bar {
          flex: 1;
          height: 4px;
          background: var(--dsw-alias-bg-subtle);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--dsw-static-blue-450);
          transition: width 0.3s;
        }

        .progress-text {
          min-width: 40px;
          text-align: right;
        }

        /* 文件选择器 */
        .selector-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .selector-panel {
          background: var(--dsw-alias-bg-layer-1);
          border: 1px solid var(--dsw-alias-border-l2);
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .selector-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--dsw-alias-border-l2);
        }

        .selector-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--dsw-alias-label-secondary);
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: var(--dsw-alias-bg-hover);
          color: var(--dsw-alias-label-primary);
        }

        .selector-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid var(--dsw-alias-border-l2);
        }

        .action-btn {
          padding: 6px 12px;
          border: 1px solid var(--dsw-alias-border-l2);
          border-radius: 6px;
          background: var(--dsw-alias-bg-layer-2);
          color: var(--dsw-alias-label-primary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          border-color: var(--dsw-static-blue-450);
          background: var(--dsw-alias-interactive-bg-hover);
        }

        .counter {
          font-size: 12px;
          color: var(--dsw-alias-label-secondary);
        }

        .selector-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }

        .file-item:hover {
          background: var(--dsw-alias-bg-hover);
        }

        .file-item.selected {
          background: rgba(96, 165, 250, 0.1);
        }

        .file-item input[type="checkbox"] {
          cursor: pointer;
        }

        .file-icon {
          font-size: 16px;
          flex-shrink: 0;
        }

        .file-name {
          flex: 1;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          font-size: 11px;
          color: var(--dsw-alias-label-secondary);
          flex-shrink: 0;
        }

        .selector-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 20px;
          border-top: 1px solid var(--dsw-alias-border-l2);
        }

        .cancel-btn,
        .confirm-btn {
          padding: 8px 16px;
          border: 1px solid var(--dsw-alias-border-l2);
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn {
          background: transparent;
          color: var(--dsw-alias-label-primary);
        }

        .cancel-btn:hover {
          background: var(--dsw-alias-bg-hover);
        }

        .confirm-btn {
          background: var(--dsw-static-blue-450);
          color: white;
          border-color: var(--dsw-static-blue-450);
        }

        .confirm-btn:hover:not(:disabled) {
          opacity: 0.9;
        }

        .confirm-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 9px;
          background: var(--dsw-static-blue-450);
          color: white;
          font-size: 10px;
          font-weight: 600;
          margin-left: 4px;
        }
      `}</style>
    </div>
  );
}
