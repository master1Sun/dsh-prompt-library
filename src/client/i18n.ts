/**
 * 提示词库前端国际化（i18n）。
 *
 * 注册到 harness locale 服务的 `prompt-library` 命名空间：
 * - zh / en 两套完整字典，键完全一致；
 * - 通过 `declare module` 把命名空间合并进 LocaleNamespaceMap，
 *   让 `ctx.locale.register` / 组件注入的 `t` 座位获得类型推导；
 * - 组件里用注入的 `t(key, params?)` 取文案，系统语言切换后自动跟随。
 */
import type { TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";

/** 本插件的字典命名空间。 */
export const NS = "prompt-library";

/** 中文（默认）字典。 */
export const zh = {
  // 通用按钮 / 提示
  "pl.title": "提示词库",
  "pl.search": "搜索…",
  "pl.tagFilterAll": "全部",
  "pl.empty": "暂无提示词",
  "pl.loading": "加载中…",
  "pl.new": "+ 新建",
  "pl.addToLibrary": "添加提示词",
  "pl.refresh": "刷新",
  "pl.refreshing": "刷新中…",
  "pl.refreshTitle": "刷新提示词列表",
  "pl.insert": "插入",
  "pl.overwrite": "覆盖",
  "pl.edit": "编辑",
  "pl.delete": "删除",
  "pl.copy": "复制",
  "pl.copied": "已复制",
  "pl.save": "保存",
  "pl.saving": "保存中…",
  "pl.cancel": "取消",
  "pl.close": "关闭",
  "pl.titleField": "标题",
  "pl.bodyField": "正文",
  "pl.insertVariable": "插入变量",
  "pl.insertVariableTitle": "在光标处插入变量标签 {{}}（选中文本可作为变量名）",
  "pl.tagsField": "标签（单选）",
  "pl.tagsHint": "从已有标签中选择一个标签",
  "pl.tagsNoneSelect": "（无标签）",
  "pl.requireTitleBody": "标题和正文为必填项",
  "pl.confirmDelete": "删除 \"{title}\"？删除后将移入回收站，可在「词库管理 - 回收站」中恢复。",
  "pl.confirmSave": "确认保存提示词",
  "pl.recentNew": "新增",
  "pl.learnedToast": "已自动学习",
  "pl.learnFound": "检测到可学习提示词",

  // # 触发浮层
  "pl.overlayNoMatch": "无匹配“{query}”",
  "pl.overlayHintFilter": "筛选“{query}” · ↑↓选择 · Enter确认 · 空格 结束 · Esc 关闭",
  "pl.overlayHintDefault": "↑↓ 选择 · Enter 确认 · 继续输入筛选 · 空格 结束 · Esc 关闭",

  // AI 润色（聊天框确认卡片 / 按钮）
  "pl.polish": "AI 润色",
  "pl.polishing": "润色中…",
  "pl.polishBtnTitle": "调用 AI 润色正文",
  "pl.polishLoadingTitle": "AI 润色中…",
  "pl.polishEmpty": "请先在输入框输入内容",
  "pl.polishDoneLearn": "润色完成，已纳入自学习",
  "pl.polishFail": "AI 润色失败，请确认已连接 LLM 服务",
  "pl.polishReplaced": "已替换到输入框",
  "pl.polishBtnTitle2": "AI 润色当前输入内容",
  "pl.polishResult": "AI 润色结果",
  "pl.polishResultAria": "润色结果",
  "pl.replaceContent": "替换内容",

  // 侧边栏
  "pl.sidebar.expand": "展开提示词库",
  "pl.sidebar.collapse": "折叠提示词库",
  "pl.sidebar.uncategorized": "未分类",
  "pl.sidebar.groupCount": "({count})",
  "pl.sidebar.usageCount": "{count}次",
  "pl.sidebar.total": "共 {count} 条提示词",
  "pl.sidebar.tagTotal": "{count} 个标签",
  "pl.sidebar.recent": "最近使用",
  "pl.saveToLibrary": "保存到词库",
  "pl.autoLearning": "自动学习中…",
  "pl.autoLearnedTag": "已自动纳入自学习",
  "pl.learned": "已学习",
  "pl.confirmLearn": "确认学习",
  "pl.learnSuccessAuto": "学习成功，已自动纳入用户画像",
  "pl.learnSuccessManual": "学习成功，已写入用户画像",
  "pl.polishResultDescAuto": "仅润色内容。已开启「AI 智能完善」，本次润色将自动纳入 AI 自学习，越用越贴合你的风格。",
  "pl.polishResultDescManual": "仅润色内容。点击「确认学习」后，本次润色将纳入 AI 自学习，让润色越用越贴合你的风格。",

  // 导入导出 / 备份恢复
  "pl.moduleImportExport": "导入导出",
  "pl.moduleImportExportDesc": "勾选要导出的提示词，生成备份文件；或从备份文件导入（同 ID 覆盖合并）。",
  "pl.moduleTags": "标签管理",
  "pl.moduleTagsDesc": "集中管理提示词标签，支持新建 / 重命名 / 删除。",
  "pl.moduleTrash": "回收站",
  "pl.moduleTrashDesc": "集中管理已删除的提示词，支持恢复 / 永久删除。",
  "pl.export": "导出",
  "pl.import": "导入",
  "pl.exportTitle": "导出勾选的提示词为备份文件",
  "pl.importTitle": "从备份文件导入（合并到当前词库）",
  "pl.exported": "已导出 {count} 条提示词",
  "pl.exportSelectAll": "全选",
  "pl.exportSelected": "导出选中",
  "pl.viewList": "列表",
  "pl.viewGroup": "分组",
  "pl.exportNeedSelect": "请先勾选要导出的提示词",
  "pl.noPrompts": "暂无提示词",
  "pl.importConfirm": "导入会把备份内容合并到当前词库（同 ID 覆盖），确定继续？",
  "pl.confirm": "确定",
  "pl.imported": "导入完成：新增 {imported}、更新 {updated}、跳过 {skipped}",
  "pl.importFail": "导入失败：{err}",

  // 标签集中管理
  "pl.manageTags": "标签管理",
  "pl.manageTagsTitle": "标签管理",
  "pl.tagsNone": "暂无标签",
  "pl.renameTag": "重命名",
  "pl.renameTagPlaceholder": "新标签名",
  "pl.deleteTag": "删除",
  "pl.deleteTagConfirm": "确认移除标签「{name}」？",
  "pl.deleteTagInUse": "标签 \"{name}\" 正在被 {count} 条提示词使用，需先在提示词中移除该标签后才能删除。",
  "pl.deleteTagInUseTitle": "该标签正在被 {count} 条提示词使用，暂不可删除；请先在提示词中移除后重试",
  "pl.renameTagDone": "已重命名标签「{name}」",
  "pl.deleteTagDone": "已删除标签「{name}」",
  "pl.createTag": "新建标签",
  "pl.createTagPlaceholder": "输入新标签名",
  "pl.createTagDone": "已新建标签「{name}」",

  // 回收站管理
  "pl.trash": "回收站",
  "pl.trashTitle": "回收站管理",
  "pl.trashEmpty": "回收站为空",
  "pl.trashDeletedAt": "删除于 {time}",
  "pl.trashSelectAll": "全选",
  "pl.trashRestoreSelected": "恢复选中",
  "pl.trashDeleteSelected": "永久删除",
  "pl.trashDeleteConfirm": "永久删除选中的 {count} 条提示词？删除后不可恢复。",
  "pl.trashRestoreDone": "已恢复 {count} 条提示词",
  "pl.trashDeleteDone": "已永久删除 {count} 条提示词",
  "pl.trashRestoreOne": "恢复",
  "pl.trashDeleteOne": "删除",
  "pl.trashRestoreOneConfirm": "恢复 \"{title}\"？",
  "pl.trashDeleteOneConfirm": "永久删除 \"{title}\"？删除后不可恢复。",
  "pl.trashCleanupNote": "删除超过 30 天的内容将自动永久清除。",
  "pl.trashDaysLeft": "剩余 {n} 天",

  // 模板变量占位符
  "pl.template.title": "填充模板变量",
  "pl.template.desc": "该提示词包含变量占位符，插入前请填写实际内容；留空的变量将保留为 {{变量名}}。",

  // 选中添加提示词
  "pl.copySelected": "复制选中文字",
  "pl.copiedSelected": "已复制",

  // 设置
  "pl.set.autoLearn": "自动学习提示词",
  "pl.set.autoLearnDesc": "输入复杂 prompt 时自动保存到词库",
  "pl.set.manualConfirm": "手动确认",
  "pl.set.manualConfirmDesc": "学习到提示词时在聊天框弹出保存/取消，确认后才入库（勾选 AI 智能完善时自动入库，忽略该选项）",
  "pl.set.autoLearnTag": "自动学习标签",
  "pl.set.minLength": "最小学习长度",
  "pl.set.aiEnrich": "AI 智能完善",
  "pl.set.aiEnrichDesc": "自动学习时调用 harness AI 生成标题/标签/摘要并改写正文",
  "pl.set.aiProvider": "AI Provider",
  "pl.set.aiProviderDesc": "模型服务供应商，从系统已连接的 LLM 服务中读取；选择“留空自动发现”时自动查找首个可用的 provider。",
  "pl.set.aiModel": "AI 模型",
  "pl.set.aiModelDesc": "该 provider 下的模型 id，从系统读取；选择“留空自动发现”时自动选择 id 含 deepseek 的模型。",
  "pl.set.autoDiscover": "留空自动发现",
  "pl.set.notFound": "{value}（未发现）",
  "pl.set.panelWidth": "聊天框提示词面板宽度（px）",
  "pl.set.panelHeight": "聊天框提示词面板高度（px）",
  "pl.set.maxCount": "提示词最大存储数量(10-1000)",
  "pl.set.rightPanel": "右侧侧边栏展开/折叠",
  "pl.set.rightPanelDesc": "在右侧展开面板，支持折叠收起",
  "pl.set.showComposerBtn": "聊天框显示提示词按钮",
  "pl.set.showComposerBtnDesc": "在输入框工具栏显示提示词库按钮",
  "pl.set.showPolishBtn": "聊天框显示 AI 润色按钮",
  "pl.set.showPolishBtnDesc": "在输入框工具栏显示 AI 润色按钮",
  "pl.set.tildaTrigger": "输入 # 触发词库选择",
  "pl.set.tildaTriggerDesc": "输入 # 后弹出词库；继续输入可实时筛选，↑↓ 选择、回车插入，输入空格或 Esc 结束筛选",
  "pl.set.hoverDetail": "悬停显示详情",
  "pl.set.hoverDetailDesc": "在右侧面板悬停提示词时显示完整详情",
  "pl.set.selectionAdd": "选中文字添加提示词",
  "pl.set.selectionAddDesc": "在聊天内容高亮选中文字后，浮出「添加提示词」按钮并弹出独立窗口",
  "pl.set.lab": "实验室功能",
  "pl.set.labWarning": "以下为实验性能力，可能影响整个 AI 对话的表现。请谨慎勾选。",
  "pl.set.chatCharacter": "整个聊天应用灵魂边界",
  "pl.set.chatCharacterDesc": "勾选后灵魂文件约束整个对话，但只对新会话生效，不影响当前正在进行的对话",
  "pl.set.dataSection": "词库管理",
  "pl.set.dataSectionDesc": "导入导出提示词备份、集中管理提示词标签与回收站。",
  "pl.setSectionTitle": "词库设置",
  "pl.set.setSectionDesc": "设置提示词的保存方式、面板显示、交互入口与 AI 能力。",
  "pl.setModuleLearn": "自动学习",
  "pl.setModuleLearnDesc": "自动保存复杂 prompt 到词库，可按需开启 AI 智能完善。",
  "pl.setModulePanel": "面板显示",
  "pl.setModulePanelDesc": "自定义提示词面板尺寸与最大存储数量。",
  "pl.setModuleDisplay": "显示与交互",
  "pl.setModuleDisplayDesc": "控制各入口的显示方式与触发方式。",
  "pl.setModuleLab": "实验室",
  "pl.setModuleLabDesc": "实验性能力，可能影响整个 AI 对话的表现，请谨慎开启。",
} as const;

/** 英文字典（键与中文完全一致）。 */
export const en: Record<keyof typeof zh, string> = {
  // Common buttons / hints
  "pl.title": "Prompt Library",
  "pl.search": "Search…",
  "pl.empty": "No prompts",
  "pl.loading": "Loading…",
  "pl.new": "+ New",
  "pl.addToLibrary": "Add to library",
  "pl.refresh": "Refresh",
  "pl.refreshing": "Refreshing…",
  "pl.refreshTitle": "Refresh prompt list",
  "pl.insert": "Insert",
  "pl.overwrite": "Overwrite",
  "pl.edit": "Edit",
  "pl.delete": "Delete",
  "pl.copy": "Copy",
  "pl.copied": "Copied",
  "pl.save": "Save",
  "pl.saving": "Saving…",
  "pl.cancel": "Cancel",
  "pl.close": "Close",
  "pl.titleField": "Title",
  "pl.bodyField": "Body",
  "pl.insertVariable": "Insert variable",
  "pl.insertVariableTitle": "Insert a variable tag {{}} at the cursor (selected text can be the variable name)",
  "pl.tagsField": "Tag (single select)",
  "pl.tagsHint": "Select one tag from the existing tags",
  "pl.tagsNoneSelect": "(No tag)",
  "pl.requireTitleBody": "Title and body are required",
  "pl.confirmDelete": "Delete \"{title}\"? It will be moved to the recycle bin and can be restored in Data Management.",
  "pl.confirmSave": "Confirm saving prompt",
  "pl.recentNew": "New",
  "pl.learnedToast": "Auto-learned",
  "pl.learnFound": "Learnable prompt detected",

  // # trigger overlay
  "pl.overlayNoMatch": "No match for “{query}”",
  "pl.overlayHintFilter": "Filtering “{query}” · ↑↓ select · Enter confirm · Space to end · Esc to close",
  "pl.overlayHintDefault": "↑↓ select · Enter confirm · keep typing to filter · Space to end · Esc to close",

  // AI polish (confirm card / button)
  "pl.polish": "AI Polish",
  "pl.polishing": "Polishing…",
  "pl.polishBtnTitle": "Polish the text with AI",
  "pl.polishLoadingTitle": "AI polishing…",
  "pl.polishEmpty": "Please type something in the input first",
  "pl.polishDoneLearn": "Polish complete, added to learning",
  "pl.polishFail": "AI polish failed, please check your LLM connection",
  "pl.polishReplaced": "Replaced in the input",
  "pl.polishBtnTitle2": "Polish current input with AI",
  "pl.polishResult": "AI Polish Result",
  "pl.polishResultAria": "Polish result",
  "pl.replaceContent": "Replace content",

  // Sidebar
  "pl.sidebar.expand": "Expand prompt library",
  "pl.sidebar.collapse": "Collapse prompt library",
  "pl.sidebar.uncategorized": "Uncategorized",
  "pl.sidebar.groupCount": "({count})",
  "pl.sidebar.usageCount": "{count}×",
  "pl.sidebar.total": "{count} prompts total",
  "pl.sidebar.tagTotal": "{count} tags",
  "pl.sidebar.recent": "Recently used",
  "pl.saveToLibrary": "Save to library",
  "pl.autoLearning": "Auto-learning…",
  "pl.autoLearnedTag": "Auto-added to learning",
  "pl.learned": "Learned",
  "pl.confirmLearn": "Confirm learning",
  "pl.learnSuccessAuto": "Learned successfully and added to your profile",
  "pl.learnSuccessManual": "Learned successfully and saved to your profile",
  "pl.polishResultDescAuto": "Polishes content only. “AI enrichment” is on, so this polish is auto-added to AI learning to fit your style.",
  "pl.polishResultDescManual": "Polishes content only. Click “Confirm learning” to add this polish to AI learning so it fits your style better.",

  // Import / Export / Backup
  "pl.moduleImportExport": "Import / Export",
  "pl.moduleImportExportDesc": "Check the prompts to export as a backup file; or import from a backup file (merge, overwrite same ID).",
  "pl.moduleTags": "Manage tags",
  "pl.moduleTagsDesc": "Centrally manage prompt tags: create / rename / delete.",
  "pl.moduleTrash": "Recycle bin",
  "pl.moduleTrashDesc": "Centrally manage deleted prompts: restore or permanently delete.",
  "pl.export": "Export",
  "pl.import": "Import",
  "pl.exportTitle": "Export the checked prompts as a backup file",
  "pl.importTitle": "Import from a backup file (merge into the library)",
  "pl.exported": "Exported {count} prompts",
  "pl.exportSelectAll": "Select all",
  "pl.exportSelected": "Export selected",
  "pl.viewList": "List",
  "pl.viewGroup": "Groups",
  "pl.exportNeedSelect": "Select prompts to export first",
  "pl.noPrompts": "No prompts",
  "pl.importConfirm": "Importing merges the backup into the current library (same ID is overwritten). Continue?",
  "pl.confirm": "OK",
  "pl.imported": "Import done: {imported} added, {updated} updated, {skipped} skipped",
  "pl.importFail": "Import failed: {err}",

  // Tag management
  "pl.manageTags": "Manage tags",
  "pl.manageTagsTitle": "Manage tags",
  "pl.tagsNone": "No tags",
  "pl.renameTag": "Rename",
  "pl.renameTagPlaceholder": "New tag name",
  "pl.deleteTag": "Delete",
  "pl.deleteTagConfirm": "Remove tag \"{name}\"?",
  "pl.deleteTagInUse": "Tag \"{name}\" is in use by {count} prompts. Remove the tag from those prompts before deleting.",
  "pl.deleteTagInUseTitle": "This tag is in use by {count} prompts and cannot be deleted yet. Remove it from prompts first",
  "pl.renameTagDone": "Renamed tag \u201c{name}\u201d",
  "pl.deleteTagDone": "Deleted tag \u201c{name}\u201d",
  "pl.createTag": "New",
  "pl.createTagPlaceholder": "Enter a new tag name",
  "pl.createTagDone": "Created tag \u201c{name}\u201d",

  // Recycle bin
  "pl.trash": "Recycle bin",
  "pl.trashTitle": "Recycle bin",
  "pl.trashEmpty": "The recycle bin is empty",
  "pl.trashDeletedAt": "Deleted at {time}",
  "pl.trashSelectAll": "Select all",
  "pl.trashRestoreSelected": "Restore selected",
  "pl.trashDeleteSelected": "Delete permanently",
  "pl.trashDeleteConfirm": "Permanently delete {count} selected prompts? This cannot be undone.",
  "pl.trashRestoreDone": "Restored {count} prompts",
  "pl.trashDeleteDone": "Permanently deleted {count} prompts",
  "pl.trashRestoreOne": "Restore",
  "pl.trashDeleteOne": "Delete",
  "pl.trashRestoreOneConfirm": "Restore \"{title}\"?",
  "pl.trashDeleteOneConfirm": "Permanently delete \"{title}\"? This cannot be undone.",
  "pl.trashCleanupNote": "Items deleted more than 30 days ago are permanently cleared automatically.",
  "pl.trashDaysLeft": "{n} days left",

  // Template variables
  "pl.template.title": "Fill template variables",
  "pl.template.desc": "This prompt contains variable placeholders. Fill in the actual values before inserting; empty ones stay as {{variable}}.",

  // Add from selection
  "pl.copySelected": "Copy selected text",
  "pl.copiedSelected": "Copied",

  // Settings
  "pl.set.autoLearn": "Auto-learn prompts",
  "pl.set.autoLearnDesc": "Auto-save complex prompts to the library",
  "pl.set.manualConfirm": "Manual confirm",
  "pl.set.manualConfirmDesc": "Show save/cancel card in chat when learning; only saved after confirm (ignored when AI enrichment is on)",
  "pl.set.autoLearnTag": "Auto-learn tag",
  "pl.set.minLength": "Min learn length",
  "pl.set.aiEnrich": "AI enrichment",
  "pl.set.aiEnrichDesc": "When auto-learning, call harness AI to generate title/tags/summary and polish body",
  "pl.set.aiProvider": "AI Provider",
  "pl.set.aiProviderDesc": "LLM provider read from connected services; “Auto-discover” picks the first available provider.",
  "pl.set.aiModel": "AI Model",
  "pl.set.aiModelDesc": "Model id under this provider, read from the system; “Auto-discover” picks a model whose id contains deepseek.",
  "pl.set.autoDiscover": "Auto-discover",
  "pl.set.notFound": "{value} (not found)",
  "pl.set.panelWidth": "Chat prompt panel width (px)",
  "pl.set.panelHeight": "Chat prompt panel height (px)",
  "pl.set.maxCount": "Max stored prompts (10-1000)",
  "pl.set.rightPanel": "Right sidebar expand/collapse",
  "pl.set.rightPanelDesc": "Expand a panel on the right, collapsible",
  "pl.set.showComposerBtn": "Show prompt button in chat",
  "pl.set.showComposerBtnDesc": "Show the prompt library button in the input toolbar",
  "pl.set.showPolishBtn": "Show AI polish button in chat",
  "pl.set.showPolishBtnDesc": "Show the AI polish button in the input toolbar",
  "pl.set.tildaTrigger": "Type # to trigger library selection",
  "pl.set.tildaTriggerDesc": "Type # to open the library; keep typing to filter live, ↑↓ to select, Enter to insert, Space or Esc to finish",
  "pl.set.hoverDetail": "Show details on hover",
  "pl.set.hoverDetailDesc": "Show full details when hovering a prompt in the side panel",
  "pl.set.selectionAdd": "Add prompt from selected text",
  "pl.set.selectionAddDesc": "After highlighting text in chat, show an \u201cAdd to library\u201d button and open a standalone window",
  "pl.set.lab": "Lab features",
  "pl.set.labWarning": "Experimental features below may affect all AI conversations. Enable with caution.",
  "pl.set.chatCharacter": "Apply soul boundary to entire chat",
  "pl.set.chatCharacterDesc": "Constrain the whole chat with soul files, but only for new sessions, not current ones",
  "pl.set.dataSection": "Data management",
  "pl.set.dataSectionDesc": "Export all prompts as a backup file, import from a backup file, and manage prompt tags centrally (rename / delete).",
  "pl.setSectionTitle": "Library settings",
  "pl.set.setSectionDesc": "Configure how prompts are saved, panel display, interaction entries, and AI capabilities.",
  "pl.setModuleLearn": "Auto-learn",
  "pl.setModuleLearnDesc": "Auto-save complex prompts to the library, with optional AI enrichment.",
  "pl.setModulePanel": "Panel display",
  "pl.setModulePanelDesc": "Customize prompt panel size and the max number of stored prompts.",
  "pl.setModuleDisplay": "Display & interaction",
  "pl.setModuleDisplayDesc": "Control how each entry point is shown and triggered.",
  "pl.setModuleLab": "Lab",
  "pl.setModuleLabDesc": "Experimental capabilities that may affect the whole AI conversation. Enable with caution.",
  "pl.tagFilterAll": "All",
};

/** 把命名空间合并进框架的类型表，让 register / t 座位获得键级类型推导。 */
declare module "@deepseek-ai/dsh-client-ui-slots" {
  interface LocaleNamespaceMap {
    "prompt-library": keyof typeof zh;
  }
}

/** 本命名空间的类型化翻译函数（组件注入的 `t` 座位类型）。 */
export type PLTranslate = TranslateNS<typeof NS>;

/**
 * 组件内统一取翻译函数：优先用框架注入的 `t`（跟随系统语言切换），
 * 未注入时（如侧边栏独立渲染）回退到中文字典，保证功能可用。
 */
export type PLT = (key: keyof typeof zh, params?: Record<string, unknown>) => string;

/** 回退翻译：直接用中文字典渲染文案，并替换 `{name}` 占位符。 */
export function fallbackT(key: keyof typeof zh, params?: Record<string, unknown>): string {
  let text: string = zh[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

/** 组件内取 t：有框架注入的 t 用它，否则回退中文。 */
export function usePLT(t?: PLTranslate): PLT {
  return (t ?? fallbackT) as PLT;
}
