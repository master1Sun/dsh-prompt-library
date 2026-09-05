// src/host/routes.ts
import { createReadStream, existsSync as existsSync2, watch } from "node:fs";
import { cp as cp2, mkdir as mkdir4, readFile as readFile5, readdir as readdir3, rename, rm as rm5, stat as stat4, writeFile as writeFile5 } from "node:fs/promises";
import { basename as basename3, isAbsolute, join as join9, relative } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath as fileURLToPath3 } from "node:url";

// src/types.ts
var TITLE_MAX_LEN = 25;
function clampTitle(title) {
  return title.slice(0, TITLE_MAX_LEN);
}
var UNMATCHED_SCOPE_PATH = "__pl_unmatched__";
var DEFAULT_SETTINGS = {
  autoLearnTag: "auto-learned",
  // 自动学习提示词使用的默认标签
  autoLearnMinLength: 60,
  // 自动学习的最小字符长度（少于该长度不学习）
  panelWidth: 360,
  // 右侧面板宽度（px）
  panelHeight: 500,
  // 右侧面板高度（px）
  maxPromptCount: 100,
  // 提示词最大存储数量（超出时按使用次数/更新时间淘汰）
  aiProvider: "",
  // AI 智能完善使用的 provider（留空自动发现）
  aiModel: "",
  // AI 智能完善使用的模型 id（留空自动发现）
  deepseekApiKey: "",
  // DeepSeek API Key（可选）：用于查询并实时推送账户余额
  backupRetention: 15,
  // 自动备份保留的备份文件份数（超出自动清理最旧的）
  backupSchedule: "weekly",
  // 自动备份周期：daily / weekly / monthly
  backupFormat: "db",
  // 自动备份文件格式：db（数据库副本）/ json（JSON 导出）
  assistantCharacter: "whale",
  // 词库助手助手形象：鲸鱼款·静态（默认）
  autoLearnManualConfirm: true,
  // 手动确认学习（检测到可学习内容时弹保存/取消，确认后才入库）
  assistantEnabled: true,
  // 词库助手显隐（主开关，关闭后右侧面板也无法启用）
  rightPanelEnabled: true,
  // 是否启用右侧侧边栏展开/折叠（需先开启词库助手）
  settingsAboveMenuEnabled: true,
  // 是否显示左侧设置按钮上方的词库按钮（默认开启）
  showComposerButton: true,
  // 是否在聊天框工具栏显示词库按钮
  composerButtonIconOnly: true,
  // 词库按钮用纯图标显示（隐藏文字，仅保留图标）
  showAIPolishButton: true,
  // 是否在聊天框工具栏显示 AI 润色按钮
  aiPolishButtonIconOnly: true,
  // AI 润色按钮用纯图标显示（隐藏文字，仅保留图标）
  tildaTriggerEnabled: true,
  // 是否启用输入 ~ 触发词库选择
  selectionAddEnabled: true,
  // 是否启用选中文本后浮动「添加提示词」入口
  contextRecommendEnabled: true,
  // 是否启用基于聊天上下文的提示词推荐
  aiEnrichEnabled: true,
  // 是否启用 AI 智能完善（生成标题/标签/摘要并改写正文）
  autoUpdateEnabled: true,
  // 自动更新：发现新版本后台自动安装
  announcementEnabled: true,
  // 公告入口：词库助手右键菜单展示「公告」
  levelEnabled: true,
  // 等级助手：助手等级徽章与右键菜单「成就」入口
  levelAnnouncementEnabled: true,
  // 我的等级公告：新成就解锁时的气泡播报
  personaEnabled: true,
  // 人格管理：词库助手右键菜单展示「人格管理」入口
  injectEnabled: true,
  // 技能管理：词库助手右键菜单展示「技能管理」入口
  dashboardEnabled: true,
  // 看板：词库助手右键菜单展示「看板」入口（统计可视化）
  dataManagementEnabled: true,
  // 数据管理：词库助手右键菜单展示「数据管理」入口
  backupEnabled: true,
  // 是否启用自动备份（启动时及按周期备份数据库）
  monitorEnabled: true,
  // 会话监控视图标签：控制 conversation.view 顶部「监控」显隐
  previewEnabled: true
  // 会话预览视图标签：控制 conversation.view 顶部「预览」显隐
};

// src/host/ai.ts
import { BlockAssembler, createUserMessage } from "@deepseek-ai/dsh-llm";

// src/host/store.ts
import { readFile, rm, writeFile } from "node:fs/promises";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join as join2 } from "node:path";
import { createHash, randomUUID } from "node:crypto";

// src/host/node-sqlite.ts
import { createRequire } from "node:module";
var origEmitWarning = process.emitWarning.bind(process);
process.emitWarning = (...args) => {
  const warning = args[0];
  const message = typeof warning === "string" ? warning : warning instanceof Error ? warning.message : "";
  if (typeof message === "string" && message.includes("SQLite is an experimental feature")) {
    return;
  }
  return origEmitWarning(...args);
};
var requireBuiltin = createRequire(import.meta.url);
var sqliteMod;
function loadSqlite() {
  return sqliteMod ??= requireBuiltin("node:sqlite");
}
function createDatabase(path) {
  return new (loadSqlite()).DatabaseSync(path);
}

// node_modules/js-yaml/dist/js-yaml.mjs
var NOT_RESOLVED = Symbol("NOT_RESOLVED");
function defineScalarTag(tagName, options) {
  return {
    tagName,
    nodeKind: "scalar",
    implicit: options.implicit ?? false,
    matchByTagPrefix: options.matchByTagPrefix ?? false,
    implicitFirstChars: options.implicitFirstChars ?? null,
    resolve: options.resolve,
    identify: options.identify,
    represent: options.represent ?? ((data) => String(data)),
    representTagName: options.representTagName ?? (() => tagName)
  };
}
function defineSequenceTag(tagName, options) {
  const carrierIsResult = options.finalize === void 0;
  return {
    tagName,
    nodeKind: "sequence",
    implicit: false,
    matchByTagPrefix: options.matchByTagPrefix ?? false,
    create: options.create,
    addItem: options.addItem,
    finalize: options.finalize ?? ((carrier) => carrier),
    carrierIsResult,
    identify: options.identify,
    represent: options.represent ?? ((data) => data),
    representTagName: options.representTagName ?? (() => tagName)
  };
}
function defineMappingTag(tagName, options) {
  const carrierIsResult = options.finalize === void 0;
  return {
    tagName,
    nodeKind: "mapping",
    implicit: false,
    matchByTagPrefix: options.matchByTagPrefix ?? false,
    create: options.create,
    addPair: options.addPair,
    has: options.has,
    keys: options.keys,
    get: options.get,
    finalize: options.finalize ?? ((carrier) => carrier),
    carrierIsResult,
    identify: options.identify,
    represent: options.represent ?? ((data) => data),
    representTagName: options.representTagName ?? (() => tagName)
  };
}
var strTag = defineScalarTag("tag:yaml.org,2002:str", {
  resolve: (source) => source,
  identify: (data) => typeof data === "string"
});
var NULL_VALUES$1 = [
  "",
  "~",
  "null",
  "Null",
  "NULL"
];
var nullCoreTag = defineScalarTag("tag:yaml.org,2002:null", {
  implicit: true,
  implicitFirstChars: [
    "",
    "~",
    "n",
    "N"
  ],
  resolve: (source) => {
    if (NULL_VALUES$1.indexOf(source) !== -1) return null;
    return NOT_RESOLVED;
  },
  identify: (object) => object === null,
  represent: () => "null"
});
var nullJsonTag = defineScalarTag("tag:yaml.org,2002:null", {
  implicit: true,
  implicitFirstChars: ["n"],
  resolve: (source, isExplicit) => {
    if (source === "null" || isExplicit && source === "") return null;
    return NOT_RESOLVED;
  },
  identify: (object) => object === null,
  represent: () => "null"
});
var NULL_VALUES = [
  "",
  "~",
  "null",
  "Null",
  "NULL"
];
var nullYaml11Tag = defineScalarTag("tag:yaml.org,2002:null", {
  implicit: true,
  implicitFirstChars: [
    "",
    "~",
    "n",
    "N"
  ],
  resolve: (source) => {
    if (NULL_VALUES.indexOf(source) !== -1) return null;
    return NOT_RESOLVED;
  },
  identify: (object) => object === null,
  represent: () => "null"
});
var TRUE_VALUES$2 = [
  "true",
  "True",
  "TRUE"
];
var FALSE_VALUES$2 = [
  "false",
  "False",
  "FALSE"
];
var boolCoreTag = defineScalarTag("tag:yaml.org,2002:bool", {
  implicit: true,
  implicitFirstChars: [
    "t",
    "T",
    "f",
    "F"
  ],
  resolve: (source) => {
    if (TRUE_VALUES$2.indexOf(source) !== -1) return true;
    if (FALSE_VALUES$2.indexOf(source) !== -1) return false;
    return NOT_RESOLVED;
  },
  identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
  represent: (object) => object ? "true" : "false"
});
var TRUE_VALUES$1 = ["true"];
var FALSE_VALUES$1 = ["false"];
var boolJsonTag = defineScalarTag("tag:yaml.org,2002:bool", {
  implicit: true,
  implicitFirstChars: ["t", "f"],
  resolve: (source) => {
    if (TRUE_VALUES$1.indexOf(source) !== -1) return true;
    if (FALSE_VALUES$1.indexOf(source) !== -1) return false;
    return NOT_RESOLVED;
  },
  identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
  represent: (object) => object ? "true" : "false"
});
var TRUE_VALUES = [
  "true",
  "True",
  "TRUE",
  "y",
  "Y",
  "yes",
  "Yes",
  "YES",
  "on",
  "On",
  "ON"
];
var FALSE_VALUES = [
  "false",
  "False",
  "FALSE",
  "n",
  "N",
  "no",
  "No",
  "NO",
  "off",
  "Off",
  "OFF"
];
var boolYaml11Tag = defineScalarTag("tag:yaml.org,2002:bool", {
  implicit: true,
  implicitFirstChars: [
    "y",
    "Y",
    "n",
    "N",
    "t",
    "T",
    "f",
    "F",
    "o",
    "O"
  ],
  resolve: (source) => {
    if (TRUE_VALUES.indexOf(source) !== -1) return true;
    if (FALSE_VALUES.indexOf(source) !== -1) return false;
    return NOT_RESOLVED;
  },
  identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
  represent: (object) => object ? "true" : "false"
});
var YAML_INTEGER_IMPLICIT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:0o[0-7]+|0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
var YAML_INTEGER_EXPLICIT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1]+|[-+]?0o[0-7]+|[-+]?0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
function parseYamlInteger$2(source) {
  let value = source;
  let sign = 1;
  if (value[0] === "-" || value[0] === "+") {
    if (value[0] === "-") sign = -1;
    value = value.slice(1);
  }
  if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
  if (value.startsWith("0o")) return sign * parseInt(value.slice(2), 8);
  if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
  return sign * parseInt(value, 10);
}
function resolveYamlInteger$2(source, isExplicit) {
  if (isExplicit) {
    if (!YAML_INTEGER_EXPLICIT_PATTERN$1.test(source)) return NOT_RESOLVED;
  } else if (!YAML_INTEGER_IMPLICIT_PATTERN$1.test(source)) return NOT_RESOLVED;
  const result = parseYamlInteger$2(source);
  return Number.isFinite(result) ? result : NOT_RESOLVED;
}
var intCoreTag = defineScalarTag("tag:yaml.org,2002:int", {
  implicit: true,
  implicitFirstChars: [
    "-",
    "+",
    ..."0123456789"
  ],
  resolve: resolveYamlInteger$2,
  identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
  represent: (object) => object.toString(10)
});
var YAML_INTEGER_IMPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^-?(?:0|[1-9][0-9]*)$");
var YAML_INTEGER_EXPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1]+|[-+]?0o[0-7]+|[-+]?0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
function parseYamlInteger$1(source) {
  let value = source;
  let sign = 1;
  if (value[0] === "-" || value[0] === "+") {
    if (value[0] === "-") sign = -1;
    value = value.slice(1);
  }
  if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
  if (value.startsWith("0o")) return sign * parseInt(value.slice(2), 8);
  if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
  return sign * parseInt(value, 10);
}
function resolveYamlInteger$1(source, isExplicit) {
  if (isExplicit) {
    if (!YAML_INTEGER_EXPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
  } else if (!YAML_INTEGER_IMPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
  const result = parseYamlInteger$1(source);
  return Number.isFinite(result) ? result : NOT_RESOLVED;
}
var intJsonTag = defineScalarTag("tag:yaml.org,2002:int", {
  implicit: true,
  implicitFirstChars: ["-", ..."0123456789"],
  resolve: resolveYamlInteger$1,
  identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
  represent: (object) => object.toString(10)
});
var YAML_INTEGER_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1_]+|[-+]?0[0-7_]+|[-+]?0x[0-9a-fA-F_]+|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+|[-+]?(?:0|[1-9][0-9_]*))$");
function parseYamlInteger(source) {
  let value = source.replace(/_/g, "");
  let sign = 1;
  if (value[0] === "-" || value[0] === "+") {
    if (value[0] === "-") sign = -1;
    value = value.slice(1);
  }
  if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
  if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
  if (value.includes(":")) {
    let result = 0;
    for (const part of value.split(":")) result = result * 60 + Number(part);
    return sign * result;
  }
  if (value !== "0" && value[0] === "0") return sign * parseInt(value, 8);
  return sign * parseInt(value, 10);
}
function resolveYamlInteger(source) {
  if (!YAML_INTEGER_PATTERN.test(source)) return NOT_RESOLVED;
  const result = parseYamlInteger(source);
  return Number.isFinite(result) ? result : NOT_RESOLVED;
}
var intYaml11Tag = defineScalarTag("tag:yaml.org,2002:int", {
  implicit: true,
  implicitFirstChars: [
    "-",
    "+",
    ..."0123456789"
  ],
  resolve: resolveYamlInteger,
  identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
  represent: (object) => object.toString(10)
});
var YAML_FLOAT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?[0-9]+(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|[-+]?\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
var YAML_FLOAT_SPECIAL_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat$2(source) {
  if (!YAML_FLOAT_PATTERN$1.test(source)) return NOT_RESOLVED;
  let value = source.toLowerCase();
  const sign = value[0] === "-" ? -1 : 1;
  if ("+-".includes(value[0])) value = value.slice(1);
  if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  if (value === ".nan") return NaN;
  const result = sign * parseFloat(value);
  if (Number.isFinite(result) || YAML_FLOAT_SPECIAL_PATTERN$1.test(source)) return result;
  return NOT_RESOLVED;
}
function representYamlFloat$2(object) {
  if (isNaN(object)) return ".nan";
  if (object === Number.POSITIVE_INFINITY) return ".inf";
  if (object === Number.NEGATIVE_INFINITY) return "-.inf";
  if (Object.is(object, -0)) return "-0.0";
  const result = object.toString(10);
  return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
}
var floatCoreTag = defineScalarTag("tag:yaml.org,2002:float", {
  implicit: true,
  implicitFirstChars: [
    "-",
    "+",
    ".",
    ..."0123456789"
  ],
  resolve: resolveYamlFloat$2,
  identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
  represent: representYamlFloat$2
});
var YAML_FLOAT_IMPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^-?(?:0|[1-9][0-9]*)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$");
var YAML_FLOAT_EXPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?[0-9]+(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|[-+]?\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat$1(source, isExplicit) {
  if (isExplicit) {
    if (!YAML_FLOAT_EXPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
    let value = source.toLowerCase();
    const sign = value[0] === "-" ? -1 : 1;
    if ("+-".includes(value[0])) value = value.slice(1);
    if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    if (value === ".nan") return NaN;
    const result2 = sign * parseFloat(value);
    return Number.isFinite(result2) ? result2 : NOT_RESOLVED;
  }
  if (!YAML_FLOAT_IMPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
  const result = Number(source);
  if (Number.isFinite(result)) return result;
  return NOT_RESOLVED;
}
function representYamlFloat$1(object) {
  if (isNaN(object)) return ".nan";
  if (object === Number.POSITIVE_INFINITY) return ".inf";
  if (object === Number.NEGATIVE_INFINITY) return "-.inf";
  if (Object.is(object, -0)) return "-0.0";
  const result = object.toString(10);
  return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
}
var floatJsonTag = defineScalarTag("tag:yaml.org,2002:float", {
  implicit: true,
  implicitFirstChars: ["-", ..."0123456789"],
  resolve: resolveYamlFloat$1,
  identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
  represent: representYamlFloat$1
});
var YAML_FLOAT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?(?:(?:[0-9][0-9_]*)?\\.[0-9_]*)(?:[eE][-+][0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
var YAML_FLOAT_SPECIAL_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function resolveYamlFloat(source) {
  if (!YAML_FLOAT_PATTERN.test(source)) return NOT_RESOLVED;
  let value = source.toLowerCase().replace(/_/g, "");
  const sign = value[0] === "-" ? -1 : 1;
  if ("+-".includes(value[0])) value = value.slice(1);
  if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  if (value === ".nan") return NaN;
  let result = 0;
  if (value.includes(":")) {
    for (const part of value.split(":")) result = result * 60 + Number(part);
    result *= sign;
  } else result = sign * parseFloat(value);
  if (Number.isFinite(result) || YAML_FLOAT_SPECIAL_PATTERN.test(source)) return result;
  return NOT_RESOLVED;
}
function representYamlFloat(object) {
  if (isNaN(object)) return ".nan";
  if (object === Number.POSITIVE_INFINITY) return ".inf";
  if (object === Number.NEGATIVE_INFINITY) return "-.inf";
  if (Object.is(object, -0)) return "-0.0";
  const result = object.toString(10);
  return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
}
var floatYaml11Tag = defineScalarTag("tag:yaml.org,2002:float", {
  implicit: true,
  implicitFirstChars: [
    "-",
    "+",
    ".",
    ..."0123456789"
  ],
  resolve: resolveYamlFloat,
  identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
  represent: representYamlFloat
});
var mergeTag = defineScalarTag("tag:yaml.org,2002:merge", {
  implicit: true,
  implicitFirstChars: ["<"],
  resolve: (source, isExplicit) => {
    if (source === "<<" || isExplicit && source === "") return "<<";
    return NOT_RESOLVED;
  },
  identify: () => false
});
var BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;
function resolveYamlBinary(source) {
  const input = source.replace(/\s/g, "");
  if (input.length % 4 !== 0 || !BASE64_PATTERN.test(input)) return NOT_RESOLVED;
  const binary = atob(input);
  const result = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) result[index] = binary.charCodeAt(index);
  return result;
}
function representYamlBinary(object) {
  let binary = "";
  for (let index = 0; index < object.length; index++) binary += String.fromCharCode(object[index]);
  return btoa(binary);
}
var binaryTag = defineScalarTag("tag:yaml.org,2002:binary", {
  resolve: resolveYamlBinary,
  identify: (object) => Object.prototype.toString.call(object) === "[object Uint8Array]",
  represent: representYamlBinary
});
var YAML_DATE_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$");
var YAML_TIMESTAMP_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
function makeUtcDate(year, month, day, hour = 0, minute = 0, second = 0, fraction = 0) {
  const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  date.setUTCFullYear(year, month, day);
  return date;
}
function resolveYamlTimestamp(source) {
  let match = YAML_DATE_REGEXP.exec(source);
  if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(source);
  if (match === null) return NOT_RESOLVED;
  const year = +match[1];
  const month = +match[2] - 1;
  const day = +match[3];
  if (!match[4]) {
    const date2 = makeUtcDate(year, month, day);
    if (date2.getUTCFullYear() !== year || date2.getUTCMonth() !== month || date2.getUTCDate() !== day) return NOT_RESOLVED;
    return date2;
  }
  const hour = +match[4];
  const minute = +match[5];
  const second = +match[6];
  let fraction = 0;
  if (hour > 23 || minute > 59 || second > 59) return NOT_RESOLVED;
  if (match[7]) {
    let value = match[7].slice(0, 3);
    while (value.length < 3) value += "0";
    fraction = +value;
  }
  const date = makeUtcDate(year, month, day, hour, minute, second, fraction);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return NOT_RESOLVED;
  if (match[9]) {
    const offsetHour = +match[10];
    const offsetMinute = +(match[11] || 0);
    if (offsetHour > 23 || offsetMinute > 59) return NOT_RESOLVED;
    const offset = (offsetHour * 60 + offsetMinute) * 6e4;
    date.setTime(date.getTime() - (match[9] === "-" ? -offset : offset));
  }
  return date;
}
var timestampTag = defineScalarTag("tag:yaml.org,2002:timestamp", {
  implicit: true,
  implicitFirstChars: [..."0123456789"],
  resolve: resolveYamlTimestamp,
  identify: (object) => object instanceof Date,
  represent: (object) => object.toISOString()
});
var seqTag = defineSequenceTag("tag:yaml.org,2002:seq", {
  create: () => [],
  addItem: (container, item) => {
    container.push(item);
  },
  identify: Array.isArray
});
function isPlainObject(data) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return false;
  const prototype = Object.getPrototypeOf(data);
  return prototype === null || prototype === Object.prototype;
}
function pick(object, keys) {
  const result = {};
  for (const key of keys) if (object[key] !== void 0) result[key] = object[key];
  return result;
}
var omapTag = defineSequenceTag("tag:yaml.org,2002:omap", {
  create: () => ({
    list: [],
    seen: /* @__PURE__ */ new Set()
  }),
  addItem: (carrier, item) => {
    let key;
    if (item instanceof Map) {
      if (item.size !== 1) return "cannot resolve an ordered map item";
      key = item.keys().next().value;
    } else if (isPlainObject(item)) {
      const itemKeys = Object.keys(item);
      if (itemKeys.length !== 1) return "cannot resolve an ordered map item";
      key = itemKeys[0];
    } else return "cannot resolve an ordered map item";
    if (carrier.seen.has(key)) return "duplicate key in ordered map";
    carrier.seen.add(key);
    carrier.list.push(item);
    return "";
  },
  finalize: (carrier) => carrier.list,
  identify: () => false
});
var pairsTag = defineSequenceTag("tag:yaml.org,2002:pairs", {
  create: () => [],
  addItem: (container, item) => {
    if (item instanceof Map) {
      if (item.size !== 1) return "cannot resolve a pairs item";
      container.push(item.entries().next().value);
      return "";
    }
    if (Object.prototype.toString.call(item) !== "[object Object]") return "cannot resolve a pairs item";
    const object = item;
    const keys = Object.keys(object);
    if (keys.length !== 1) return "cannot resolve a pairs item";
    container.push([keys[0], object[keys[0]]]);
    return "";
  },
  identify: () => false
});
var mapTag = defineMappingTag("tag:yaml.org,2002:map", {
  create: () => ({}),
  identify: isPlainObject,
  represent: (o) => {
    const map = /* @__PURE__ */ new Map();
    for (const key of Object.keys(o)) map.set(key, o[key]);
    return map;
  },
  addPair: (container, key, value) => {
    if (key !== null && typeof key === "object") return "object-based map does not support complex keys";
    const normalizedKey = String(key);
    if (normalizedKey === "__proto__") Object.defineProperty(container, normalizedKey, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    else container[normalizedKey] = value;
    return "";
  },
  has: (container, key) => {
    if (key !== null && typeof key === "object") return false;
    return Object.prototype.hasOwnProperty.call(container, String(key));
  },
  keys: (container) => Object.keys(container),
  get: (container, key) => {
    const normalizedKey = String(key);
    if (!Object.prototype.hasOwnProperty.call(container, normalizedKey)) return null;
    return container[normalizedKey];
  }
});
var setTag = defineMappingTag("tag:yaml.org,2002:set", {
  create: () => /* @__PURE__ */ new Set(),
  identify: (data) => data instanceof Set,
  represent: (data) => {
    const map = /* @__PURE__ */ new Map();
    for (const key of data) map.set(key, null);
    return map;
  },
  addPair: (container, key, value) => {
    if (value !== null) return "cannot resolve a set item";
    container.add(key);
    return "";
  },
  has: (container, key) => container.has(key),
  keys: (container) => container.keys(),
  get: () => null
});
function createTagDefinitionMap() {
  return {
    scalar: /* @__PURE__ */ Object.create(null),
    sequence: /* @__PURE__ */ Object.create(null),
    mapping: /* @__PURE__ */ Object.create(null)
  };
}
function createTagDefinitionListMap() {
  return {
    scalar: [],
    sequence: [],
    mapping: []
  };
}
function compileTags(tags) {
  const result = [];
  for (const tag of tags) {
    let index = result.length;
    for (let previousIndex = 0; previousIndex < result.length; previousIndex++) {
      const previous = result[previousIndex];
      if (previous.nodeKind === tag.nodeKind && previous.tagName === tag.tagName && previous.matchByTagPrefix === tag.matchByTagPrefix) {
        index = previousIndex;
        break;
      }
    }
    result[index] = tag;
  }
  return result;
}
var Schema = class Schema2 {
  tags;
  /** @internal */
  implicitScalarTags;
  /**
  * Dispatch implicit scalar resolvers by `source.charAt(0)`. Each bucket holds
  * the resolvers that may match that key, in schema order; a key absent from
  * the map uses
  * {@link Schema.implicitScalarAnyFirstChar}
  * (resolvers that declared no first-char constraint, so they apply to any
  * first character).
  */
  implicitScalarByFirstChar;
  implicitScalarAnyFirstChar;
  /**
  * The default scalar tag (`!!str`), resolved once so the composer's fallback
  * for unresolved plain scalars avoids a keyed lookup per scalar.
  *
  * @internal
  */
  defaultScalarTag;
  /**
  * The default container tags (`!!seq` / `!!map`), used by the dumper: when a
  * value is identified by its default tag, the tag is implicit and not
  * printed. Undefined if the schema does not define them (then such values
  * can't be dumped).
  *
  * @internal
  */
  defaultSequenceTag;
  /** @internal */
  defaultMappingTag;
  exact;
  prefix;
  constructor(tags) {
    const compiledTags = compileTags(tags);
    const implicitScalarTags = [];
    const exact = createTagDefinitionMap();
    const prefix = createTagDefinitionListMap();
    for (const tag of compiledTags) {
      if (tag.nodeKind === "scalar" && tag.implicit) {
        if (tag.matchByTagPrefix) throw new Error("Implicit scalar tags cannot match by tag prefix");
        implicitScalarTags.push(tag);
      }
      switch (tag.nodeKind) {
        case "scalar":
          if (tag.matchByTagPrefix) prefix.scalar.push(tag);
          else exact.scalar[tag.tagName] = tag;
          break;
        case "sequence":
          if (tag.matchByTagPrefix) prefix.sequence.push(tag);
          else exact.sequence[tag.tagName] = tag;
          break;
        case "mapping":
          if (tag.matchByTagPrefix) prefix.mapping.push(tag);
          else exact.mapping[tag.tagName] = tag;
          break;
      }
    }
    const implicitScalarAnyFirstChar = implicitScalarTags.filter((tag) => tag.implicitFirstChars === null);
    const keys = /* @__PURE__ */ new Set();
    for (const tag of implicitScalarTags) if (tag.implicitFirstChars !== null) for (const key of tag.implicitFirstChars) keys.add(key);
    const implicitScalarByFirstChar = /* @__PURE__ */ new Map();
    for (const key of keys) implicitScalarByFirstChar.set(key, implicitScalarTags.filter((tag) => tag.implicitFirstChars === null || tag.implicitFirstChars.indexOf(key) !== -1));
    const defaultScalarTag = exact.scalar["tag:yaml.org,2002:str"];
    if (!defaultScalarTag) throw new Error("schema does not define the default scalar tag (tag:yaml.org,2002:str)");
    this.tags = compiledTags;
    this.implicitScalarTags = implicitScalarTags;
    this.implicitScalarByFirstChar = implicitScalarByFirstChar;
    this.implicitScalarAnyFirstChar = implicitScalarAnyFirstChar;
    this.defaultScalarTag = defaultScalarTag;
    this.defaultSequenceTag = exact.sequence["tag:yaml.org,2002:seq"];
    this.defaultMappingTag = exact.mapping["tag:yaml.org,2002:map"];
    this.exact = exact;
    this.prefix = prefix;
  }
  /** @internal */
  lookupScalarTag(tagName) {
    const exactTag = this.exact.scalar[tagName];
    if (exactTag) return exactTag;
    for (const tag of this.prefix.scalar) if (tagName.startsWith(tag.tagName)) return tag;
  }
  /** @internal */
  lookupSequenceTag(tagName) {
    const exactTag = this.exact.sequence[tagName];
    if (exactTag) return exactTag;
    for (const tag of this.prefix.sequence) if (tagName.startsWith(tag.tagName)) return tag;
  }
  /** @internal */
  lookupMappingTag(tagName) {
    const exactTag = this.exact.mapping[tagName];
    if (exactTag) return exactTag;
    for (const tag of this.prefix.mapping) if (tagName.startsWith(tag.tagName)) return tag;
  }
  /** @internal */
  resolveImplicitScalarTag(source) {
    const candidates = this.implicitScalarByFirstChar.get(source.charAt(0)) ?? this.implicitScalarAnyFirstChar;
    for (const tag2 of candidates) {
      const value = tag2.resolve(source, false, tag2.tagName);
      if (value !== NOT_RESOLVED) return {
        value,
        tag: tag2
      };
    }
    const tag = this.defaultScalarTag;
    return {
      value: tag.resolve(source, false, tag.tagName),
      tag
    };
  }
  /**
  * Creates a new schema with the specified tags added. If a tag already
  * exists, it is replaced by the specified tag.
  *
  * @example
  *
  * ```javascript
  * import { CORE_SCHEMA, mergeTag, realMapTag } from 'js-yaml'
  *
  * const schema = CORE_SCHEMA.withTags(mergeTag, realMapTag)
  * ```
  */
  withTags(...tags) {
    let flatTags = [];
    for (const tag of tags) flatTags = flatTags.concat(tag);
    return new Schema2([...this.tags, ...flatTags]);
  }
};
var FAILSAFE_SCHEMA = new Schema([
  strTag,
  seqTag,
  mapTag
]);
var JSON_SCHEMA = new Schema([
  ...FAILSAFE_SCHEMA.tags,
  nullJsonTag,
  boolJsonTag,
  intJsonTag,
  floatJsonTag
]);
var CORE_SCHEMA = new Schema([
  ...FAILSAFE_SCHEMA.tags,
  nullCoreTag,
  boolCoreTag,
  intCoreTag,
  floatCoreTag
]);
var YAML11_SCHEMA = new Schema([
  ...FAILSAFE_SCHEMA.tags,
  nullYaml11Tag,
  boolYaml11Tag,
  intYaml11Tag,
  floatYaml11Tag,
  timestampTag,
  mergeTag,
  binaryTag,
  omapTag,
  pairsTag,
  setTag
]);
var DUMP_SCHEMA = YAML11_SCHEMA.withTags({
  ...intYaml11Tag,
  resolve: (source, isExplicit, tagName) => {
    const result = intYaml11Tag.resolve(source, isExplicit, tagName);
    return result === NOT_RESOLVED ? intCoreTag.resolve(source, isExplicit, tagName) : result;
  }
}, {
  ...floatYaml11Tag,
  resolve: (source, isExplicit, tagName) => {
    const result = floatYaml11Tag.resolve(source, isExplicit, tagName);
    return result === NOT_RESOLVED ? floatCoreTag.resolve(source, isExplicit, tagName) : result;
  }
});
var realMapTag = defineMappingTag("tag:yaml.org,2002:map", {
  create: () => /* @__PURE__ */ new Map(),
  addPair: (container, key, value) => {
    container.set(key, value);
    return "";
  },
  has: (container, key) => container.has(key),
  keys: (container) => container.keys(),
  get: (container, key) => container.get(key),
  identify: (data) => data instanceof Map || isPlainObject(data),
  represent: (data) => {
    if (data instanceof Map) return data;
    const map = /* @__PURE__ */ new Map();
    const obj = data;
    for (const key of Object.keys(obj)) map.set(key, obj[key]);
    return map;
  }
});
function normalizeKey(key) {
  if (Array.isArray(key)) {
    const array = Array.prototype.slice.call(key);
    for (let index = 0; index < array.length; index++) {
      if (Array.isArray(array[index])) return null;
      if (typeof array[index] === "object" && Object.prototype.toString.call(array[index]) === "[object Object]") array[index] = "[object Object]";
    }
    return String(array);
  }
  if (typeof key === "object" && Object.prototype.toString.call(key) === "[object Object]") return "[object Object]";
  return String(key);
}
var legacyMapTag = defineMappingTag("tag:yaml.org,2002:map", {
  create: () => ({}),
  identify: isPlainObject,
  represent: (o) => {
    const map = /* @__PURE__ */ new Map();
    for (const key of Object.keys(o)) map.set(key, o[key]);
    return map;
  },
  addPair: (container, key, value) => {
    const normalizedKey = normalizeKey(key);
    if (normalizedKey === null) return "nested arrays are not supported inside keys";
    if (normalizedKey === "__proto__") Object.defineProperty(container, normalizedKey, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    else container[normalizedKey] = value;
    return "";
  },
  has: (container, key) => {
    const normalizedKey = normalizeKey(key);
    return normalizedKey !== null && Object.prototype.hasOwnProperty.call(container, normalizedKey);
  },
  keys: (container) => Object.keys(container),
  get: (container, key) => {
    const normalizedKey = String(key);
    if (!Object.prototype.hasOwnProperty.call(container, normalizedKey)) return null;
    return container[normalizedKey];
  }
});
var DEFAULT_SNIPPET_OPTIONS = {
  maxLength: 79,
  indent: 1,
  linesBefore: 3,
  linesAfter: 2
};
function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
  let head = "";
  let tail = "";
  const maxHalfLength = Math.floor(maxLineLength / 2) - 1;
  if (position - lineStart > maxHalfLength) {
    head = " ... ";
    lineStart = position - maxHalfLength + head.length;
  }
  if (lineEnd - position > maxHalfLength) {
    tail = " ...";
    lineEnd = position + maxHalfLength - tail.length;
  }
  return {
    str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
    pos: position - lineStart + head.length
  };
}
function padStart(string, max) {
  return " ".repeat(Math.max(max - string.length, 0)) + string;
}
function makeSnippet(mark, options) {
  if (!mark.buffer) return null;
  const opts = {
    ...DEFAULT_SNIPPET_OPTIONS,
    ...options
  };
  const re = /\r?\n|\r|\0/g;
  const lineStarts = [0];
  const lineEnds = [];
  let match;
  let foundLineNo = -1;
  while (match = re.exec(mark.buffer)) {
    lineEnds.push(match.index);
    lineStarts.push(match.index + match[0].length);
    if (mark.position <= match.index && foundLineNo < 0) foundLineNo = lineStarts.length - 2;
  }
  if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
  let result = "";
  const lineNoLength = Math.min(mark.line + opts.linesAfter, lineEnds.length).toString().length;
  const maxLineLength = opts.maxLength - (opts.indent + lineNoLength + 3);
  for (let i = 1; i <= opts.linesBefore; i++) {
    if (foundLineNo - i < 0) break;
    const line2 = getLine(mark.buffer, lineStarts[foundLineNo - i], lineEnds[foundLineNo - i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]), maxLineLength);
    result = `${" ".repeat(opts.indent)}${padStart((mark.line - i + 1).toString(), lineNoLength)} | ${line2.str}
${result}`;
  }
  const line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
  result += `${" ".repeat(opts.indent)}${padStart((mark.line + 1).toString(), lineNoLength)} | ${line.str}
`;
  result += `${"-".repeat(opts.indent + lineNoLength + 3 + line.pos)}^
`;
  for (let i = 1; i <= opts.linesAfter; i++) {
    if (foundLineNo + i >= lineEnds.length) break;
    const line2 = getLine(mark.buffer, lineStarts[foundLineNo + i], lineEnds[foundLineNo + i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]), maxLineLength);
    result += `${" ".repeat(opts.indent)}${padStart((mark.line + i + 1).toString(), lineNoLength)} | ${line2.str}
`;
  }
  return result.replace(/\n$/, "");
}
function formatError(exception, compact) {
  let where = "";
  if (!exception.mark) return exception.reason;
  if (exception.mark.name) where += `in "${exception.mark.name}" `;
  where += `(${exception.mark.line + 1}:${exception.mark.column + 1})`;
  if (!compact && exception.mark.snippet) where += `

${exception.mark.snippet}`;
  return `${exception.reason} ${where}`;
}
var YAMLException = class YAMLException2 extends Error {
  reason;
  mark;
  /**
  * Optional `mark` contains source snippet data. Usually, use
  * {@link YAMLException.throwAt} instead of passing it directly.
  */
  constructor(reason, mark) {
    super();
    this.name = "YAMLException";
    this.reason = reason;
    this.mark = mark;
    this.message = formatError(this, false);
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }
  /**
  * Returns the formatted error, omitting the source snippet in compact mode.
  */
  toString(compact) {
    return `${this.name}: ${formatError(this, compact)}`;
  }
  /**
  * Builds a YAMLException with a source snippet and throws it. `source` is
  * the raw input text; `position` is an offset into it.
  */
  static throwAt(source, position, message, filename = "") {
    let line = 0;
    let lineStart = 0;
    for (let index = 0; index < position; index++) {
      const ch = source.charCodeAt(index);
      if (ch === 10) {
        line++;
        lineStart = index + 1;
      } else if (ch === 13) {
        line++;
        if (source.charCodeAt(index + 1) === 10) index++;
        lineStart = index + 1;
      }
    }
    const mark = {
      name: filename,
      buffer: source,
      position,
      line,
      column: position - lineStart
    };
    mark.snippet = makeSnippet(mark);
    throw new YAMLException2(message, mark);
  }
};
var EVENT_ID = {
  DOCUMENT: 1,
  SEQUENCE: 2,
  MAPPING: 3,
  SCALAR: 4,
  ALIAS: 5,
  POP: 6
};
var SCALAR_STYLE = {
  PLAIN: 1,
  SINGLE_QUOTED: 2,
  DOUBLE_QUOTED: 3,
  LITERAL_BLOCK: 4,
  FOLDED_BLOCK: 5
};
var COLLECTION_STYLE = {
  BLOCK: 1,
  FLOW: 2
};
var CHOMPING_MODE = {
  CLIP: 1,
  STRIP: 2,
  KEEP: 3
};
var NO_RANGE$3 = -1;
function simpleEscapeSequence(c) {
  switch (c) {
    case 48:
      return "\0";
    case 97:
      return "\x07";
    case 98:
      return "\b";
    case 116:
      return "	";
    case 9:
      return "	";
    case 110:
      return "\n";
    case 118:
      return "\v";
    case 102:
      return "\f";
    case 114:
      return "\r";
    case 101:
      return "\x1B";
    case 32:
      return " ";
    case 34:
      return '"';
    case 47:
      return "/";
    case 92:
      return "\\";
    case 78:
      return "\x85";
    case 95:
      return "\xA0";
    case 76:
      return "\u2028";
    case 80:
      return "\u2029";
    default:
      return "";
  }
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (let i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}
function charFromCodepoint(c) {
  if (c <= 65535) return String.fromCharCode(c);
  return String.fromCharCode((c - 65536 >> 10) + 55296, (c - 65536 & 1023) + 56320);
}
function fromHexCode$1(c) {
  if (c >= 48 && c <= 57) return c - 48;
  return (c | 32) - 97 + 10;
}
function escapedHexLen$1(c) {
  if (c === 120) return 2;
  if (c === 117) return 4;
  return 8;
}
function skipFoldedBreaks(input, position, end) {
  let breaks = 0;
  while (position < end) {
    const ch = input.charCodeAt(position);
    if (ch === 10) {
      breaks++;
      position++;
    } else if (ch === 13) {
      breaks++;
      position++;
      if (input.charCodeAt(position) === 10) position++;
    } else if (ch === 32 || ch === 9) position++;
    else break;
  }
  return {
    position,
    breaks
  };
}
function foldedBreaks(count) {
  if (count === 1) return " ";
  return "\n".repeat(count - 1);
}
function getPlainValue(input, start, end) {
  let result = "";
  let position = start;
  let captureStart = start;
  let captureEnd = start;
  while (position < end) {
    const ch = input.charCodeAt(position);
    if (ch === 10 || ch === 13) {
      result += input.slice(captureStart, captureEnd);
      const fold = skipFoldedBreaks(input, position, end);
      result += foldedBreaks(fold.breaks);
      position = captureStart = captureEnd = fold.position;
    } else {
      position++;
      if (ch !== 32 && ch !== 9) captureEnd = position;
    }
  }
  return result + input.slice(captureStart, captureEnd);
}
function getSingleQuotedValue(input, start, end) {
  let result = "";
  let position = start;
  let captureStart = start;
  let captureEnd = start;
  while (position < end) {
    const ch = input.charCodeAt(position);
    if (ch === 39) {
      result += input.slice(captureStart, position) + "'";
      position += 2;
      captureStart = captureEnd = position;
    } else if (ch === 10 || ch === 13) {
      result += input.slice(captureStart, captureEnd);
      const fold = skipFoldedBreaks(input, position, end);
      result += foldedBreaks(fold.breaks);
      position = captureStart = captureEnd = fold.position;
    } else {
      position++;
      if (ch !== 32 && ch !== 9) captureEnd = position;
    }
  }
  return result + input.slice(captureStart, end);
}
function getDoubleQuotedValue(input, start, end) {
  let result = "";
  let position = start;
  let captureStart = start;
  let captureEnd = start;
  while (position < end) {
    const ch = input.charCodeAt(position);
    if (ch === 92) {
      result += input.slice(captureStart, position);
      position++;
      const escaped = input.charCodeAt(position);
      if (escaped === 10 || escaped === 13) position = skipFoldedBreaks(input, position, end).position;
      else if (escaped < 256 && simpleEscapeCheck[escaped]) {
        result += simpleEscapeMap[escaped];
        position++;
      } else {
        let hexLength = escapedHexLen$1(escaped);
        let hexResult = 0;
        for (; hexLength > 0; hexLength--) {
          position++;
          const digit = fromHexCode$1(input.charCodeAt(position));
          hexResult = (hexResult << 4) + digit;
        }
        result += charFromCodepoint(hexResult);
        position++;
      }
      captureStart = captureEnd = position;
    } else if (ch === 10 || ch === 13) {
      result += input.slice(captureStart, captureEnd);
      const fold = skipFoldedBreaks(input, position, end);
      result += foldedBreaks(fold.breaks);
      position = captureStart = captureEnd = fold.position;
    } else {
      position++;
      if (ch !== 32 && ch !== 9) captureEnd = position;
    }
  }
  return result + input.slice(captureStart, end);
}
function getBlockValue(input, start, end, indent, chomping, folded) {
  const textIndent = indent < 0 ? 0 : indent;
  const region = input.slice(start, end).replace(/\r\n?/g, "\n");
  const lines = region === "" ? [] : (region.endsWith("\n") ? region.slice(0, -1) : region).split("\n");
  let result = "";
  let didReadContent = false;
  let emptyLines = 0;
  let atMoreIndented = false;
  for (const line of lines) {
    let column = 0;
    while (column < textIndent && line.charCodeAt(column) === 32) column++;
    if (indent < 0 || column >= line.length) {
      emptyLines++;
      continue;
    }
    const content = line.slice(textIndent);
    const first = content.charCodeAt(0);
    if (folded) if (first === 32 || first === 9) {
      atMoreIndented = true;
      result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
    } else if (atMoreIndented) {
      atMoreIndented = false;
      result += "\n".repeat(emptyLines + 1);
    } else if (emptyLines === 0) {
      if (didReadContent) result += " ";
    } else result += "\n".repeat(emptyLines);
    else result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
    result += content;
    didReadContent = true;
    emptyLines = 0;
  }
  if (chomping === CHOMPING_MODE.KEEP) result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
  else if (chomping !== CHOMPING_MODE.STRIP) {
    if (didReadContent) result += "\n";
  }
  return result;
}
function getScalarValue(input, scalar) {
  if (scalar.valueStart === NO_RANGE$3) return "";
  const { valueStart, valueEnd } = scalar;
  if (scalar.fast) return input.slice(valueStart, valueEnd);
  switch (scalar.style) {
    case SCALAR_STYLE.SINGLE_QUOTED:
      return getSingleQuotedValue(input, valueStart, valueEnd);
    case SCALAR_STYLE.DOUBLE_QUOTED:
      return getDoubleQuotedValue(input, valueStart, valueEnd);
    case SCALAR_STYLE.LITERAL_BLOCK:
      return getBlockValue(input, valueStart, valueEnd, scalar.indent, scalar.chomping, false);
    case SCALAR_STYLE.FOLDED_BLOCK:
      return getBlockValue(input, valueStart, valueEnd, scalar.indent, scalar.chomping, true);
    default:
      return getPlainValue(input, valueStart, valueEnd);
  }
}
var DEFAULT_TAG_HANDLERS = Object.assign(/* @__PURE__ */ Object.create(null), {
  "!": "!",
  "!!": "tag:yaml.org,2002:"
});
function tagPercentEncode(source) {
  return encodeURI(source).replace(/!/g, "%21");
}
function tagNameFull(rawTag, tagHandlers) {
  if (rawTag.startsWith("!<") && rawTag.endsWith(">")) return decodeURIComponent(rawTag.slice(2, -1));
  const handleEnd = rawTag.indexOf("!", 1);
  const handle = handleEnd === -1 ? "!" : rawTag.slice(0, handleEnd + 1);
  const prefix = tagHandlers?.[handle] ?? DEFAULT_TAG_HANDLERS[handle] ?? handle;
  return decodeURIComponent(prefix) + decodeURIComponent(rawTag.slice(handle.length));
}
function tagNameShort(fullTag) {
  let tag = fullTag;
  if (tag.charCodeAt(0) === 33) {
    tag = tag.slice(1);
    return `!${tagPercentEncode(tag)}`;
  }
  if (tag.slice(0, 18) === "tag:yaml.org,2002:") return `!!${tagPercentEncode(tag.slice(18))}`;
  return `!<${tagPercentEncode(tag)}>`;
}
var NO_RANGE$2 = -1;
var MERGE_TAG_NAME = "tag:yaml.org,2002:merge";
var DEFAULT_CONSTRUCTOR_OPTIONS = {
  filename: "",
  schema: CORE_SCHEMA,
  json: false,
  maxTotalMergeKeys: 1e4,
  maxAliases: -1
};
function eventPosition$1(event) {
  if ("tagStart" in event && event.tagStart !== NO_RANGE$2) return event.tagStart;
  if ("anchorStart" in event && event.anchorStart !== NO_RANGE$2) return event.anchorStart;
  if ("valueStart" in event && event.valueStart !== NO_RANGE$2) return event.valueStart;
  if ("start" in event) return event.start;
  return 0;
}
function throwError$1(state, message) {
  YAMLException.throwAt(state.source, state.position, message, state.filename);
}
function finalizeCollection(state, position, tag, carrier) {
  try {
    return tag.finalize(carrier);
  } catch (error) {
    if (error instanceof YAMLException) throw error;
    YAMLException.throwAt(state.source, position, error instanceof Error ? error.message : String(error), state.filename);
  }
}
function constructScalar(state, event) {
  const source = getScalarValue(state.source, event);
  const rawTag = event.tagStart === NO_RANGE$2 ? "" : state.source.slice(event.tagStart, event.tagEnd);
  const strTag2 = state.schema.defaultScalarTag;
  if (rawTag !== "") {
    if (rawTag === "!") return {
      value: source,
      tag: strTag2
    };
    const tagName = tagNameFull(rawTag, state.tagHandlers);
    const scalarTag = state.schema.lookupScalarTag(tagName);
    if (scalarTag) {
      const result = scalarTag.resolve(source, true, tagName);
      if (result === NOT_RESOLVED) throwError$1(state, `cannot resolve a node with !<${tagName}> explicit tag`);
      return {
        value: result,
        tag: scalarTag
      };
    }
    const collectionTagDef = state.schema.lookupMappingTag(tagName) ?? state.schema.lookupSequenceTag(tagName);
    if (collectionTagDef) {
      if (source !== "") throwError$1(state, `cannot resolve a node with !<${tagName}> explicit tag`);
      const carrier = collectionTagDef.create(tagName);
      return {
        value: collectionTagDef.carrierIsResult ? carrier : finalizeCollection(state, state.position, collectionTagDef, carrier),
        tag: collectionTagDef
      };
    }
    throwError$1(state, `unknown scalar tag !<${tagName}>`);
  }
  if (event.style === SCALAR_STYLE.PLAIN) return state.schema.resolveImplicitScalarTag(source);
  return {
    value: strTag2.resolve(source, false, strTag2.tagName),
    tag: strTag2
  };
}
function collectionTagName(state, event, defaultTagName) {
  const rawTag = event.tagStart === NO_RANGE$2 ? "" : state.source.slice(event.tagStart, event.tagEnd);
  return rawTag === "" || rawTag === "!" ? defaultTagName : tagNameFull(rawTag, state.tagHandlers);
}
function isMappingTag(tag) {
  return tag.nodeKind === "mapping";
}
function mergeKeys(state, frame, source, sourceTag) {
  for (const sourceKey of sourceTag.keys(source)) {
    if (state.maxTotalMergeKeys !== -1 && ++state.totalMergeKeys > state.maxTotalMergeKeys) throwError$1(state, `merge keys exceeded maxTotalMergeKeys (${state.maxTotalMergeKeys})`);
    if (frame.tag.has(frame.value, sourceKey)) continue;
    const err = frame.tag.addPair(frame.value, sourceKey, sourceTag.get(source, sourceKey));
    if (err) throwError$1(state, err);
    (frame.overridable ??= /* @__PURE__ */ new Set()).add(sourceKey);
  }
}
function mergeSource(state, frame, source, sourceTag) {
  state.position = frame.keyPosition;
  if (isMappingTag(sourceTag)) mergeKeys(state, frame, source, sourceTag);
  else if (sourceTag.nodeKind === "sequence" && Array.isArray(source)) for (const element of source) {
    const elementTag = state.nodeTags.get(element);
    if (!elementTag) throwError$1(state, "cannot merge mappings; the provided source object is unacceptable");
    mergeKeys(state, frame, element, elementTag);
  }
  else throwError$1(state, "cannot merge mappings; the provided source object is unacceptable");
}
function addMappingValue(state, frame, key, value, tag) {
  state.position = frame.keyPosition;
  if (frame.keyIsMerge) {
    mergeSource(state, frame, value, tag);
    return;
  }
  if (!state.json && frame.tag.has(frame.value, key) && !frame.overridable?.has(key)) throwError$1(state, "duplicated mapping key");
  const err = frame.tag.addPair(frame.value, key, value);
  if (err) throwError$1(state, err);
  frame.overridable?.delete(key);
}
function addValue(state, value, tag) {
  const frame = state.frames[state.frames.length - 1];
  if (frame.kind === "document") {
    frame.value = value;
    frame.hasValue = true;
  } else if (frame.kind === "sequence") {
    if (isMappingTag(tag)) state.nodeTags.set(value, tag);
    const err = frame.tag.addItem(frame.value, value, frame.index++);
    if (err) throwError$1(state, err);
  } else if (frame.hasKey) {
    const key = frame.key;
    frame.key = void 0;
    frame.hasKey = false;
    addMappingValue(state, frame, key, value, tag);
  } else {
    frame.key = value;
    frame.keyPosition = state.position;
    frame.hasKey = true;
    frame.keyIsMerge = tag.tagName === MERGE_TAG_NAME;
  }
}
function storeAnchor(state, event, value, tag, isValueFinal) {
  if (event.anchorStart !== NO_RANGE$2) {
    const anchor = {
      value,
      tag,
      isValueFinal
    };
    state.anchors.set(state.source.slice(event.anchorStart, event.anchorEnd), anchor);
    return anchor;
  }
  return null;
}
function constructFromEvents(events, options) {
  const state = {
    ...DEFAULT_CONSTRUCTOR_OPTIONS,
    ...options,
    events,
    documents: [],
    eventIndex: 0,
    position: 0,
    frames: [],
    anchors: /* @__PURE__ */ new Map(),
    nodeTags: /* @__PURE__ */ new Map(),
    tagHandlers: /* @__PURE__ */ Object.create(null),
    totalMergeKeys: 0,
    aliasCount: 0
  };
  while (state.eventIndex < state.events.length) {
    const event = state.events[state.eventIndex++];
    state.position = eventPosition$1(event);
    switch (event.type) {
      case EVENT_ID.DOCUMENT:
        state.anchors = /* @__PURE__ */ new Map();
        state.nodeTags = /* @__PURE__ */ new Map();
        state.aliasCount = 0;
        state.tagHandlers = /* @__PURE__ */ Object.create(null);
        for (const directive of event.directives) if (directive.kind === "tag") state.tagHandlers[directive.handle] = directive.prefix;
        state.frames.push({
          kind: "document",
          position: state.position,
          value: void 0,
          hasValue: false
        });
        break;
      case EVENT_ID.SCALAR: {
        const { value, tag } = constructScalar(state, event);
        storeAnchor(state, event, value, tag, true);
        addValue(state, value, tag);
        break;
      }
      case EVENT_ID.SEQUENCE: {
        const tagName = collectionTagName(state, event, "tag:yaml.org,2002:seq");
        const tag = state.schema.lookupSequenceTag(tagName);
        if (!tag) throwError$1(state, `unknown sequence tag !<${tagName}>`);
        const value = tag.create(tagName);
        const anchor = storeAnchor(state, event, value, tag, tag.carrierIsResult);
        state.frames.push({
          kind: "sequence",
          position: state.position,
          value,
          tag,
          anchor,
          index: 0
        });
        break;
      }
      case EVENT_ID.MAPPING: {
        const tagName = collectionTagName(state, event, "tag:yaml.org,2002:map");
        const tag = state.schema.lookupMappingTag(tagName);
        if (!tag) throwError$1(state, `unknown mapping tag !<${tagName}>`);
        const value = tag.create(tagName);
        const anchor = storeAnchor(state, event, value, tag, tag.carrierIsResult);
        state.frames.push({
          kind: "mapping",
          position: state.position,
          value,
          tag,
          anchor,
          key: void 0,
          keyPosition: state.position,
          hasKey: false,
          keyIsMerge: false,
          overridable: null
        });
        break;
      }
      case EVENT_ID.ALIAS: {
        if (state.maxAliases !== -1 && ++state.aliasCount > state.maxAliases) throwError$1(state, `aliases exceeded maxAliases (${state.maxAliases})`);
        const name2 = state.source.slice(event.anchorStart, event.anchorEnd);
        const anchor = state.anchors.get(name2);
        if (!anchor) throwError$1(state, `unidentified alias "${name2}"`);
        if (!anchor.isValueFinal) throwError$1(state, `recursive alias "${name2}" is not supported for tag ${anchor.tag.tagName} because it uses finalize()`);
        addValue(state, anchor.value, anchor.tag);
        break;
      }
      case EVENT_ID.POP: {
        const frame = state.frames.pop();
        if (frame.kind === "mapping" && frame.hasKey) {
          state.position = frame.keyPosition;
          throwError$1(state, "incomplete mapping pair in event stream");
        }
        if (frame.kind === "document") state.documents.push(frame.value);
        else {
          const value = frame.tag.carrierIsResult ? frame.value : finalizeCollection(state, frame.position, frame.tag, frame.value);
          if (frame.anchor) {
            frame.anchor.value = value;
            frame.anchor.isValueFinal = true;
          }
          addValue(state, value, frame.tag);
        }
        break;
      }
    }
  }
  return state.documents;
}
var NO_RANGE$1 = -1;
var HAS_OWN = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]{}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![0-9A-Za-z-]+!)$/;
var NS_URI_CHAR = String.raw`(?:%[0-9A-Fa-f]{2}|[0-9A-Za-z\-#;/?:@&=+$,_.!~*'()\[\]])`;
var NS_TAG_CHAR = String.raw`(?:%[0-9A-Fa-f]{2}|[0-9A-Za-z\-#;/?:@&=+$.~*'()_])`;
var PATTERN_TAG_URI = new RegExp(`^(?:${NS_URI_CHAR})*$`);
var PATTERN_TAG_SUFFIX = new RegExp(`^(?:${NS_TAG_CHAR})+$`);
var PATTERN_TAG_PREFIX = new RegExp(`^(?:!(?:${NS_URI_CHAR})*|${NS_TAG_CHAR}(?:${NS_URI_CHAR})*)$`);
var DEFAULT_PARSER_OPTIONS = {
  filename: "",
  maxDepth: 100
};
function addDocumentEvent(state, explicitStart, explicitEnd) {
  state.events.push({
    type: EVENT_ID.DOCUMENT,
    explicitStart,
    explicitEnd,
    directives: state.directives
  });
}
function addSequenceEvent(state, start, anchorStart, anchorEnd, tagStart, tagEnd, style) {
  state.events.push({
    type: EVENT_ID.SEQUENCE,
    start,
    anchorStart,
    anchorEnd,
    tagStart,
    tagEnd,
    style
  });
}
function addMappingEvent(state, start, anchorStart, anchorEnd, tagStart, tagEnd, style) {
  state.events.push({
    type: EVENT_ID.MAPPING,
    start,
    anchorStart,
    anchorEnd,
    tagStart,
    tagEnd,
    style
  });
}
function insertFlowPairMappingEvent(state, snapshot) {
  state.events.splice(snapshot.eventsLength, 0, {
    type: EVENT_ID.MAPPING,
    start: snapshot.position,
    anchorStart: NO_RANGE$1,
    anchorEnd: NO_RANGE$1,
    tagStart: NO_RANGE$1,
    tagEnd: NO_RANGE$1,
    style: COLLECTION_STYLE.FLOW
  });
}
function addScalarEvent(state, valueStart, valueEnd, anchorStart, anchorEnd, tagStart, tagEnd, style, chomping = CHOMPING_MODE.CLIP, indent = -1, fast = false) {
  state.events.push({
    type: EVENT_ID.SCALAR,
    valueStart,
    valueEnd,
    anchorStart,
    anchorEnd,
    tagStart,
    tagEnd,
    style,
    chomping,
    indent,
    fast
  });
}
function addAliasEvent(state, anchorStart, anchorEnd) {
  state.events.push({
    type: EVENT_ID.ALIAS,
    anchorStart,
    anchorEnd
  });
}
function addPopEvent(state) {
  state.events.push({ type: EVENT_ID.POP });
}
function addEmptyScalarEvent(state) {
  addScalarEvent(state, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, SCALAR_STYLE.PLAIN);
}
function emptyProperties() {
  return {
    anchorStart: NO_RANGE$1,
    anchorEnd: NO_RANGE$1,
    tagStart: NO_RANGE$1,
    tagEnd: NO_RANGE$1
  };
}
function snapshotState(state) {
  return {
    position: state.position,
    line: state.line,
    lineStart: state.lineStart,
    lineIndent: state.lineIndent,
    firstTabInLine: state.firstTabInLine,
    eventsLength: state.events.length
  };
}
function restoreState(state, snapshot) {
  state.position = snapshot.position;
  state.line = snapshot.line;
  state.lineStart = snapshot.lineStart;
  state.lineIndent = snapshot.lineIndent;
  state.firstTabInLine = snapshot.firstTabInLine;
  state.events.length = snapshot.eventsLength;
}
function throwError(state, message) {
  YAMLException.throwAt(state.input.slice(0, state.length), state.position, message, state.filename);
}
function isEol(c) {
  return c === 10 || c === 13;
}
function isWhiteSpace(c) {
  return c === 9 || c === 32;
}
function isWsOrEol(c) {
  return isWhiteSpace(c) || isEol(c);
}
function isWsOrEolOrEnd(c) {
  return c === 0 || isWsOrEol(c);
}
function isFlowIndicator(c) {
  return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromDecimalCode(c) {
  return c >= 48 && c <= 57 ? c - 48 : -1;
}
function fromHexCode(c) {
  if (c >= 48 && c <= 57) return c - 48;
  const lc = c | 32;
  if (lc >= 97 && lc <= 102) return lc - 97 + 10;
  return -1;
}
function escapedHexLen(c) {
  if (c === 120) return 2;
  if (c === 117) return 4;
  if (c === 85) return 8;
  return 0;
}
function isSimpleEscape(c) {
  return c === 48 || c === 97 || c === 98 || c === 116 || c === 9 || c === 110 || c === 118 || c === 102 || c === 114 || c === 101 || c === 32 || c === 34 || c === 47 || c === 92 || c === 78 || c === 95 || c === 76 || c === 80;
}
function consumeLineBreak(state) {
  if (state.input.charCodeAt(state.position) === 10) state.position++;
  else {
    state.position++;
    if (state.input.charCodeAt(state.position) === 10) state.position++;
  }
  state.line++;
  state.lineStart = state.position;
  state.lineIndent = 0;
  state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments) {
  let lineBreaks = 0;
  let ch = state.input.charCodeAt(state.position);
  let hasSeparation = state.position === state.lineStart || isWsOrEol(state.input.charCodeAt(state.position - 1));
  while (ch !== 0) {
    while (isWhiteSpace(ch)) {
      hasSeparation = true;
      if (ch === 9 && state.firstTabInLine === -1) state.firstTabInLine = state.position;
      ch = state.input.charCodeAt(++state.position);
    }
    if (allowComments && hasSeparation && ch === 35) do
      ch = state.input.charCodeAt(++state.position);
    while (!isEol(ch) && ch !== 0);
    if (!isEol(ch)) break;
    consumeLineBreak(state);
    lineBreaks++;
    hasSeparation = true;
    ch = state.input.charCodeAt(state.position);
    while (ch === 32) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
  }
  return lineBreaks;
}
function testDocumentSeparator(state, position = state.position) {
  const ch = state.input.charCodeAt(position);
  if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(position + 1) && ch === state.input.charCodeAt(position + 2)) {
    const following = state.input.charCodeAt(position + 3);
    return following === 0 || isWsOrEol(following);
  }
  return false;
}
function skipUntilLineEnd(state) {
  let ch = state.input.charCodeAt(state.position);
  while (ch !== 0 && !isEol(ch)) ch = state.input.charCodeAt(++state.position);
}
function checkPrintable(state, start, end) {
  if (PATTERN_NON_PRINTABLE.test(state.input.slice(start, end))) throwError(state, "the stream contains non-printable characters");
}
function readTagProperty(state, props, inFlow) {
  if (state.input.charCodeAt(state.position) !== 33) return false;
  if (props.tagStart !== NO_RANGE$1) throwError(state, "duplication of a tag property");
  const start = state.position;
  let isVerbatim = false;
  let isNamed = false;
  let tagHandle = "!";
  let ch = state.input.charCodeAt(++state.position);
  if (ch === 60) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);
  } else if (ch === 33) {
    isNamed = true;
    tagHandle = "!!";
    ch = state.input.charCodeAt(++state.position);
  }
  let suffixStart = state.position;
  let tagName;
  if (isVerbatim) {
    while (ch !== 0 && ch !== 62) ch = state.input.charCodeAt(++state.position);
    if (ch !== 62) throwError(state, "unexpected end of the stream within a verbatim tag");
    tagName = state.input.slice(suffixStart, state.position);
    state.position++;
  } else {
    while (ch !== 0 && !isWsOrEol(ch) && !(inFlow && isFlowIndicator(ch))) {
      if (ch === 33) if (!isNamed) {
        tagHandle = state.input.slice(suffixStart - 1, state.position + 1);
        if (!PATTERN_TAG_HANDLE.test(tagHandle)) throwError(state, "named tag handle cannot contain such characters");
        isNamed = true;
        suffixStart = state.position + 1;
      } else throwError(state, "tag suffix cannot contain exclamation marks");
      ch = state.input.charCodeAt(++state.position);
    }
    tagName = state.input.slice(suffixStart, state.position);
    if (PATTERN_FLOW_INDICATORS.test(tagName)) throwError(state, "tag suffix cannot contain flow indicator characters");
  }
  if (tagName && !(isVerbatim ? PATTERN_TAG_URI.test(tagName) : PATTERN_TAG_SUFFIX.test(tagName))) throwError(state, `tag name cannot contain such characters: ${tagName}`);
  if (!isVerbatim && tagHandle !== "!" && tagHandle !== "!!" && !HAS_OWN.call(state.tagHandlers, tagHandle)) throwError(state, `undeclared tag handle "${tagHandle}"`);
  props.tagStart = start;
  props.tagEnd = state.position;
  return true;
}
function readAnchorProperty(state, props) {
  if (state.input.charCodeAt(state.position) !== 38) return false;
  if (props.anchorStart !== NO_RANGE$1) throwError(state, "duplication of an anchor property");
  state.position++;
  const start = state.position;
  while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position)) && !isFlowIndicator(state.input.charCodeAt(state.position))) state.position++;
  if (state.position === start) throwError(state, "name of an anchor node must contain at least one character");
  props.anchorStart = start;
  props.anchorEnd = state.position;
  return true;
}
function readAlias(state, props) {
  if (state.input.charCodeAt(state.position) !== 42) return false;
  if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) throwError(state, "alias node should not have any properties");
  state.position++;
  const start = state.position;
  while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position)) && !isFlowIndicator(state.input.charCodeAt(state.position))) state.position++;
  if (state.position === start) throwError(state, "name of an alias node must contain at least one character");
  addAliasEvent(state, start, state.position);
  return true;
}
function readFlowScalarBreak(state, nodeIndent) {
  skipSeparationSpace(state, false);
  if (state.lineIndent < nodeIndent) throwError(state, "deficient indentation");
}
function readSingleQuotedScalar(state, nodeIndent, props) {
  if (state.input.charCodeAt(state.position) !== 39) return false;
  state.position++;
  const start = state.position;
  let simple = true;
  while (state.input.charCodeAt(state.position) !== 0) {
    const ch = state.input.charCodeAt(state.position);
    if (ch === 39) {
      if (state.input.charCodeAt(state.position + 1) === 39) {
        simple = false;
        state.position += 2;
        continue;
      }
      const end = state.position;
      state.position++;
      addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.SINGLE_QUOTED, CHOMPING_MODE.CLIP, -1, simple);
      return true;
    }
    if (isEol(ch)) {
      simple = false;
      readFlowScalarBreak(state, nodeIndent);
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a single quoted scalar");
    else if (ch !== 9 && ch < 32) throwError(state, "expected valid JSON character");
    else state.position++;
  }
  throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent, props) {
  if (state.input.charCodeAt(state.position) !== 34) return false;
  state.position++;
  const start = state.position;
  let simple = true;
  while (state.input.charCodeAt(state.position) !== 0) {
    const ch = state.input.charCodeAt(state.position);
    if (ch === 34) {
      const end = state.position;
      state.position++;
      addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.DOUBLE_QUOTED, CHOMPING_MODE.CLIP, -1, simple);
      return true;
    }
    if (ch === 92) {
      simple = false;
      const escaped = state.input.charCodeAt(++state.position);
      if (isEol(escaped)) readFlowScalarBreak(state, nodeIndent);
      else if (isSimpleEscape(escaped)) state.position++;
      else {
        let hexLength = escapedHexLen(escaped);
        if (hexLength === 0) throwError(state, "unknown escape sequence");
        while (hexLength-- > 0) {
          state.position++;
          if (fromHexCode(state.input.charCodeAt(state.position)) < 0) throwError(state, "expected hexadecimal character");
        }
        state.position++;
      }
    } else if (isEol(ch)) {
      simple = false;
      readFlowScalarBreak(state, nodeIndent);
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a double quoted scalar");
    else if (ch !== 9 && ch < 32) throwError(state, "expected valid JSON character");
    else state.position++;
  }
  throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readBlockScalar(state, parentIndent, props) {
  const ch = state.input.charCodeAt(state.position);
  let chomping = CHOMPING_MODE.CLIP;
  let indent = -1;
  let detectedIndent = false;
  if (ch !== 124 && ch !== 62) return false;
  const style = ch === 124 ? SCALAR_STYLE.LITERAL_BLOCK : SCALAR_STYLE.FOLDED_BLOCK;
  state.position++;
  while (state.input.charCodeAt(state.position) !== 0) {
    const current = state.input.charCodeAt(state.position);
    const digit = fromDecimalCode(current);
    if (current === 43 || current === 45) {
      if (chomping !== CHOMPING_MODE.CLIP) throwError(state, "repeat of a chomping mode identifier");
      chomping = current === 43 ? CHOMPING_MODE.KEEP : CHOMPING_MODE.STRIP;
      state.position++;
    } else if (digit >= 0) {
      if (digit === 0) throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
      if (detectedIndent) throwError(state, "repeat of an indentation width identifier");
      indent = parentIndent + digit - 1;
      detectedIndent = true;
      state.position++;
    } else break;
  }
  let hadWhitespace = false;
  while (isWhiteSpace(state.input.charCodeAt(state.position))) {
    hadWhitespace = true;
    state.position++;
  }
  if (hadWhitespace && state.input.charCodeAt(state.position) === 35) skipUntilLineEnd(state);
  if (isEol(state.input.charCodeAt(state.position))) consumeLineBreak(state);
  else if (state.input.charCodeAt(state.position) !== 0) throwError(state, "a line break is expected");
  let contentIndent = detectedIndent ? indent : -1;
  let maxLeadingIndent = 0;
  const valueStart = state.position;
  let valueEnd = state.position;
  while (state.input.charCodeAt(state.position) !== 0) {
    const linePosition = state.position;
    let column = 0;
    while (state.input.charCodeAt(linePosition + column) === 32) column++;
    const first = state.input.charCodeAt(linePosition + column);
    if (first === 0) {
      if (contentIndent >= 0) {
        if (column > contentIndent) valueEnd = linePosition + column;
      } else if (column > 0) valueEnd = linePosition + column;
      break;
    }
    if (linePosition === state.lineStart && testDocumentSeparator(state, linePosition)) break;
    if (!detectedIndent && contentIndent === -1 && isEol(first)) maxLeadingIndent = Math.max(maxLeadingIndent, column);
    if (!detectedIndent && contentIndent === -1 && !isEol(first)) {
      if (first === 9 && column < parentIndent) {
        state.position = linePosition + column;
        throwError(state, "tab characters must not be used in indentation");
      }
      if (column < maxLeadingIndent) {
        state.position = linePosition + column;
        throwError(state, "bad indentation of a mapping entry");
      }
    }
    if (contentIndent === -1 && first !== 0 && !isEol(first) && column < parentIndent) {
      state.lineIndent = column;
      state.position = linePosition + column;
      break;
    }
    if (!detectedIndent && first !== 0 && !isEol(first) && contentIndent === -1) contentIndent = column;
    const requiredIndent = contentIndent === -1 ? parentIndent + 1 : contentIndent;
    if (first !== 0 && !isEol(first) && column < requiredIndent) {
      state.lineIndent = column;
      state.position = linePosition + column;
      break;
    }
    skipUntilLineEnd(state);
    valueEnd = state.position;
    if (isEol(state.input.charCodeAt(state.position))) {
      consumeLineBreak(state);
      valueEnd = state.position;
    }
  }
  checkPrintable(state, valueStart, valueEnd);
  addScalarEvent(state, valueStart, valueEnd, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, style, chomping, contentIndent);
  return true;
}
function canStartPlainScalar(state, nodeContext) {
  const ch = state.input.charCodeAt(state.position);
  const inFlow = nodeContext === CONTEXT_FLOW_IN;
  if (ch === 0 || isWsOrEol(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96 || inFlow && isFlowIndicator(ch)) return false;
  if (ch === 63 || ch === 45) {
    const following = state.input.charCodeAt(state.position + 1);
    if (isWsOrEolOrEnd(following) || inFlow && isFlowIndicator(following)) return false;
  }
  return true;
}
function readPlainScalar(state, nodeIndent, nodeContext, props) {
  if (!canStartPlainScalar(state, nodeContext)) return false;
  const start = state.position;
  let end = state.position;
  let ch = state.input.charCodeAt(state.position);
  const inFlow = nodeContext === CONTEXT_FLOW_IN;
  let multiline = false;
  while (ch !== 0) {
    if (state.position === state.lineStart && testDocumentSeparator(state)) break;
    if (ch === 58) {
      const following = state.input.charCodeAt(state.position + 1);
      if (isWsOrEolOrEnd(following) || inFlow && isFlowIndicator(following)) break;
    } else if (ch === 35) {
      if (isWsOrEol(state.input.charCodeAt(state.position - 1))) break;
    } else if (inFlow && isFlowIndicator(ch)) break;
    else if (isEol(ch)) {
      const savedPosition = state.position;
      const savedLine = state.line;
      const savedLineStart = state.lineStart;
      const savedLineIndent = state.lineIndent;
      skipSeparationSpace(state, false);
      if (state.lineIndent >= nodeIndent) {
        multiline = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      }
      state.position = savedPosition;
      state.line = savedLine;
      state.lineStart = savedLineStart;
      state.lineIndent = savedLineIndent;
      break;
    }
    if (!isWhiteSpace(ch)) end = state.position + 1;
    ch = state.input.charCodeAt(++state.position);
  }
  if (end === start) return false;
  checkPrintable(state, start, end);
  addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.PLAIN, CHOMPING_MODE.CLIP, -1, !multiline);
  return true;
}
function skipFlowSeparationSpace(state, nodeIndent) {
  const startLine = state.line;
  skipSeparationSpace(state, true);
  if (state.line > startLine && state.lineIndent < nodeIndent || state.firstTabInLine !== -1 && state.lineIndent < nodeIndent) throwError(state, "deficient indentation");
}
function readFlowCollection(state, nodeIndent, props) {
  const ch = state.input.charCodeAt(state.position);
  const isMapping = ch === 123;
  const start = state.position;
  let readNext = true;
  if (ch !== 91 && ch !== 123) return false;
  const terminator = isMapping ? 125 : 93;
  if (isMapping) addMappingEvent(state, start, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.FLOW);
  else addSequenceEvent(state, start, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.FLOW);
  state.position++;
  while (state.input.charCodeAt(state.position) !== 0) {
    skipFlowSeparationSpace(state, nodeIndent);
    let ch2 = state.input.charCodeAt(state.position);
    if (ch2 === terminator) {
      state.position++;
      addPopEvent(state);
      return true;
    } else if (!readNext) throwError(state, "missed comma between flow collection entries");
    else if (ch2 === 44) throwError(state, "expected the node content, but found ','");
    let isPair = false;
    let isExplicitPair = false;
    if (ch2 === 63 && isWsOrEol(state.input.charCodeAt(state.position + 1))) {
      isPair = isExplicitPair = true;
      state.position += 1;
      skipFlowSeparationSpace(state, nodeIndent);
    }
    const entryLine = state.line;
    const entryStart = snapshotState(state);
    const keyWasRead = parseNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    skipFlowSeparationSpace(state, nodeIndent);
    ch2 = state.input.charCodeAt(state.position);
    if ((isMapping || isExplicitPair || state.line === entryLine) && ch2 === 58) {
      isPair = true;
      state.position++;
      skipFlowSeparationSpace(state, nodeIndent);
      if (!isMapping) {
        insertFlowPairMappingEvent(state, entryStart);
        if (!keyWasRead) addEmptyScalarEvent(state);
      } else if (!keyWasRead) addEmptyScalarEvent(state);
      if (!parseNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true)) addEmptyScalarEvent(state);
      skipFlowSeparationSpace(state, nodeIndent);
      if (!isMapping) addPopEvent(state);
    } else if (isMapping && isPair) {
      if (!keyWasRead) addEmptyScalarEvent(state);
      addEmptyScalarEvent(state);
    } else if (isMapping) addEmptyScalarEvent(state);
    else if (isPair) {
      insertFlowPairMappingEvent(state, entryStart);
      if (!keyWasRead) addEmptyScalarEvent(state);
      addEmptyScalarEvent(state);
      addPopEvent(state);
    }
    ch2 = state.input.charCodeAt(state.position);
    if (ch2 === 44) {
      readNext = true;
      state.position++;
    } else readNext = false;
  }
  throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockSequence(state, nodeIndent, props) {
  if (state.firstTabInLine !== -1 || state.input.charCodeAt(state.position) !== 45 || !isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) return false;
  addSequenceEvent(state, state.position, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.BLOCK);
  while (state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) {
    if (state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    const entryLine = state.line;
    state.position++;
    const hadBreak = skipSeparationSpace(state, true) > 0;
    if (state.firstTabInLine !== -1 && state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) throwError(state, "bad indentation of a sequence entry");
    if (hadBreak && state.lineIndent <= nodeIndent) addEmptyScalarEvent(state);
    else parseNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    skipSeparationSpace(state, true);
    if (state.lineIndent < nodeIndent || state.position >= state.length) break;
    if (state.lineIndent > nodeIndent) throwError(state, "bad indentation of a sequence entry");
    if (state.line === entryLine && state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) throwError(state, "bad indentation of a sequence entry");
  }
  addPopEvent(state);
  return true;
}
function readBlockMapping(state, nodeIndent, flowIndent, props) {
  let atExplicitKey = false;
  let detected = false;
  let mappingOpened = false;
  let pendingExplicitKey = false;
  if (state.firstTabInLine !== -1) return false;
  let ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (!atExplicitKey && state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    const following = state.input.charCodeAt(state.position + 1);
    const entryLine = state.line;
    if ((ch === 63 || ch === 58) && isWsOrEolOrEnd(following)) {
      if (!mappingOpened) {
        addMappingEvent(state, state.position, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.BLOCK);
        mappingOpened = true;
      }
      if (ch === 63) {
        if (atExplicitKey) addEmptyScalarEvent(state);
        detected = true;
        atExplicitKey = true;
      } else if (atExplicitKey) atExplicitKey = false;
      else {
        addEmptyScalarEvent(state);
        detected = true;
        atExplicitKey = false;
      }
      state.position += 1;
      pendingExplicitKey = true;
    } else {
      if (atExplicitKey) {
        addEmptyScalarEvent(state);
        atExplicitKey = false;
      }
      const beforeKey = snapshotState(state);
      if (!parseNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) break;
      if (state.line === entryLine) {
        ch = state.input.charCodeAt(state.position);
        while (isWhiteSpace(ch)) ch = state.input.charCodeAt(++state.position);
        if (ch === 58) {
          ch = state.input.charCodeAt(++state.position);
          if (!isWsOrEolOrEnd(ch)) throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
          if (!mappingOpened) {
            restoreState(state, beforeKey);
            addMappingEvent(state, beforeKey.position, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.BLOCK);
            mappingOpened = true;
            parseNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true);
            ch = state.input.charCodeAt(state.position);
            while (isWhiteSpace(ch)) ch = state.input.charCodeAt(++state.position);
            state.position++;
          }
          detected = true;
          atExplicitKey = false;
          pendingExplicitKey = false;
        } else if (detected) throwError(state, "expected ':' after a mapping key");
        else {
          if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) {
            restoreState(state, beforeKey);
            return false;
          }
          return true;
        }
      } else if (detected) throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
      else {
        if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) {
          restoreState(state, beforeKey);
          return false;
        }
        return true;
      }
    }
    if (parseNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, pendingExplicitKey)) pendingExplicitKey = false;
    if (!atExplicitKey) {
      if (pendingExplicitKey) {
        addEmptyScalarEvent(state);
        pendingExplicitKey = false;
      }
    }
    skipSeparationSpace(state, true);
    ch = state.input.charCodeAt(state.position);
    if ((state.line === entryLine || state.lineIndent > nodeIndent) && ch !== 0) throwError(state, "bad indentation of a mapping entry");
    else if (state.lineIndent < nodeIndent) break;
  }
  if (!detected) return false;
  if (atExplicitKey) addEmptyScalarEvent(state);
  if (mappingOpened) addPopEvent(state);
  return true;
}
function parseNode(state, parentIndent, nodeContext, allowToSeek, allowCompact, allowPropertyMapping = true) {
  if (state.depth >= state.maxDepth) throwError(state, `nesting exceeded maxDepth (${state.maxDepth})`);
  state.depth++;
  let indentStatus = 1;
  let atNewLine = false;
  let hasContent = false;
  let propertyStart = null;
  const props = emptyProperties();
  let allowBlockScalars = nodeContext === CONTEXT_BLOCK_OUT || nodeContext === CONTEXT_BLOCK_IN;
  let allowBlockCollections = allowBlockScalars;
  const allowBlockStyles = allowBlockScalars;
  if (allowToSeek && skipSeparationSpace(state, true)) {
    atNewLine = true;
    if (state.lineIndent > parentIndent) indentStatus = 1;
    else if (state.lineIndent === parentIndent) indentStatus = 0;
    else indentStatus = -1;
  }
  if (indentStatus === 1) while (true) {
    const ch = state.input.charCodeAt(state.position);
    const propertyState = snapshotState(state);
    if (atNewLine && indentStatus !== 1 && (ch === 33 || ch === 38)) break;
    if (atNewLine && allowBlockStyles && (props.tagStart !== NO_RANGE$1 || props.anchorStart !== NO_RANGE$1) && (ch === 33 || ch === 38)) {
      const fallbackState = snapshotState(state);
      const flowIndent = parentIndent + 1;
      if (readBlockMapping(state, state.position - state.lineStart, flowIndent, props) && state.events[fallbackState.eventsLength]?.type === EVENT_ID.MAPPING) {
        state.depth--;
        return true;
      }
      restoreState(state, fallbackState);
    }
    if (atNewLine && (ch === 33 && props.tagStart !== NO_RANGE$1 || ch === 38 && props.anchorStart !== NO_RANGE$1)) break;
    if (!readTagProperty(state, props, nodeContext === CONTEXT_FLOW_IN) && !readAnchorProperty(state, props)) break;
    if (propertyStart === null) propertyStart = propertyState;
    if (skipSeparationSpace(state, true)) {
      atNewLine = true;
      allowBlockCollections = allowBlockStyles;
      if (state.lineIndent > parentIndent) indentStatus = 1;
      else if (state.lineIndent === parentIndent) indentStatus = 0;
      else indentStatus = -1;
    } else allowBlockCollections = false;
  }
  if (allowBlockCollections) allowBlockCollections = atNewLine || allowCompact;
  if (indentStatus === 1 || nodeContext === CONTEXT_BLOCK_OUT) {
    const flowIndent = nodeContext === CONTEXT_FLOW_IN || nodeContext === CONTEXT_FLOW_OUT ? parentIndent : parentIndent + 1;
    const blockIndent = state.position - state.lineStart;
    if (indentStatus === 1) if (allowBlockCollections && (readBlockSequence(state, blockIndent, props) || readBlockMapping(state, blockIndent, flowIndent, props)) || readFlowCollection(state, flowIndent, props)) hasContent = true;
    else {
      const ch = state.input.charCodeAt(state.position);
      if (propertyStart !== null && allowPropertyMapping && allowBlockStyles && !allowBlockCollections && ch !== 124 && ch !== 62) {
        const fallbackState = snapshotState(state);
        const propertyIndent = propertyStart.position - propertyStart.lineStart;
        restoreState(state, propertyStart);
        if (readBlockMapping(state, propertyIndent, flowIndent, emptyProperties()) && state.events[fallbackState.eventsLength]?.type === EVENT_ID.MAPPING) hasContent = true;
        else restoreState(state, fallbackState);
      }
      if (!hasContent && (allowBlockScalars && readBlockScalar(state, flowIndent, props) || readSingleQuotedScalar(state, flowIndent, props) || readDoubleQuotedScalar(state, flowIndent, props) || readAlias(state, props) || readPlainScalar(state, flowIndent, nodeContext, props))) hasContent = true;
    }
    else if (indentStatus === 0) hasContent = allowBlockCollections && readBlockSequence(state, blockIndent, props);
  }
  allowBlockScalars = allowBlockScalars && !hasContent;
  if (!hasContent && (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1 || allowBlockScalars)) {
    addScalarEvent(state, NO_RANGE$1, NO_RANGE$1, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.PLAIN);
    hasContent = true;
  }
  state.depth--;
  return hasContent || props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1;
}
function readDirective(state) {
  if (state.lineIndent > 0 || state.input.charCodeAt(state.position) !== 37) return false;
  state.position++;
  const nameStart = state.position;
  while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position))) state.position++;
  const name2 = state.input.slice(nameStart, state.position);
  const args = [];
  if (name2.length === 0) throwError(state, "directive name must not be less than one character in length");
  while (state.input.charCodeAt(state.position) !== 0 && !isEol(state.input.charCodeAt(state.position))) {
    while (isWhiteSpace(state.input.charCodeAt(state.position))) state.position++;
    if (state.input.charCodeAt(state.position) === 35 || isEol(state.input.charCodeAt(state.position)) || state.input.charCodeAt(state.position) === 0) break;
    const start = state.position;
    while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position))) state.position++;
    args.push(state.input.slice(start, state.position));
  }
  if (isEol(state.input.charCodeAt(state.position))) consumeLineBreak(state);
  if (name2 === "YAML") {
    if (state.directives.some((directive) => directive.kind === "yaml")) throwError(state, "duplication of %YAML directive");
    if (args.length !== 1) throwError(state, "YAML directive accepts exactly one argument");
    const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
    if (match === null) throwError(state, "ill-formed argument of the YAML directive");
    if (parseInt(match[1], 10) !== 1) throwError(state, "unacceptable YAML version of the document");
    state.directives.push({
      kind: "yaml",
      version: args[0]
    });
  } else if (name2 === "TAG") {
    if (args.length !== 2) throwError(state, "TAG directive accepts exactly two arguments");
    const [handle, prefix] = args;
    if (!PATTERN_TAG_HANDLE.test(handle)) throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
    if (HAS_OWN.call(state.tagHandlers, handle)) throwError(state, `there is a previously declared suffix for "${handle}" tag handle`);
    if (!PATTERN_TAG_PREFIX.test(prefix)) throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
    state.tagHandlers[handle] = prefix;
    state.directives.push({
      kind: "tag",
      handle,
      prefix
    });
  }
  return true;
}
function readDocument(state) {
  state.directives = [];
  state.tagHandlers = /* @__PURE__ */ Object.create(null);
  let hasDirectives = false;
  skipSeparationSpace(state, true);
  while (readDirective(state)) {
    hasDirectives = true;
    skipSeparationSpace(state, true);
  }
  let explicitStart = false;
  let explicitEnd = false;
  let allowCompact = true;
  if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 3))) {
    explicitStart = true;
    const markerLine = state.line;
    state.position += 3;
    skipSeparationSpace(state, true);
    allowCompact = state.line > markerLine;
  } else if (hasDirectives) throwError(state, "directives end mark is expected");
  const documentEventIndex = state.events.length;
  if (!explicitStart && state.position === state.lineStart && state.input.charCodeAt(state.position) === 46 && testDocumentSeparator(state)) {
    state.position += 3;
    skipSeparationSpace(state, true);
    return;
  }
  addDocumentEvent(state, explicitStart, false);
  if (!parseNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, allowCompact, allowCompact)) addEmptyScalarEvent(state);
  skipSeparationSpace(state, true);
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    explicitEnd = state.input.charCodeAt(state.position) === 46;
    if (explicitEnd) {
      const markerLine = state.line;
      state.position += 3;
      skipSeparationSpace(state, true);
      if (state.line === markerLine && state.position < state.length) throwError(state, "end of the stream or a document separator is expected");
    }
  }
  const documentEvent = state.events[documentEventIndex];
  if (documentEvent?.type === EVENT_ID.DOCUMENT) documentEvent.explicitEnd = explicitEnd;
  addPopEvent(state);
  if (!explicitEnd && state.position < state.length && !(state.position === state.lineStart && testDocumentSeparator(state))) throwError(state, "end of the stream or a document separator is expected");
}
function parseEvents(input, options) {
  const length = input.length;
  const state = {
    ...DEFAULT_PARSER_OPTIONS,
    ...options,
    input: `${input}\0`,
    length,
    position: 0,
    line: 0,
    lineStart: 0,
    lineIndent: 0,
    firstTabInLine: -1,
    depth: 0,
    directives: [],
    tagHandlers: /* @__PURE__ */ Object.create(null),
    events: []
  };
  const nullpos = input.indexOf("\0");
  if (nullpos !== -1) YAMLException.throwAt(input, nullpos, "null byte is not allowed in input", state.filename);
  if (state.input.charCodeAt(state.position) === 65279) state.position++;
  while (state.position < state.length) {
    skipSeparationSpace(state, true);
    if (state.position >= state.length) break;
    const documentStart = state.position;
    readDocument(state);
    if (state.position === documentStart)
      throwError(state, "can not read a document");
  }
  return state.events;
}
var DEFAULT_LOAD_OPTIONS = {
  ...DEFAULT_PARSER_OPTIONS,
  ...DEFAULT_CONSTRUCTOR_OPTIONS
};
function loadDocuments(input, options = {}) {
  const opts = {
    ...DEFAULT_LOAD_OPTIONS,
    ...options
  };
  const source = String(input);
  const PARSER_OPT_KEYS = Object.keys(DEFAULT_PARSER_OPTIONS);
  const CONSTRUCTOR_OPT_KEYS = Object.keys(DEFAULT_CONSTRUCTOR_OPTIONS);
  return constructFromEvents(parseEvents(source, pick(opts, PARSER_OPT_KEYS)), {
    ...pick(opts, CONSTRUCTOR_OPT_KEYS),
    source
  });
}
function load(input, options) {
  const documents = loadDocuments(input, options);
  if (documents.length === 0) throw new YAMLException("expected a document, but the input is empty");
  if (documents.length === 1) return documents[0];
  throw new YAMLException("expected a single document in the stream, but found more");
}
var Style = class {
  /** Whether to print the node's tag explicitly. */
  tagged = false;
  flow = false;
  singleQuoted = false;
  doubleQuoted = false;
  literal = false;
  folded = false;
};
var INVALID = Symbol("INVALID");
function buildRepresentTypes(schema) {
  const defaultTags = new Set([
    schema.defaultScalarTag,
    schema.defaultSequenceTag,
    schema.defaultMappingTag
  ].filter((t) => t !== void 0));
  const implicitScalars = schema.implicitScalarTags;
  const explicitTags = schema.tags.filter((t) => !(t.nodeKind === "scalar" && t.implicit) && !defaultTags.has(t));
  const defaultTagsLast = schema.tags.filter((t) => defaultTags.has(t));
  return [
    ...implicitScalars.map((tag) => ({
      tag,
      implicitTag: true
    })),
    ...explicitTags.map((tag) => ({
      tag,
      implicitTag: false
    })),
    ...defaultTagsLast.map((tag) => ({
      tag,
      implicitTag: true
    }))
  ];
}
function matchTag(state, object) {
  for (let index = 0, length = state.representTypes.length; index < length; index += 1) {
    const { tag, implicitTag } = state.representTypes[index];
    if (tag.identify(object)) {
      let tagName;
      if (tag.matchByTagPrefix) tagName = tag.representTagName(object);
      else tagName = tag.tagName;
      return {
        tag,
        tagName,
        implicitTag
      };
    }
  }
  return null;
}
function build(state, object) {
  if (!state.noRefs && object !== null && typeof object === "object") {
    const existing = state.refs.get(object);
    if (existing) {
      if (existing.anchor === void 0) existing.anchor = `ref_${state.refCounter++}`;
      return {
        kind: "alias",
        tag: "",
        style: new Style(),
        anchor: existing.anchor
      };
    }
  }
  const matched = matchTag(state, object);
  if (!matched) {
    if (object === void 0) return INVALID;
    if (state.skipInvalid) return INVALID;
    throw new YAMLException(`unacceptable kind of an object to dump ${Object.prototype.toString.call(object)}`);
  }
  const { tag, tagName, implicitTag } = matched;
  const nodeTagName = implicitTag ? tagName : tagNameShort(tagName);
  if (tag.nodeKind === "scalar") {
    const style2 = new Style();
    style2.tagged = !implicitTag;
    return {
      kind: "scalar",
      tag: nodeTagName,
      style: style2,
      value: tag.represent(object)
    };
  }
  if (tag.nodeKind === "sequence") {
    const container = tag.represent(object);
    const style2 = new Style();
    style2.tagged = !implicitTag;
    const node2 = {
      kind: "sequence",
      tag: nodeTagName,
      style: style2,
      items: []
    };
    if (!state.noRefs) state.refs.set(object, node2);
    for (let index = 0, length = container.length; index < length; index += 1) {
      let item = build(state, container[index]);
      if (item === INVALID && container[index] === void 0) item = build(state, null);
      if (item === INVALID) continue;
      node2.items.push(item);
    }
    return node2;
  }
  const map = tag.represent(object);
  const style = new Style();
  style.tagged = !implicitTag;
  const node = {
    kind: "mapping",
    tag: nodeTagName,
    style,
    items: []
  };
  if (!state.noRefs) state.refs.set(object, node);
  for (const [objectKey, objectValue] of map) {
    const key = build(state, objectKey);
    if (key === INVALID) continue;
    const value = build(state, objectValue);
    if (value === INVALID) continue;
    node.items.push({
      key,
      value
    });
  }
  return node;
}
function jsToAst(input, schema, options = {}) {
  const root = build({
    representTypes: buildRepresentTypes(schema),
    noRefs: options.noRefs ?? false,
    skipInvalid: options.skipInvalid ?? false,
    refs: /* @__PURE__ */ new Map(),
    refCounter: 0
  }, input);
  return [{
    contents: root === INVALID ? null : root,
    directives: []
  }];
}
var VISIT_BREAK = Symbol("visit:break");
var VISIT_SKIP = Symbol("visit:skip");
function visitNode(node, visitor, ctx) {
  const control = visitor(node, ctx);
  if (control === VISIT_BREAK) return true;
  if (control === VISIT_SKIP) return false;
  const depth = ctx.depth + 1;
  switch (node.kind) {
    case "sequence":
      for (const item of node.items) if (visitNode(item, visitor, {
        depth,
        parent: node,
        isKey: false
      })) return true;
      break;
    case "mapping":
      for (const { key, value } of node.items) {
        if (visitNode(key, visitor, {
          depth,
          parent: node,
          isKey: true
        })) return true;
        if (visitNode(value, visitor, {
          depth,
          parent: node,
          isKey: false
        })) return true;
      }
      break;
  }
  return false;
}
function visit(documents, visitor) {
  for (const doc of documents) if (doc.contents && visitNode(doc.contents, visitor, {
    depth: 0,
    parent: null,
    isKey: false
  })) return;
}
var CHAR_BOM = 65279;
var CHAR_TAB = 9;
var CHAR_LINE_FEED = 10;
var CHAR_CARRIAGE_RETURN = 13;
var CHAR_SPACE = 32;
var CHAR_EXCLAMATION = 33;
var CHAR_DOUBLE_QUOTE = 34;
var CHAR_SHARP = 35;
var CHAR_PERCENT = 37;
var CHAR_AMPERSAND = 38;
var CHAR_SINGLE_QUOTE = 39;
var CHAR_ASTERISK = 42;
var CHAR_COMMA = 44;
var CHAR_MINUS = 45;
var CHAR_COLON = 58;
var CHAR_EQUALS = 61;
var CHAR_GREATER_THAN = 62;
var CHAR_QUESTION = 63;
var CHAR_COMMERCIAL_AT = 64;
var CHAR_LEFT_SQUARE_BRACKET = 91;
var CHAR_RIGHT_SQUARE_BRACKET = 93;
var CHAR_GRAVE_ACCENT = 96;
var CHAR_LEFT_CURLY_BRACKET = 123;
var CHAR_VERTICAL_LINE = 124;
var CHAR_RIGHT_CURLY_BRACKET = 125;
var ESCAPE_SEQUENCES = {};
ESCAPE_SEQUENCES[0] = "\\0";
ESCAPE_SEQUENCES[7] = "\\a";
ESCAPE_SEQUENCES[8] = "\\b";
ESCAPE_SEQUENCES[9] = "\\t";
ESCAPE_SEQUENCES[10] = "\\n";
ESCAPE_SEQUENCES[11] = "\\v";
ESCAPE_SEQUENCES[12] = "\\f";
ESCAPE_SEQUENCES[13] = "\\r";
ESCAPE_SEQUENCES[27] = "\\e";
ESCAPE_SEQUENCES[34] = '\\"';
ESCAPE_SEQUENCES[92] = "\\\\";
ESCAPE_SEQUENCES[133] = "\\N";
ESCAPE_SEQUENCES[160] = "\\_";
ESCAPE_SEQUENCES[8232] = "\\L";
ESCAPE_SEQUENCES[8233] = "\\P";
var DEFAULT_PRESENTER_OPTIONS = {
  indent: 2,
  seqNoIndent: false,
  seqInlineFirst: true,
  sortKeys: false,
  lineWidth: 80,
  flowBracketPadding: false,
  flowSkipCommaSpace: false,
  flowSkipColonSpace: false,
  quoteFlowKeys: false,
  quoteStyle: "single",
  forceQuotes: false,
  tagBeforeAnchor: false
};
function nodeTagShort(node) {
  return node.style.tagged ? node.tag : tagNameShort(node.tag);
}
function createPresenterState(options) {
  const opts = {
    ...DEFAULT_PRESENTER_OPTIONS,
    ...options
  };
  return {
    ...opts,
    defaultScalarTagName: opts.schema.defaultScalarTag.tagName
  };
}
function encodeNonPrintable(character) {
  const string = character.toString(16).toUpperCase();
  const handle = character <= 255 ? "x" : "u";
  const length = character <= 255 ? 2 : 4;
  return `\\${handle}${"0".repeat(length - string.length)}${string}`;
}
function indentString(string, spaces) {
  const ind = " ".repeat(spaces);
  let position = 0;
  let result = "";
  const length = string.length;
  while (position < length) {
    let line;
    const next = string.indexOf("\n", position);
    if (next === -1) {
      line = string.slice(position);
      position = length;
    } else {
      line = string.slice(position, next + 1);
      position = next + 1;
    }
    if (line.length && line !== "\n") result += ind;
    result += line;
  }
  return result;
}
function generateNextLine(state, level) {
  return `
${" ".repeat(state.indent * level)}`;
}
function scalarLayout(state, level) {
  const indent = state.indent * Math.max(1, level);
  return {
    indent,
    blockIndent: level === 0 ? state.indent + 1 : state.indent,
    lineWidth: state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent)
  };
}
function isWhitespace(c) {
  return c === CHAR_SPACE || c === CHAR_TAB;
}
function startsWithDocumentSeparator(string) {
  const marker = string.charCodeAt(0);
  if (marker !== CHAR_MINUS && marker !== 46 || string.charCodeAt(1) !== marker || string.charCodeAt(2) !== marker) return false;
  if (string.length === 3) return true;
  const following = string.charCodeAt(3);
  return isWhitespace(following) || following === CHAR_CARRIAGE_RETURN || following === CHAR_LINE_FEED;
}
function isPrintable(c) {
  return c >= 32 && c <= 126 || c >= 161 && c <= 55295 && c !== 8232 && c !== 8233 || c >= 57344 && c <= 65533 && c !== CHAR_BOM || c >= 65536 && c <= 1114111;
}
function isNsCharOrWhitespace(c) {
  return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
}
function isPlainSafe(c, prev, inblock) {
  const cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
  const cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
  return (inblock ? cIsNsCharOrWhitespace : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar && (inblock || c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET);
}
function isPlainSafeFirst(c) {
  return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
}
function isPlainSafeAtStart(string, inblock) {
  const first = codePointAt(string, 0);
  if (isPlainSafeFirst(first)) return true;
  if (string.length > 1 && (first === CHAR_MINUS || first === CHAR_QUESTION || first === CHAR_COLON)) {
    const second = codePointAt(string, 1);
    return !isWhitespace(second) && isPlainSafe(second, first, inblock);
  }
  return false;
}
function isPlainSafeLast(c) {
  return !isWhitespace(c) && c !== CHAR_COLON;
}
function codePointAt(string, pos) {
  const first = string.charCodeAt(pos);
  let second;
  if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
    second = string.charCodeAt(pos + 1);
    if (second >= 56320 && second <= 57343) return (first - 55296) * 1024 + second - 56320 + 65536;
  }
  return first;
}
function needIndentIndicator(string) {
  return /^\n* /.test(string);
}
var STYLE_PLAIN = 1;
var STYLE_SINGLE = 2;
var STYLE_LITERAL = 3;
var STYLE_FOLDED = 4;
var STYLE_DOUBLE = 5;
function chooseScalarStyle(state, string, layout, singleLineOnly, forceQuote, inblock) {
  const { blockIndent, lineWidth } = layout;
  let i;
  let char = 0;
  let prevChar = -1;
  let hasLineBreak = false;
  let hasFoldableLine = false;
  const shouldTrackWidth = lineWidth !== -1;
  let previousLineBreak = -1;
  let plain = !startsWithDocumentSeparator(string) && isPlainSafeAtStart(string, inblock) && isPlainSafeLast(codePointAt(string, string.length - 1));
  if (singleLineOnly || forceQuote) for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
    char = codePointAt(string, i);
    if (!isPrintable(char)) return STYLE_DOUBLE;
    plain = plain && isPlainSafe(char, prevChar, inblock);
    prevChar = char;
  }
  else {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (char === CHAR_LINE_FEED) {
        hasLineBreak = true;
        if (shouldTrackWidth) {
          hasFoldableLine = hasFoldableLine || i - previousLineBreak - 1 > lineWidth && !isMoreIndented(string[previousLineBreak + 1]);
          previousLineBreak = i;
        }
      } else if (!isPrintable(char)) return STYLE_DOUBLE;
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
    hasFoldableLine = hasFoldableLine || shouldTrackWidth && i - previousLineBreak - 1 > lineWidth && !isMoreIndented(string[previousLineBreak + 1]);
  }
  if (!hasLineBreak && !hasFoldableLine) {
    if (plain && !forceQuote) return STYLE_PLAIN;
    return state.quoteStyle === "double" ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  if (blockIndent > 9 && needIndentIndicator(string)) return STYLE_DOUBLE;
  return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
}
function renderScalarStyle(string, style, layout) {
  const { indent, blockIndent, lineWidth } = layout;
  switch (style) {
    case STYLE_PLAIN:
      return encodeFlowBreaks(string, indent);
    case STYLE_SINGLE:
      return `'${encodeFlowBreaks(string, indent).replace(/'/g, "''")}'`;
    case STYLE_LITERAL:
      return "|" + blockHeader(string, blockIndent) + dropEndingNewline(indentString(string, indent));
    case STYLE_FOLDED:
      return ">" + blockHeader(string, blockIndent) + dropEndingNewline(indentString(foldBlockScalar(string, lineWidth), indent));
    case STYLE_DOUBLE:
      return `"${escapeString(string)}"`;
  }
}
function resolveScalarStyle(state, node, layout, iskey, inblock) {
  const singleLineOnly = iskey || !inblock;
  if (node.style.singleQuoted) return STYLE_SINGLE;
  if (node.style.doubleQuoted) return STYLE_DOUBLE;
  if (!singleLineOnly) {
    if (node.style.literal) return STYLE_LITERAL;
    if (node.style.folded) return STYLE_FOLDED;
  }
  const string = node.value;
  if (string.length === 0) {
    if (node.style.tagged || state.schema.resolveImplicitScalarTag(string).tag.tagName === node.tag) return STYLE_PLAIN;
    return state.quoteStyle === "double" ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  const style = chooseScalarStyle(state, string, layout, singleLineOnly, state.forceQuotes && !iskey, inblock);
  if (style === STYLE_PLAIN && !node.style.tagged && state.schema.resolveImplicitScalarTag(string).tag.tagName !== node.tag) return state.quoteStyle === "double" ? STYLE_DOUBLE : STYLE_SINGLE;
  return style;
}
function blockHeader(string, indentPerLevel) {
  const indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
  const clip = string[string.length - 1] === "\n";
  return `${indentIndicator}${clip && (string[string.length - 2] === "\n" || string === "\n") ? "+" : clip ? "" : "-"}
`;
}
function encodeFlowBreaks(string, indent) {
  let nextLF = string.indexOf("\n");
  if (nextLF === -1) return string;
  const pad = " ".repeat(indent);
  let result = string.slice(0, nextLF);
  const lineRe = /(\n+)([^\n]*)/g;
  lineRe.lastIndex = nextLF;
  let match;
  while (match = lineRe.exec(string)) {
    const breaks = match[1].length;
    const line = match[2];
    result += "\n".repeat(breaks + 1) + pad + line;
  }
  return result;
}
function dropEndingNewline(string) {
  return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
}
function isMoreIndented(char) {
  return char === " " || char === "	";
}
function foldBlockScalar(string, width) {
  const lineRe = /(\n+)([^\n]*)/g;
  let nextLF = string.indexOf("\n");
  if (nextLF === -1) nextLF = string.length;
  lineRe.lastIndex = nextLF;
  let result = foldLine(string.slice(0, nextLF), width);
  let prevMoreIndented = string[0] === "\n" || isMoreIndented(string[0]);
  let moreIndented;
  let match;
  while (match = lineRe.exec(string)) {
    const prefix = match[1];
    const line = match[2];
    moreIndented = line !== "" && isMoreIndented(line[0]);
    result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
    prevMoreIndented = moreIndented;
  }
  return result;
}
function foldLine(line, width) {
  if (line === "" || isMoreIndented(line[0])) return line;
  const breakRe = / [^ \t]/g;
  let match;
  let start = 0;
  let end;
  let curr = 0;
  let next = 0;
  let result = "";
  while (match = breakRe.exec(line)) {
    next = match.index;
    if (next - start > width) {
      end = curr > start ? curr : next;
      result += `
${line.slice(start, end)}`;
      start = end + 1;
    }
    curr = next;
  }
  result += "\n";
  if (line.length - start > width && curr > start) result += `${line.slice(start, curr)}
${line.slice(curr + 1)}`;
  else result += line.slice(start);
  return result.slice(1);
}
function escapeString(string) {
  let result = "";
  let char = 0;
  for (let i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
    char = codePointAt(string, i);
    const escapeSeq = ESCAPE_SEQUENCES[char];
    if (escapeSeq) {
      result += escapeSeq;
      continue;
    }
    if (isPrintable(char)) {
      result += string[i];
      if (char >= 65536) result += string[i + 1];
      continue;
    }
    result += encodeNonPrintable(char);
  }
  return result;
}
function writeFlowSequence(state, level, node) {
  let result = "";
  for (let index = 0, length = node.items.length; index < length; index += 1) {
    const item = writeNode(state, level, node.items[index], {});
    if (result !== "") result += `,${!state.flowSkipCommaSpace ? " " : ""}`;
    result += item;
  }
  const pad = state.flowBracketPadding && result !== "" ? " " : "";
  return `[${pad}${result}${pad}]`;
}
function writeBlockSequence(state, level, node, compact) {
  let result = "";
  for (let index = 0, length = node.items.length; index < length; index += 1) {
    const item = writeNode(state, level + 1, node.items[index], {
      block: true,
      compact: state.seqInlineFirst,
      isblockseq: true
    });
    if (!compact || result !== "") result += generateNextLine(state, level);
    if (item === "" || CHAR_LINE_FEED === item.charCodeAt(0)) result += "-";
    else result += "- ";
    result += item;
  }
  return result;
}
function writeFlowMapping(state, level, node) {
  let result = "";
  const items = sortMappingItems(state, node.items);
  for (const { key, value } of items) {
    let pairBuffer = "";
    if (result !== "") pairBuffer += `,${!state.flowSkipCommaSpace ? " " : ""}`;
    const keyText = writeNode(state, level, key, { iskey: true });
    const explicitPair = keyText.length > 1024;
    if (explicitPair) pairBuffer += "? ";
    else if (state.quoteFlowKeys) pairBuffer += '"';
    const valueText = writeNode(state, level, value, {});
    const sep = state.flowSkipColonSpace || valueText === "" ? "" : " ";
    pairBuffer += `${keyText}${state.quoteFlowKeys && !explicitPair ? '"' : ""}:${sep}${valueText}`;
    result += pairBuffer;
  }
  const pad = state.flowBracketPadding && result !== "" ? " " : "";
  return `{${pad}${result}${pad}}`;
}
function sortKeyValue(key) {
  return key.kind === "scalar" ? key.value : key;
}
function sortMappingItems(state, items) {
  if (!state.sortKeys) return items;
  const copy = items.slice();
  if (state.sortKeys === true) copy.sort((a, b) => {
    const x = sortKeyValue(a.key);
    const y = sortKeyValue(b.key);
    if (x < y) return -1;
    if (x > y) return 1;
    return 0;
  });
  else {
    const fn = state.sortKeys;
    copy.sort((a, b) => fn(sortKeyValue(a.key), sortKeyValue(b.key)));
  }
  return copy;
}
function writeBlockMapping(state, level, node, compact) {
  let result = "";
  const items = sortMappingItems(state, node.items);
  for (let index = 0, length = items.length; index < length; index += 1) {
    let pairBuffer = "";
    if (!compact || result !== "") pairBuffer += generateNextLine(state, level);
    const { key, value } = items[index];
    const keyIsBlock = (key.kind === "mapping" || key.kind === "sequence") && !key.style.flow && key.items.length !== 0 || key.kind === "scalar" && (key.style.literal || key.style.folded);
    const keyText = keyIsBlock ? writeNode(state, level + 1, key, {
      block: true,
      compact: true,
      isblockseq: !cannotBeCompact(state, key, level + 1)
    }) : writeNode(state, level + 1, key, {
      block: true,
      compact: true,
      iskey: true
    });
    const keyHasLineBreak = key.kind === "scalar" && key.value.indexOf("\n") !== -1;
    const explicitPair = keyIsBlock || keyHasLineBreak || keyText.length > 1024;
    if (explicitPair) if (keyText && CHAR_LINE_FEED === keyText.charCodeAt(0)) pairBuffer += "?";
    else pairBuffer += "? ";
    pairBuffer += keyText;
    if (explicitPair) pairBuffer += generateNextLine(state, level);
    const valueText = writeNode(state, level + 1, value, {
      block: true,
      compact: explicitPair,
      isblockseq: explicitPair && !cannotBeCompact(state, value, level + 1)
    });
    const keyIsBareProps = key.kind === "scalar" && key.value === "" && keyText !== "" && keyText.charCodeAt(keyText.length - 1) !== CHAR_SINGLE_QUOTE && keyText.charCodeAt(keyText.length - 1) !== CHAR_DOUBLE_QUOTE;
    const keyColonSep = !explicitPair && (key.kind === "alias" || keyIsBareProps) ? " " : "";
    if (valueText === "" || CHAR_LINE_FEED === valueText.charCodeAt(0)) pairBuffer += `${keyColonSep}:`;
    else pairBuffer += `${keyColonSep}: `;
    pairBuffer += valueText;
    result += pairBuffer;
  }
  return result;
}
function cannotBeCompact(state, node, level) {
  return node.style.tagged || node.anchor !== void 0 || state.indent < 2 && level > 0;
}
function writeNode(state, level, node, ctx) {
  if (node.kind === "alias") return `*${node.anchor}`;
  const { block = false, iskey = false, isblockseq = false } = ctx;
  let compact = ctx.compact ?? false;
  const hasAnchor = node.anchor !== void 0;
  if (cannotBeCompact(state, node, level)) compact = false;
  let body;
  let shouldPrintTag = node.style.tagged;
  const useBlockCollection = block && (node.kind === "mapping" || node.kind === "sequence") && !node.style.flow && node.items.length !== 0;
  if (node.kind === "mapping") if (useBlockCollection) body = writeBlockMapping(state, level, node, compact);
  else body = writeFlowMapping(state, level, node);
  else if (node.kind === "sequence") if (useBlockCollection) if (state.seqNoIndent && !isblockseq && level > 0) body = writeBlockSequence(state, level - 1, node, compact);
  else body = writeBlockSequence(state, level, node, compact);
  else body = writeFlowSequence(state, level, node);
  else {
    const layout = scalarLayout(state, level);
    const style = resolveScalarStyle(state, node, layout, iskey, block);
    body = renderScalarStyle(node.value, style, layout);
    shouldPrintTag = node.style.tagged || style !== STYLE_PLAIN && node.tag !== state.defaultScalarTagName;
  }
  if (useBlockCollection && compact && level > 0 && state.indent > 2) body = `${" ".repeat(state.indent - 2)}${body}`;
  if (shouldPrintTag || hasAnchor) {
    const props = [];
    const tag = shouldPrintTag ? nodeTagShort(node) : null;
    const anchor = hasAnchor ? `&${node.anchor}` : null;
    if (state.tagBeforeAnchor) {
      if (tag !== null) props.push(tag);
      if (anchor !== null) props.push(anchor);
    } else {
      if (anchor !== null) props.push(anchor);
      if (tag !== null) props.push(tag);
    }
    const sep = body === "" || body.charCodeAt(0) === CHAR_LINE_FEED ? "" : " ";
    body = `${props.join(" ")}${sep}${body}`;
  }
  return body;
}
function rootStartsOwnLine(node) {
  return (node.kind === "sequence" || node.kind === "mapping") && !node.style.flow && node.items.length !== 0 && !node.style.tagged && node.anchor === void 0;
}
function isOpenEnded(node) {
  let leaf = node;
  while ((leaf.kind === "sequence" || leaf.kind === "mapping") && !leaf.style.flow && leaf.items.length !== 0) leaf = leaf.kind === "sequence" ? leaf.items[leaf.items.length - 1] : leaf.items[leaf.items.length - 1].value;
  if (leaf.kind !== "scalar" || !(leaf.style.literal || leaf.style.folded)) return false;
  const { value } = leaf;
  return value.endsWith("\n\n") || value === "\n";
}
function writeDocumentDirectives(doc) {
  let result = "";
  for (const directive of doc.directives) {
    if (directive.kind === "yaml") {
      result += `%YAML ${directive.version}
`;
      continue;
    }
    const { handle, prefix } = directive;
    result += `%TAG ${handle} ${prefix}
`;
  }
  return result;
}
function present(documents, options) {
  const state = createPresenterState(options);
  let result = "";
  let previousEnded = false;
  for (let index = 0; index < documents.length; index += 1) {
    const doc = documents[index];
    const directives = writeDocumentDirectives(doc);
    const hasDirectives = directives !== "";
    const marker = doc.explicitStart || hasDirectives || index > 0 && !previousEnded;
    result += directives;
    if (doc.contents === null) {
      if (marker) result += "---\n";
    } else if (marker) {
      const body = writeNode(state, 0, doc.contents, {
        block: true,
        compact: true
      });
      const sep = body === "" ? "" : hasDirectives || rootStartsOwnLine(doc.contents) ? "\n" : " ";
      result += `---${sep}${body}
`;
    } else result += writeNode(state, 0, doc.contents, {
      block: true,
      compact: true
    }) + "\n";
    previousEnded = doc.explicitEnd || doc.contents !== null && isOpenEnded(doc.contents);
    if (previousEnded) result += "...\n";
  }
  return result;
}
var DEFAULT_DUMP_OPTIONS = {
  ...DEFAULT_PRESENTER_OPTIONS,
  schema: DUMP_SCHEMA,
  skipInvalid: false,
  noRefs: false,
  flowLevel: -1,
  transform: () => {
  }
};
function dump(input, options = {}) {
  const opts = {
    ...DEFAULT_DUMP_OPTIONS,
    ...options
  };
  const documents = jsToAst(input, opts.schema, {
    noRefs: opts.noRefs,
    skipInvalid: opts.skipInvalid
  });
  if (opts.flowLevel >= 0) visit(documents, (node, ctx) => {
    if (ctx.depth < opts.flowLevel) return;
    node.style.flow = true;
    return VISIT_SKIP;
  });
  opts.transform(documents);
  return present(documents, {
    ...pick(opts, Object.keys(DEFAULT_PRESENTER_OPTIONS)),
    schema: opts.schema
  });
}
var EVENT_DOCUMENT = EVENT_ID.DOCUMENT;
var EVENT_SEQUENCE = EVENT_ID.SEQUENCE;
var EVENT_MAPPING = EVENT_ID.MAPPING;
var EVENT_SCALAR = EVENT_ID.SCALAR;
var EVENT_ALIAS = EVENT_ID.ALIAS;
var EVENT_POP = EVENT_ID.POP;
var SCALAR_STYLE_PLAIN = SCALAR_STYLE.PLAIN;
var SCALAR_STYLE_SINGLE_QUOTED = SCALAR_STYLE.SINGLE_QUOTED;
var SCALAR_STYLE_DOUBLE_QUOTED = SCALAR_STYLE.DOUBLE_QUOTED;
var SCALAR_STYLE_LITERAL_BLOCK = SCALAR_STYLE.LITERAL_BLOCK;
var SCALAR_STYLE_FOLDED_BLOCK = SCALAR_STYLE.FOLDED_BLOCK;
var COLLECTION_STYLE_BLOCK = COLLECTION_STYLE.BLOCK;
var COLLECTION_STYLE_FLOW = COLLECTION_STYLE.FLOW;
var CHOMPING_CLIP = CHOMPING_MODE.CLIP;
var CHOMPING_STRIP = CHOMPING_MODE.STRIP;
var CHOMPING_KEEP = CHOMPING_MODE.KEEP;

// src/host/events.ts
var PREFIX = "/api/prompt-library";
var clients = /* @__PURE__ */ new Set();
var keepAliveTimer;
function ensureKeepAlive() {
  if (keepAliveTimer || clients.size === 0) return;
  keepAliveTimer = setInterval(() => {
    if (clients.size === 0) {
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      keepAliveTimer = void 0;
      return;
    }
    for (const res of clients) {
      try {
        res.write(":\n\n");
      } catch {
        clients.delete(res);
      }
    }
  }, 15e3);
}
var dataChangedRoute = {
  kind: "prefix",
  path: `${PREFIX}/events`,
  handler(req, res) {
    if (req.method !== "GET") {
      res.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
      res.end("method not allowed");
      return;
    }
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "x-accel-buffering": "no"
    });
    res.write(":\n\n");
    clients.add(res);
    ensureKeepAlive();
    const cleanup = () => {
      clients.delete(res);
      ensureKeepAlive();
    };
    req.on("close", cleanup);
    res.on("close", cleanup);
  }
};
function emitDataChanged() {
  if (clients.size === 0) return;
  const frame = "event: data-changed\ndata: {}\n\n";
  for (const res of clients) {
    try {
      res.write(frame);
    } catch {
      clients.delete(res);
    }
  }
}
function emitExportDownload(name2, json2) {
  if (clients.size === 0) return false;
  const payload = JSON.stringify({ name: name2, json: json2 });
  const frame = `event: export-download
data: ${payload}

`;
  for (const res of clients) {
    try {
      res.write(frame);
    } catch {
      clients.delete(res);
    }
  }
  return true;
}
function emitWorkbenchInstalled() {
  if (clients.size === 0) return;
  const frame = "event: workbench-installed\ndata: {}\n\n";
  for (const res of clients) {
    try {
      res.write(frame);
    } catch {
      clients.delete(res);
    }
  }
}

// src/host/paths.ts
import { homedir } from "node:os";
import { join } from "node:path";
var DEFAULT_DSH_HOME = join(homedir(), ".dsh");
function dshHome() {
  return process.env.DSH_HOME || DEFAULT_DSH_HOME;
}
function dataDir() {
  return join(dshHome(), "prompt-library");
}
function downloadDir() {
  const home = process.env.USERPROFILE || homedir();
  return join(home, "Downloads");
}
function storePath() {
  return join(dataDir(), "prompts.json");
}
function dbDir() {
  return join(dataDir(), "db");
}
function dbPath() {
  return join(dbDir(), "prompts.db");
}
function newspapersDir() {
  return join(dataDir(), "newspapers");
}
function storageDir() {
  return join(dshHome(), "storages");
}
function workspaceStorePath() {
  return join(storageDir(), "workspace.json");
}
function systemSettingsPath() {
  return join(dshHome(), "settings.yaml");
}
var SETTINGS_NAMESPACE = "prompt-library";
function logDir() {
  return join(dataDir(), "log");
}
function backupDir() {
  return join(dataDir(), "backup");
}
function characterDir() {
  return join(dataDir(), "character");
}
function soulPath() {
  return join(characterDir(), "SOUL.md");
}
function personasDir() {
  return join(characterDir(), "personas");
}
function personaSoulPath(personaId) {
  return join(personasDir(), `${personaId}.md`);
}
function sessionPromptsDir() {
  return join(dataDir(), "session-prompts");
}
function sessionPromptPath(id) {
  return join(sessionPromptsDir(), `${id}.md`);
}

// src/host/text.ts
function stripBom(text) {
  return text.charCodeAt(0) === 65279 ? text.slice(1) : text;
}

// src/host/store.ts
var db;
function getDb() {
  if (db) return db;
  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });
  const next = createDatabase(path);
  next.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  next.exec(`
    CREATE TABLE IF NOT EXISTS prompts (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      body         TEXT NOT NULL,
      tags         TEXT,
      summary      TEXT,
      sourceBody   TEXT,
      aiRefined    INTEGER NOT NULL DEFAULT 0,
      updatedAt    INTEGER NOT NULL,
      usageCount   INTEGER NOT NULL DEFAULT 0,
      lastUsedAt   INTEGER NOT NULL DEFAULT 0
    );
  `);
  try {
    next.exec("ALTER TABLE prompts ADD COLUMN createdAt INTEGER NOT NULL DEFAULT 0");
    next.exec("UPDATE prompts SET createdAt = updatedAt WHERE createdAt = 0");
  } catch {
  }
  try {
    next.exec("ALTER TABLE prompts ADD COLUMN aiRefinedAt INTEGER NOT NULL DEFAULT 0");
  } catch {
  }
  next.exec(`
    CREATE TABLE IF NOT EXISTS usage_log (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      promptId TEXT NOT NULL,
      usedAt   INTEGER NOT NULL
    );
  `);
  next.exec("CREATE INDEX IF NOT EXISTS idx_usage_log_usedAt ON usage_log (usedAt)");
  next.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      name       TEXT PRIMARY KEY,
      createdAt  INTEGER NOT NULL
    );
  `);
  next.exec(`
    CREATE TABLE IF NOT EXISTS trash (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      body         TEXT NOT NULL,
      tags         TEXT,
      summary      TEXT,
      sourceBody   TEXT,
      aiRefined    INTEGER NOT NULL DEFAULT 0,
      updatedAt    INTEGER NOT NULL,
      usageCount   INTEGER NOT NULL DEFAULT 0,
      lastUsedAt   INTEGER NOT NULL DEFAULT 0,
      createdAt    INTEGER NOT NULL DEFAULT 0,
      deletedAt    INTEGER NOT NULL
    );
  `);
  next.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  next.exec(`
    CREATE TABLE IF NOT EXISTS prompt_skill_links (
      promptId  TEXT PRIMARY KEY,
      skillName TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
  next.exec(`
    CREATE TABLE IF NOT EXISTS pl_points_log (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      kind      TEXT NOT NULL,
      points    INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      dayKey    TEXT NOT NULL
    );
  `);
  next.exec("CREATE INDEX IF NOT EXISTS idx_pl_points_createdAt ON pl_points_log (createdAt)");
  next.exec(`
    CREATE TABLE IF NOT EXISTS pl_achievement_progress (
      id        TEXT PRIMARY KEY,
      progress  INTEGER NOT NULL DEFAULT 0,
      updatedAt INTEGER NOT NULL
    );
  `);
  next.exec(`
    CREATE TABLE IF NOT EXISTS stats_history (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      stats     TEXT NOT NULL,
      comment   TEXT,
      createdAt INTEGER NOT NULL
    );
  `);
  next.exec(`
    CREATE TABLE IF NOT EXISTS personas (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      enabled   INTEGER NOT NULL DEFAULT 1,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      body      TEXT NOT NULL DEFAULT ''
    );
  `);
  try {
    next.exec("ALTER TABLE personas ADD COLUMN body TEXT NOT NULL DEFAULT ''");
  } catch {
  }
  next.exec(`
    CREATE TABLE IF NOT EXISTS persona_scope_bindings (
      path      TEXT PRIMARY KEY,
      personaId TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
  next.exec(`
    CREATE TABLE IF NOT EXISTS prompt_scope_bindings (
      path      TEXT PRIMARY KEY,
      promptIds TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
  next.exec(`
    CREATE TABLE IF NOT EXISTS session_prompts (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      tags       TEXT,
      enabled    INTEGER NOT NULL DEFAULT 1,
      createdAt  INTEGER NOT NULL,
      updatedAt  INTEGER NOT NULL,
      usageCount INTEGER NOT NULL DEFAULT 0,
      lastUsedAt INTEGER NOT NULL DEFAULT 0,
      body       TEXT NOT NULL DEFAULT ''
    );
  `);
  try {
    next.exec("ALTER TABLE session_prompts ADD COLUMN body TEXT NOT NULL DEFAULT ''");
  } catch {
  }
  next.exec(`
    CREATE TABLE IF NOT EXISTS session_scope_bindings (
      sessionId  TEXT PRIMARY KEY,
      personaId  TEXT,
      promptIds  TEXT,
      updatedAt  INTEGER NOT NULL
    );
  `);
  next.exec(`
    CREATE TABLE IF NOT EXISTS newspapers (
      date       TEXT NOT NULL,
      lang       TEXT NOT NULL,
      report     TEXT,
      news       TEXT,
      newsSource TEXT,
      createdAt  INTEGER NOT NULL,
      PRIMARY KEY (date, lang)
    );
  `);
  next.exec(`
    CREATE TABLE IF NOT EXISTS pl_daily_mood (
      dayKey    TEXT PRIMARY KEY,
      happy     INTEGER NOT NULL DEFAULT 0,
      sad       INTEGER NOT NULL DEFAULT 0,
      updatedAt INTEGER NOT NULL
    );
  `);
  next.exec(`
    CREATE TABLE IF NOT EXISTS pl_prompt_versions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      promptId   TEXT NOT NULL,
      version    INTEGER NOT NULL,
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      tags       TEXT,
      summary    TEXT,
      sourceBody TEXT,
      reason     TEXT NOT NULL DEFAULT 'update',
      snapshotAt INTEGER NOT NULL
    );
  `);
  next.exec("CREATE INDEX IF NOT EXISTS idx_pl_prompt_versions_prompt ON pl_prompt_versions (promptId, version)");
  syncTagsFromPrompts(next);
  seedDefaultPromptIfEmpty(next);
  db = next;
  seedPointsLedger(next);
  migrateLegacyJsonIfNeeded().catch(() => {
  });
  try {
    migrateMdContentToDb();
  } catch {
  }
  return next;
}
function closeDb() {
  if (db) {
    try {
      db.close();
    } catch {
    }
    db = void 0;
  }
}
function reopenDb() {
  closeDb();
  getDb();
}
function checkpointDb() {
  try {
    getDb().exec("PRAGMA wal_checkpoint(TRUNCATE)");
  } catch {
  }
}
function getMetaValue(key) {
  try {
    const row = getDb().prepare("SELECT value FROM meta WHERE key = ?").get(key);
    return row?.value ?? "";
  } catch {
    return "";
  }
}
function setMetaValue(key, value) {
  try {
    getDb().prepare(
      "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(key, value);
  } catch {
  }
}
function readUiLangSync() {
  try {
    const text = readFileSync(systemSettingsPath(), "utf8");
    const pref = load(text)?.locale?.preference;
    return typeof pref === "string" && pref.toLowerCase().startsWith("en") ? "en" : "zh";
  } catch {
    return "zh";
  }
}
function seedDefaultPromptIfEmpty(cur) {
  const row = cur.prepare("SELECT COUNT(*) AS c FROM prompts").get();
  if ((row.c ?? 0) > 0) return;
  const now = Date.now();
  const isZh = readUiLangSync() === "zh";
  const body = isZh ? [
    "\u8FD9\u662F\u4F60\u4FDD\u5B58\u7684\u7B2C\u4E00\u6761\u63D0\u793A\u8BCD\uFF0C\u4E5F\u662F\u8BCD\u5E93\u7684\u4E0A\u624B\u5F15\u5BFC\u3002",
    "",
    "\u4F60\u53EF\u4EE5\u8FD9\u6837\u4F7F\u7528\u672C\u63D2\u4EF6\uFF1A",
    "\xB7 \u5728\u8F93\u5165\u6846\u8F93\u5165 `/prompts -add \u628A\u8FD9\u6BB5\u597D\u7684\u63D0\u793A\u8BCD\u4FDD\u5B58\u4E0B\u6765`\uFF0C\u4E0D\u9519\u8FC7\u4EFB\u4F55\u597D\u8BCD\uFF1B",
    "\xB7 \u8F93\u5165 `/prompts -AI \u8BF7\u628A\u8FD9\u6BB5\u4F18\u5316\u5F97\u66F4\u4E13\u4E1A`\uFF0CAI \u4F18\u5316\u540E\u7ED3\u679C\u4F1A\u6253\u5370\u51FA\u6765\u4F9B\u590D\u5236\uFF1B",
    "\xB7 \u8F93\u5165 `/prompts -h` \u67E5\u770B\u5B8C\u6574\u4F7F\u7528\u624B\u518C\u3002",
    "",
    "\u4E5F\u53EF\u4EE5\u76F4\u63A5\u7F16\u8F91\u8FD9\u6761\u63D0\u793A\u8BCD\uFF0C\u66FF\u6362\u4E3A\u4F60\u81EA\u5DF1\u7684\u5185\u5BB9\uFF0C\u5E76\u5728\u8BBE\u7F6E\u91CC\u4E3A\u5B83\u6253\u4E0A\u6807\u7B7E\u3002"
  ].join("\n") : [
    "This is the first prompt you saved and your quick guide to the prompt library.",
    "",
    "Here is how to use this plugin:",
    "\xB7 Type `/prompts -add save this great prompt` in the input box to keep any good prompt;",
    "\xB7 Type `/prompts -AI polish this to be more professional` and the polished result is printed for you to copy;",
    "\xB7 Type `/prompts -h` to see the full manual.",
    "",
    "You can also edit this prompt and replace it with your own content, and tag it in the settings."
  ].join("\n");
  const prompt = {
    id: randomUUID(),
    title: isZh ? "\u6B22\u8FCE\u4F7F\u7528\u8BCD\u5E93" : "Welcome to the Prompt Library",
    body,
    // 不能在此调用 ensureTags()：它会重新进入 getDb()，而 db 尚未赋值导致无限递归。
    // 标签的落表由紧随其后的 syncTagsFromPrompts(cur) 用当前连接完成。默认数据仅单标签。
    tags: isZh ? ["\u6B22\u8FCE"] : ["Welcome"],
    updatedAt: now,
    createdAt: now,
    usageCount: 0,
    lastUsedAt: 0,
    aiRefined: false
  };
  cur.prepare(
    `INSERT INTO prompts
       (id, title, body, tags, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(prompt.id, prompt.title, prompt.body, tagsToJson(prompt.tags), 0, now, 0, 0, now);
  syncTagsFromPrompts(cur);
}
var WELCOME_SYSTEM = [
  "\uFF08\u9996\u6B21\u4F7F\u7528\u5F15\u5BFC\uFF09\u8FD9\u662F\u4F60\u4E0E\u5E26\u300C\u8BCD\u5E93\u300D\u63D2\u4EF6\u7684\u52A9\u624B\u7B2C\u4E00\u6B21\u5BF9\u8BDD\u3002",
  "\u8BF7\u5728\u672C\u6B21\u4F1A\u8BDD\u7684\u3010\u7B2C\u4E00\u6761\u56DE\u590D\u3011\u4E2D\u7528\u4E00\u53E5\u7B80\u6D01\u3001\u81EA\u7136\u3001\u53CB\u597D\u7684\u8BDD\u6B22\u8FCE\u7528\u6237\u5373\u53EF\u3002",
  "\u4E0D\u8981\u8F93\u51FA\u63D2\u4EF6\u4F7F\u7528\u624B\u518C\u5168\u6587\uFF1B\u82E5\u7528\u6237\u4E3B\u52A8\u8BE2\u95EE\u63D2\u4EF6\u529F\u80FD\uFF0C\u53EF\u5F15\u5BFC\u5176\u8F93\u5165 /prompts -h \u67E5\u770B\u4F7F\u7528\u624B\u518C\u3002"
].join("\n");
var welcomeBound = false;
var welcomeScope;
function welcomePromptOnce(scope) {
  if (welcomeBound) {
    return welcomeScope === scope ? WELCOME_SYSTEM : "";
  }
  let shown = false;
  try {
    const row = getDb().prepare("SELECT value FROM meta WHERE key = 'welcomeShown'").get();
    shown = row?.value === "1";
  } catch {
  }
  if (shown) {
    welcomeBound = true;
    welcomeScope = void 0;
    return "";
  }
  welcomeBound = true;
  welcomeScope = scope;
  try {
    getDb().prepare("INSERT INTO meta (key, value) VALUES ('welcomeShown', '1') ON CONFLICT(key) DO NOTHING").run();
  } catch {
  }
  return WELCOME_SYSTEM;
}
function rowToPrompt(r) {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    tags: r.tags ? JSON.parse(r.tags) : void 0,
    summary: r.summary ?? void 0,
    sourceBody: r.sourceBody ?? void 0,
    aiRefined: r.aiRefined === 1,
    aiRefinedAt: r.aiRefinedAt ?? 0,
    updatedAt: r.updatedAt,
    createdAt: r.createdAt,
    usageCount: r.usageCount,
    lastUsedAt: r.lastUsedAt
  };
}
function tagsToJson(tags) {
  return Array.isArray(tags) && tags.length > 0 ? JSON.stringify(tags) : null;
}
function ensureTag(name2) {
  const t = name2.trim();
  if (!t) return t;
  const cur = getDb();
  cur.prepare("INSERT OR IGNORE INTO tags (name, createdAt) VALUES (?, ?)").run(t, Date.now());
  return t;
}
function ensureTags(names) {
  if (!Array.isArray(names)) return [];
  const out = [];
  for (const n of names) {
    const t = ensureTag(n);
    if (t) out.push(t);
  }
  return out;
}
function syncTagsFromPrompts(cur) {
  try {
    const rows = cur.prepare("SELECT tags FROM prompts WHERE tags IS NOT NULL").all();
    const insert = cur.prepare("INSERT OR IGNORE INTO tags (name, createdAt) VALUES (?, ?)");
    const now = Date.now();
    cur.exec("BEGIN");
    try {
      for (const row of rows) {
        const list = JSON.parse(row.tags);
        for (const t of list) {
          const name2 = t.trim();
          if (name2) insert.run(name2, now);
        }
      }
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
  } catch {
  }
}
function rowToTrash(r) {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    tags: r.tags ? JSON.parse(r.tags) : void 0,
    summary: r.summary ?? void 0,
    sourceBody: r.sourceBody ?? void 0,
    aiRefined: r.aiRefined === 1,
    updatedAt: r.updatedAt,
    createdAt: r.createdAt,
    usageCount: r.usageCount,
    lastUsedAt: r.lastUsedAt,
    deletedAt: r.deletedAt
  };
}
async function migrateLegacyJsonIfNeeded() {
  const legacy = storePath();
  let text;
  try {
    text = await readFile(legacy, "utf8");
  } catch {
    return;
  }
  if (hasAnyPrompts()) return;
  let parsed;
  try {
    parsed = JSON.parse(stripBom(text));
  } catch {
    return;
  }
  const list = Array.isArray(parsed?.prompts) ? parsed.prompts : [];
  const cur = getDb();
  const stmt = cur.prepare(`
    INSERT OR IGNORE INTO prompts
      (id, title, body, tags, summary, sourceBody, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  cur.exec("BEGIN");
  try {
    for (const raw of list) {
      const p = raw;
      if (typeof p.id !== "string" || typeof p.body !== "string") continue;
      stmt.run(
        p.id,
        typeof p.title === "string" ? p.title : "",
        p.body,
        tagsToJson(p.tags),
        typeof p.summary === "string" ? p.summary : null,
        typeof p.sourceBody === "string" ? p.sourceBody : null,
        p.aiRefined ? 1 : 0,
        typeof p.updatedAt === "number" ? p.updatedAt : 0,
        typeof p.usageCount === "number" ? p.usageCount : 0,
        typeof p.lastUsedAt === "number" ? p.lastUsedAt : 0,
        typeof p.createdAt === "number" ? p.createdAt : typeof p.updatedAt === "number" ? p.updatedAt : 0
      );
    }
    cur.exec("COMMIT");
  } catch (e) {
    cur.exec("ROLLBACK");
    throw e;
  }
  try {
    await rm(legacy);
  } catch {
  }
}
function migrateMdContentToDb() {
  if (!getDefaultPersonaSoul()) {
    try {
      const content = stripBom(readFileSync(soulPath(), "utf8")).trim();
      if (content) setDefaultPersonaSoul(content);
    } catch {
    }
  }
  for (const p of listPersonas()) {
    if (p.body) continue;
    try {
      const content = stripBom(readFileSync(personaSoulPath(p.id), "utf8")).trim();
      if (content) updatePersonaMeta(p.id, { body: content });
    } catch {
    }
  }
  for (const r of listSessionPromptRecords()) {
    if (r.body) continue;
    try {
      const content = stripBom(readFileSync(sessionPromptPath(r.id), "utf8")).trim();
      if (content) updateSessionPromptMeta(r.id, { body: content });
    } catch {
    }
  }
  if (listNewspaperDates().length === 0) {
    for (const lang of ["zh", "en"]) {
      const dir = join2(newspapersDir(), lang);
      let names = [];
      try {
        names = readdirSync(dir).filter((n) => /^\d{4}-\d{2}-\d{2}\.md$/.test(n));
      } catch {
      }
      for (const name2 of names) {
        const date = name2.slice(0, 10);
        try {
          const issue = parseLegacyNewspaperMd(date, lang, stripBom(readFileSync(join2(dir, name2), "utf8")));
          if (issue) setNewspaperRecord(issue);
        } catch {
        }
      }
    }
  }
}
function parseLegacyNewspaperMd(date, lang, content) {
  const report = [];
  const news = [];
  let section = null;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("## ")) {
      const lower = trimmed.toLowerCase();
      if (lower.includes("daily report") || lower.includes("\u6BCF\u65E5\u65E5\u62A5")) section = "report";
      else if (lower.includes("achievement") || lower.includes("\u6210\u5C31\u901F\u62A5")) section = "news";
      else section = null;
      continue;
    }
    if (section === "report") {
      const m = trimmed.match(/^-\s*\*\*(.+?)\*\*\s*[:：]\s*(.*)$/);
      if (m) report.push({ headline: m[1].trim(), body: m[2].trim() });
    } else if (section === "news") {
      const m = trimmed.match(/^(\d+)\.\s*\*\*(.+?)\*\*\s*(?:—\s*)?(.*)$/);
      if (m) news.push({ title: m[2].trim(), summary: m[3].trim(), url: "" });
    }
  }
  if (report.length === 0 && news.length === 0) return void 0;
  return {
    date,
    lang,
    report: report.length > 0 ? report : null,
    news: news.length > 0 ? news : null,
    newsSource: "achievement"
  };
}
var FRESH_MS = 7 * 24 * 60 * 60 * 1e3;
function sortPrompts(prompts) {
  const now = Date.now();
  const fresh = prompts.filter((p) => now - p.createdAt < FRESH_MS).sort((a, b) => b.createdAt - a.createdAt);
  const freshIds = new Set(fresh.map((p) => p.id));
  const rest = prompts.filter((p) => !freshIds.has(p.id));
  const byUsage = [...rest].sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return b.updatedAt - a.updatedAt;
  });
  const topUsed = byUsage.slice(0, 3);
  const topUsedIds = new Set(topUsed.map((p) => p.id));
  const others = rest.filter((p) => !topUsedIds.has(p.id)).sort((a, b) => {
    if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
    return b.usageCount - a.usageCount;
  });
  return [...fresh, ...topUsed, ...others];
}
function findAll() {
  const cur = getDb();
  const rows = cur.prepare("SELECT * FROM prompts").all();
  return rows.map(rowToPrompt);
}
function hasAnyPrompts() {
  const cur = getDb();
  const row = cur.prepare("SELECT EXISTS(SELECT 1 FROM prompts) AS n").get();
  return (row?.n ?? 0) > 0;
}
async function enforceMaxCount(maxCount, autoLearnTag) {
  const cur = getDb();
  const { total } = cur.prepare("SELECT COUNT(*) AS total FROM prompts").get();
  if (total <= maxCount) return;
  const toRemove = total - maxCount;
  const learnTags = /* @__PURE__ */ new Set(["auto-learned"]);
  if (autoLearnTag?.trim()) learnTags.add(autoLearnTag.trim());
  const isAutoLearned = (tagsJson) => {
    if (!tagsJson) return false;
    return [...learnTags].some((tag) => tagsJson.includes(`"${tag}"`));
  };
  const rows = cur.prepare("SELECT id, tags, usageCount, updatedAt FROM prompts").all();
  const byLeastUsed = (a, b) => a.usageCount - b.usageCount || a.updatedAt - b.updatedAt;
  const candidates = [...rows.filter((r) => isAutoLearned(r.tags)).sort(byLeastUsed)];
  if (candidates.length < toRemove) {
    candidates.push(...rows.filter((r) => !isAutoLearned(r.tags)).sort(byLeastUsed));
  }
  const rm6 = cur.prepare("DELETE FROM prompts WHERE id = ?");
  for (const { id } of candidates.slice(0, toRemove)) rm6.run(id);
}
function listPrompts() {
  try {
    return Promise.resolve(sortPrompts(findAll()));
  } catch (e) {
    return Promise.reject(e);
  }
}
function getSkillNameForPrompt(promptId) {
  if (!db) return void 0;
  const row = db.prepare("SELECT skillName FROM prompt_skill_links WHERE promptId = ?").get(promptId);
  return row?.skillName;
}
function setSkillNameForPrompt(promptId, skillName) {
  if (!db) return;
  db.prepare(
    "INSERT INTO prompt_skill_links (promptId, skillName, updatedAt) VALUES (?, ?, ?) ON CONFLICT(promptId) DO UPDATE SET skillName = excluded.skillName, updatedAt = excluded.updatedAt"
  ).run(promptId, skillName, Date.now());
}
function getPromptIdBySkillName(skillName) {
  if (!db) return void 0;
  const row = db.prepare("SELECT promptId FROM prompt_skill_links WHERE skillName = ? LIMIT 1").get(skillName);
  return row?.promptId;
}
function isPromptActive(id) {
  if (!db || !id) return false;
  return !!db.prepare("SELECT id FROM prompts WHERE id = ?").get(id);
}
function isPromptTrashed(id) {
  if (!db || !id) return false;
  return !!db.prepare("SELECT id FROM trash WHERE id = ?").get(id);
}
function createPrompt(input) {
  try {
    const now = Date.now();
    const tags = ensureTags(Array.isArray(input.tags) ? input.tags : []).slice(0, 1);
    const prompt = {
      id: randomUUID(),
      title: clampTitle(input.title.trim()),
      body: input.body,
      tags,
      summary: input.summary?.trim() || void 0,
      updatedAt: now,
      createdAt: now,
      usageCount: 0,
      lastUsedAt: 0
    };
    const cur = getDb();
    cur.prepare(
      `INSERT INTO prompts
           (id, title, body, tags, summary, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
    ).run(
      prompt.id,
      prompt.title,
      prompt.body,
      tagsToJson(prompt.tags),
      prompt.summary ?? null,
      now,
      0,
      0,
      now
    );
    void getSettings().then((s) => enforceMaxCount(s.maxPromptCount, s.autoLearnTag));
    snapshotPromptVersion(prompt, "create");
    void addPoints("collect");
    return Promise.resolve(prompt);
  } catch (e) {
    return Promise.reject(e);
  }
}
function updatePrompt(id, patch) {
  try {
    const cur = getDb();
    const existing = cur.prepare("SELECT * FROM prompts WHERE id = ?").get(id);
    if (!existing) return Promise.resolve(void 0);
    const current = rowToPrompt(existing);
    const nextTags = patch.tags !== void 0 ? ensureTags(patch.tags).slice(0, 1) : void 0;
    const aiRefined = patch.aiRefined !== void 0 ? patch.aiRefined : current.aiRefined;
    const aiRefinedAt = patch.aiRefinedAt !== void 0 ? patch.aiRefinedAt : aiRefined && !current.aiRefined ? Date.now() : current.aiRefinedAt ?? 0;
    const next = {
      ...current,
      title: patch.title !== void 0 ? clampTitle(patch.title.trim()) : current.title,
      body: patch.body !== void 0 ? patch.body : current.body,
      tags: nextTags !== void 0 ? nextTags : current.tags,
      summary: patch.summary !== void 0 ? patch.summary : current.summary,
      sourceBody: patch.sourceBody !== void 0 ? patch.sourceBody : current.sourceBody,
      aiRefined,
      aiRefinedAt,
      updatedAt: Date.now(),
      usageCount: patch.usageCount !== void 0 ? patch.usageCount : current.usageCount,
      lastUsedAt: patch.lastUsedAt !== void 0 ? patch.lastUsedAt : current.lastUsedAt
    };
    cur.prepare(
      `UPDATE prompts SET
           title = ?, body = ?, tags = ?, summary = ?, sourceBody = ?,
           aiRefined = ?, aiRefinedAt = ?, updatedAt = ?, usageCount = ?, lastUsedAt = ?
         WHERE id = ?`
    ).run(
      next.title,
      next.body,
      tagsToJson(next.tags),
      next.summary ?? null,
      next.sourceBody ?? null,
      next.aiRefined ? 1 : 0,
      next.aiRefinedAt ?? 0,
      next.updatedAt,
      next.usageCount,
      next.lastUsedAt,
      id
    );
    const contentChanged = next.title !== current.title || next.body !== current.body || next.summary !== current.summary || next.sourceBody !== current.sourceBody;
    if (contentChanged) {
      snapshotPromptVersion(next, aiRefined && !current.aiRefined ? "refine" : "update");
    }
    if (aiRefined && !current.aiRefined) void addPoints("ai");
    return Promise.resolve(next);
  } catch (e) {
    return Promise.reject(e);
  }
}
function recordUsage(id) {
  try {
    const cur = getDb();
    const ts = Date.now();
    cur.prepare("UPDATE prompts SET usageCount = usageCount + 1, lastUsedAt = ?, updatedAt = ? WHERE id = ?").run(ts, ts, id);
    cur.prepare("INSERT INTO usage_log (promptId, usedAt) VALUES (?, ?)").run(id, ts);
    void addPoints("use");
    const row = cur.prepare("SELECT * FROM prompts WHERE id = ?").get(id);
    if (!row) return Promise.resolve(void 0);
    return Promise.resolve(rowToPrompt(row));
  } catch (e) {
    return Promise.reject(e);
  }
}
function buildTitle(body) {
  const fallback = "Learned Prompt";
  const firstLine = (body.split(/\r?\n/) ?? [""]).map((l) => l.trim()).find((l) => l.length > 0);
  if (!firstLine) return fallback;
  const cleaned = firstLine.replace(/^\s*(#{1,6}\s*|\*\s*|-{1,3}\s*|\d+[.、)]\s*|>\s*)/, "").replace(/^[\s\p{P}\p{S}]+/u, "").trim();
  if (!cleaned) return fallback;
  if (cleaned.length <= TITLE_MAX_LEN) return cleaned;
  const segment = cleaned.slice(0, TITLE_MAX_LEN + 6);
  const m = segment.match(/[。！？!?；;…]/);
  const cut = m ? m.index + 1 : TITLE_MAX_LEN;
  return clampTitle(cleaned.slice(0, Math.max(1, cut)) + "\u2026");
}
function bigramSimilarity(a, b) {
  const grams = (s) => {
    const set = /* @__PURE__ */ new Set();
    const t = s.toLowerCase().replace(/\s+/g, "");
    for (let i = 0; i < t.length; i++) set.add(t.slice(i, i + 2));
    if (!t) set.add("");
    return set;
  };
  const A = grams(a);
  const B = grams(b);
  const union = A.size + B.size;
  if (union === 0) return 1;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (union - inter);
}
function findNearDuplicatePrompt(body, threshold = 0.8) {
  const t = body.trim();
  if (!t) return void 0;
  const rows = getDb().prepare("SELECT * FROM prompts").all();
  for (const r of rows) {
    const b = r.body.trim();
    if (!b) continue;
    const ratio = Math.min(t.length, b.length) / Math.max(t.length, b.length);
    if (ratio < 0.5) continue;
    if (bigramSimilarity(t, b) >= threshold) return rowToPrompt(r);
  }
  return void 0;
}
function trashRowToPrompt(r) {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    tags: r.tags ? JSON.parse(r.tags) : void 0,
    summary: r.summary ?? void 0,
    sourceBody: r.sourceBody ?? void 0,
    aiRefined: r.aiRefined === 1,
    updatedAt: r.updatedAt,
    createdAt: r.createdAt,
    usageCount: r.usageCount,
    lastUsedAt: r.lastUsedAt
  };
}
function restoreTrashRow(r) {
  const cur = getDb();
  const tags = r.tags ? JSON.parse(r.tags) : [];
  ensureTags(tags);
  cur.prepare(
    `INSERT OR REPLACE INTO prompts
         (id, title, body, tags, summary, sourceBody, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    r.id,
    r.title,
    r.body,
    r.tags,
    r.summary,
    r.sourceBody,
    r.aiRefined,
    r.updatedAt,
    r.usageCount,
    r.lastUsedAt,
    r.createdAt
  );
  cur.prepare("DELETE FROM trash WHERE id = ?").run(r.id);
}
function applyLearnedSummary(prompt, summary) {
  const s = summary?.trim();
  if (!s || prompt.summary) return prompt;
  try {
    getDb().prepare("UPDATE prompts SET summary = ?, updatedAt = ? WHERE id = ?").run(s, Date.now(), prompt.id);
    return { ...prompt, summary: s };
  } catch {
    return prompt;
  }
}
function autoLearn(body, tag, skipEnrich, summary) {
  try {
    const normalized = body.trim().toLowerCase();
    const collisions = getDb().prepare("SELECT id FROM prompts WHERE lower(body) = ?").all(normalized);
    if (collisions.length > 0) {
      const row = getDb().prepare("SELECT * FROM prompts WHERE id = ?").get(collisions[0].id);
      const existing = rowToPrompt(row);
      return Promise.resolve(existing).then(async (prompt2) => {
        void continueEnrich(prompt2, !!skipEnrich);
        return applyLearnedSummary(prompt2, summary);
      });
    }
    const trashHit = getDb().prepare("SELECT * FROM trash WHERE lower(body) = ?").get(normalized);
    if (trashHit) {
      restoreTrashRow(trashHit);
      const prompt2 = trashRowToPrompt(trashHit);
      void continueEnrich(prompt2, !!skipEnrich);
      emitDataChanged();
      return Promise.resolve(prompt2).then((p) => applyLearnedSummary(p, summary));
    }
    const near = findNearDuplicatePrompt(body);
    if (near) {
      return Promise.resolve(near).then(async (prompt2) => {
        void continueEnrich(prompt2, !!skipEnrich);
        return applyLearnedSummary(prompt2, summary);
      });
    }
    const title = buildTitle(body);
    const now = Date.now();
    const prompt = {
      id: randomUUID(),
      title,
      body: body.trim(),
      tags: ensureTags(tag ? [tag] : ["auto-learned"]).slice(0, 1),
      summary: summary?.trim() || void 0,
      updatedAt: now,
      createdAt: now,
      usageCount: 0,
      lastUsedAt: 0,
      // 已在界面完成 AI 润色的正文视为已完善，跳过后台 AI 完善
      aiRefined: !!skipEnrich
    };
    getDb().prepare(
      `INSERT INTO prompts
           (id, title, body, tags, summary, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      prompt.id,
      prompt.title,
      prompt.body,
      tagsToJson(prompt.tags),
      prompt.summary ?? null,
      prompt.aiRefined ? 1 : 0,
      now,
      0,
      0,
      now
    );
    void getSettings().then((s) => enforceMaxCount(s.maxPromptCount, s.autoLearnTag));
    void continueEnrich(prompt, !!skipEnrich);
    emitDataChanged();
    return Promise.resolve(prompt);
  } catch (e) {
    return Promise.reject(e);
  }
}
async function continueEnrich(prompt, skipEnrich) {
  if (skipEnrich) return;
  const settings = await getSettings();
  if (settings.aiEnrichEnabled && isAiAvailable()) {
    enrichLearnedPrompt(prompt, settings).then(() => emitDataChanged()).catch(() => {
    });
  }
}
async function refinePrompt(id) {
  try {
    const row = getDb().prepare("SELECT * FROM prompts WHERE id = ?").get(id);
    if (!row) return false;
    const prompt = rowToPrompt(row);
    if (prompt.aiRefined) return true;
    const settings = await getSettings();
    if (!settings.aiEnrichEnabled || !isAiAvailable()) return false;
    await enrichLearnedPrompt(prompt, settings);
    emitDataChanged();
    return true;
  } catch {
    return false;
  }
}
function deletePrompt(id) {
  try {
    const cur = getDb();
    const existing = cur.prepare("SELECT * FROM prompts WHERE id = ?").get(id);
    if (!existing) return Promise.resolve(false);
    const now = Date.now();
    cur.exec("BEGIN");
    try {
      cur.prepare(
        `INSERT INTO trash
             (id, title, body, tags, summary, sourceBody, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt, deletedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        existing.id,
        existing.title,
        existing.body,
        existing.tags,
        existing.summary,
        existing.sourceBody,
        existing.aiRefined,
        existing.updatedAt,
        existing.usageCount,
        existing.lastUsedAt,
        existing.createdAt,
        now
      );
      cur.prepare("DELETE FROM prompts WHERE id = ?").run(id);
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return Promise.resolve(true);
  } catch (e) {
    return Promise.reject(e);
  }
}
var TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1e3;
function listTrash() {
  try {
    const cur = getDb();
    const deadline = Date.now() - TRASH_RETENTION_MS;
    cur.prepare("DELETE FROM trash WHERE deletedAt < ?").run(deadline);
    const rows = cur.prepare("SELECT * FROM trash ORDER BY deletedAt DESC").all();
    return Promise.resolve(rows.map(rowToTrash));
  } catch (e) {
    return Promise.reject(e);
  }
}
function restorePrompts(ids) {
  try {
    const list = Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : [];
    if (list.length === 0) return Promise.resolve(0);
    const cur = getDb();
    const select = cur.prepare("SELECT * FROM trash WHERE id = ?");
    const insert = cur.prepare(
      `INSERT OR REPLACE INTO prompts
         (id, title, body, tags, summary, sourceBody, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const remove = cur.prepare("DELETE FROM trash WHERE id = ?");
    let restored = 0;
    cur.exec("BEGIN");
    try {
      for (const id of list) {
        const row = select.get(id);
        if (!row) continue;
        const tags = row.tags ? JSON.parse(row.tags) : [];
        ensureTags(tags);
        insert.run(
          row.id,
          row.title,
          row.body,
          row.tags,
          row.summary,
          row.sourceBody,
          row.aiRefined,
          row.updatedAt,
          row.usageCount,
          row.lastUsedAt,
          row.createdAt
        );
        remove.run(id);
        restored++;
      }
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return Promise.resolve(restored);
  } catch (e) {
    return Promise.reject(e);
  }
}
function deleteTrash(ids) {
  try {
    const list = Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : [];
    if (list.length === 0) return Promise.resolve(0);
    const cur = getDb();
    const rm6 = cur.prepare("DELETE FROM trash WHERE id = ?");
    let deleted = 0;
    cur.exec("BEGIN");
    try {
      for (const id of list) {
        deleted += Number(rm6.run(id).changes);
      }
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return Promise.resolve(deleted);
  } catch (e) {
    return Promise.reject(e);
  }
}
function emptyTrash() {
  try {
    const cur = getDb();
    const result = cur.prepare("DELETE FROM trash").run();
    return Promise.resolve(Number(result.changes));
  } catch (e) {
    return Promise.reject(e);
  }
}
function exportPrompts(ids) {
  try {
    const all = findAll().sort((a, b) => a.title.localeCompare(b.title));
    const prompts = ids && ids.length > 0 ? all.filter((p) => ids.includes(p.id)) : all;
    return Promise.resolve({ version: 1, exportedAt: Date.now(), prompts });
  } catch (e) {
    return Promise.reject(e);
  }
}
function importPrompts(raw, opts) {
  try {
    const list = Array.isArray(raw) ? raw : typeof raw === "object" && raw !== null && Array.isArray(raw.prompts) ? raw.prompts : [];
    const cur = getDb();
    const upsert = cur.prepare(`
      INSERT INTO prompts
        (id, title, body, tags, summary, sourceBody, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, body = excluded.body, tags = excluded.tags,
        summary = excluded.summary, sourceBody = excluded.sourceBody,
        aiRefined = excluded.aiRefined, updatedAt = excluded.updatedAt,
        usageCount = excluded.usageCount, lastUsedAt = excluded.lastUsedAt,
        createdAt = excluded.createdAt
    `);
    const now = Date.now();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const items = [];
    cur.exec("BEGIN");
    try {
      for (const rawItem of list) {
        if (typeof rawItem !== "object" || rawItem === null) {
          skipped++;
          items.push({ title: "", status: "skipped" });
          continue;
        }
        const p = rawItem;
        const body = typeof p.body === "string" ? p.body : "";
        if (!body.trim()) {
          skipped++;
          items.push({
            title: typeof p.title === "string" ? p.title.trim() : "",
            status: "skipped"
          });
          continue;
        }
        const id = typeof p.id === "string" && p.id ? p.id : randomUUID();
        const title = typeof p.title === "string" && p.title.trim() ? clampTitle(p.title.trim()) : buildTitle(body);
        const tags = Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === "string").map((t) => t.trim()).filter(Boolean) : void 0;
        if (Array.isArray(tags)) ensureTags(tags);
        const summary = typeof p.summary === "string" ? p.summary : void 0;
        const sourceBody = typeof p.sourceBody === "string" ? p.sourceBody : void 0;
        const aiRefined = p.aiRefined ? 1 : 0;
        const updatedAt = typeof p.updatedAt === "number" ? p.updatedAt : now;
        const createdAt = typeof p.createdAt === "number" ? p.createdAt : updatedAt;
        const usageCount = opts?.keepUsage ? typeof p.usageCount === "number" ? p.usageCount : 0 : 0;
        const lastUsedAt = opts?.keepUsage ? typeof p.lastUsedAt === "number" ? p.lastUsedAt : 0 : 0;
        const existing = cur.prepare("SELECT id FROM prompts WHERE id = ?").get(id);
        upsert.run(
          id,
          title,
          body,
          tagsToJson(tags),
          summary ?? null,
          sourceBody ?? null,
          aiRefined,
          updatedAt,
          usageCount,
          lastUsedAt,
          createdAt
        );
        if (existing) updated++;
        else imported++;
        items.push({ title, status: existing ? "updated" : "imported" });
      }
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return Promise.resolve({ imported, updated, skipped, items });
  } catch (e) {
    return Promise.reject(e);
  }
}
function restoreFromJson(raw) {
  try {
    const cur = getDb();
    cur.exec("BEGIN");
    try {
      cur.exec("DELETE FROM prompts");
      cur.exec("DELETE FROM trash");
      cur.exec("DELETE FROM tags");
      cur.exec("DELETE FROM usage_log");
      cur.exec("DELETE FROM prompt_skill_links");
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return importPrompts(raw, { keepUsage: true }).then((r) => ({ imported: r.imported }));
  } catch (e) {
    return Promise.reject(e);
  }
}
function createTag(name2) {
  try {
    const t = name2.trim();
    if (!t) return Promise.reject(new Error("tag name empty"));
    return Promise.resolve(ensureTag(t));
  } catch (e) {
    return Promise.reject(e);
  }
}
function listTags() {
  try {
    const cur = getDb();
    const tagRows = cur.prepare("SELECT name FROM tags ORDER BY name").all();
    const counts = /* @__PURE__ */ new Map();
    for (const row of tagRows) counts.set(row.name, 0);
    const promptRows = cur.prepare("SELECT tags FROM prompts WHERE tags IS NOT NULL").all();
    for (const row of promptRows) {
      const list = JSON.parse(row.tags);
      for (const t of list) {
        const name2 = t.trim();
        if (!name2) continue;
        if (counts.has(name2)) counts.set(name2, (counts.get(name2) ?? 0) + 1);
      }
    }
    const tags = Array.from(counts.entries()).map(([name2, count]) => ({ name: name2, count }));
    tags.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return Promise.resolve(tags);
  } catch (e) {
    return Promise.reject(e);
  }
}
var WEEK_MS = 7 * 24 * 60 * 60 * 1e3;
async function computeLibraryStats() {
  try {
    const cur = getDb();
    const all = findAll();
    const total = all.length;
    const totalUsage = all.reduce((s, p) => s + p.usageCount, 0);
    const used = all.filter((p) => p.usageCount > 0);
    const topUsed = [...used].sort((a, b) => b.usageCount - a.usageCount || b.lastUsedAt - a.lastUsedAt).slice(0, 5).map((p) => ({ title: p.title, usageCount: p.usageCount, lastUsedAt: p.lastUsedAt }));
    const recentUsed = used.filter((p) => p.lastUsedAt > 0).sort((a, b) => b.lastUsedAt - a.lastUsedAt).slice(0, 5).map((p) => ({ title: p.title, lastUsedAt: p.lastUsedAt }));
    const trashRow = cur.prepare("SELECT COUNT(*) AS c FROM trash").get();
    const tagStats = await listTags();
    const now = Date.now();
    const weekAgo = now - WEEK_MS;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1e3;
    const usedIn7Days = all.filter((p) => p.lastUsedAt > weekAgo).length;
    const usedIn30Days = all.filter((p) => p.lastUsedAt > monthAgo).length;
    const longestUnused = [...all].filter((p) => p.lastUsedAt === 0 && p.createdAt < monthAgo).sort((a, b) => a.createdAt - b.createdAt).slice(0, 3).map((p) => ({
      title: p.title,
      days: Math.floor((now - p.createdAt) / (24 * 60 * 60 * 1e3))
    }));
    const totalBodyLength = all.reduce((sum, p) => sum + p.body.length, 0);
    const avgBodyLength = total > 0 ? Math.round(totalBodyLength / total) : 0;
    const aiRefinedCount = all.filter((p) => p.aiRefined).length;
    const aiRefinedPct = total > 0 ? Math.round(aiRefinedCount / total * 100) : 0;
    const addedIn7Days = all.filter((p) => p.createdAt > weekAgo).length;
    const addedIn30Days = all.filter((p) => p.createdAt > monthAgo).length;
    const usageRows7 = cur.prepare("SELECT promptId FROM usage_log WHERE usedAt > ?").all(weekAgo);
    const countByPrompt = /* @__PURE__ */ new Map();
    for (const r of usageRows7) countByPrompt.set(r.promptId, (countByPrompt.get(r.promptId) ?? 0) + 1);
    const topUsed7 = [];
    if (countByPrompt.size > 0) {
      const byId = new Map(all.map((p) => [p.id, p.title]));
      const sorted = [...countByPrompt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      for (const [id, count] of sorted) topUsed7.push({ title: byId.get(id) ?? "\uFF08\u5DF2\u5220\u9664\uFF09", count });
    }
    const aiRefinedIn7 = cur.prepare("SELECT COUNT(*) AS c FROM prompts WHERE aiRefined = 1 AND aiRefinedAt > ?").get(weekAgo).c;
    const settings = await getSettings();
    const autoLearnTags = new Set(["auto-learned", settings.autoLearnTag?.trim()].filter(Boolean));
    const autoLearnedCount = all.filter((p) => (p.tags ?? []).some((t) => autoLearnTags.has(t))).length;
    return Promise.resolve({
      total,
      totalUsage,
      usedCount: used.length,
      unusedCount: total - used.length,
      topUsed,
      recentUsed,
      tagStats,
      trashCount: trashRow?.c ?? 0,
      usedIn7Days,
      usedIn30Days,
      longestUnused,
      totalBodyLength,
      avgBodyLength,
      aiRefinedCount,
      aiRefinedPct,
      addedIn7Days,
      addedIn30Days,
      topUsed7,
      aiRefinedIn7,
      autoLearnedCount
    });
  } catch (e) {
    return Promise.reject(e);
  }
}
async function computeHeatmap(days = 90) {
  try {
    const cur = getDb();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1e3;
    const rows = cur.prepare("SELECT usedAt FROM usage_log WHERE usedAt > ?").all(cutoff);
    const counts = /* @__PURE__ */ new Map();
    for (const r of rows) {
      if (!r.usedAt || r.usedAt <= 0) continue;
      const d = new Date(r.usedAt);
      const key = `${d.getDay()}:${d.getHours()}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const cells = [];
    for (const [key, count] of counts) {
      const [weekday, hour] = key.split(":").map((n) => Number(n));
      cells.push({ weekday, hour, count });
    }
    cells.sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);
    return Promise.resolve(cells);
  } catch (e) {
    return Promise.reject(e);
  }
}
async function computeWeeklyStats() {
  try {
    const cur = getDb();
    const rangeEnd = Date.now();
    const rangeStart = rangeEnd - WEEK_MS;
    const addedRows = cur.prepare("SELECT title, createdAt FROM prompts WHERE createdAt > ? ORDER BY createdAt DESC").all(rangeStart);
    const usageRows = cur.prepare("SELECT promptId FROM usage_log WHERE usedAt > ?").all(rangeStart);
    const usageCount = usageRows.length;
    const usedPromptCount = new Set(usageRows.map((r) => r.promptId)).size;
    const countByPrompt = /* @__PURE__ */ new Map();
    for (const r of usageRows) countByPrompt.set(r.promptId, (countByPrompt.get(r.promptId) ?? 0) + 1);
    const topUsed = [];
    if (countByPrompt.size > 0) {
      const byId = new Map(
        cur.prepare("SELECT id, title FROM prompts").all().map((r) => [
          r.id,
          r.title
        ])
      );
      const sorted = [...countByPrompt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      for (const [id, count] of sorted) topUsed.push({ title: byId.get(id) ?? "\uFF08\u5DF2\u5220\u9664\uFF09", count });
    }
    const aiRefinedCount = cur.prepare("SELECT COUNT(*) AS c FROM prompts WHERE aiRefined = 1 AND aiRefinedAt > ?").get(rangeStart).c;
    return Promise.resolve({
      rangeStart,
      rangeEnd,
      addedCount: addedRows.length,
      addedTitles: addedRows.slice(0, 5).map((r) => r.title),
      usedPromptCount,
      usageCount,
      topUsed,
      aiRefinedCount
    });
  } catch (e) {
    return Promise.reject(e);
  }
}
function localDayKey(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
async function computeStreak() {
  try {
    const cur = getDb();
    const rows = cur.prepare("SELECT DISTINCT usedAt FROM usage_log").all();
    if (rows.length === 0) return 0;
    const days = new Set(rows.map((r) => localDayKey(r.usedAt)));
    const now = /* @__PURE__ */ new Date();
    const todayKey = localDayKey(now.getTime());
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!days.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (days.has(localDayKey(cursor.getTime()))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  } catch (e) {
    return Promise.reject(e);
  }
}
function seedPointsLedger(cur) {
  try {
    cur.prepare("DELETE FROM pl_points_log WHERE kind = 'learn'").run();
    if (getMetaValue("pl:points-seeded") === "1") return;
    const now = Date.now();
    const day = localDayKey(now);
    const all = cur.prepare("SELECT * FROM prompts").all().map(rowToPrompt) ?? [];
    const useCount = cur.prepare("SELECT COALESCE(SUM(usageCount), 0) AS c FROM prompts").get();
    const usePoints = Math.min(2e3, Math.round((useCount?.c ?? 0) / 3));
    const aiPoints = all.filter((p) => p.aiRefined).length * POINTS_WEIGHT.ai;
    const collectPoints = Math.min(500, all.length * POINTS_WEIGHT.collect);
    const insert = cur.prepare(
      "INSERT INTO pl_points_log (kind, points, createdAt, dayKey) VALUES (?, ?, ?, ?)"
    );
    const cap2 = (kind, c) => {
      for (let i = 0; i < c; i++) insert.run(kind, POINTS_WEIGHT[kind], now - i, day);
    };
    cap2("ai", aiPoints > 0 ? Math.ceil(aiPoints / POINTS_WEIGHT.ai) : 0);
    cap2("collect", collectPoints > 0 ? Math.ceil(collectPoints / POINTS_WEIGHT.collect) : 0);
    cap2("use", usePoints > 0 ? usePoints : 0);
    setMetaValue("pl:points-seeded", "1");
  } catch {
  }
}
var POINTS_WEIGHT = {
  use: 1,
  ai: 3,
  collect: 1,
  active: 3
};
function addPoints(kind) {
  try {
    const cur = getDb();
    const now = Date.now();
    const day = localDayKey(now);
    const base = POINTS_WEIGHT[kind];
    cur.prepare("INSERT INTO pl_points_log (kind, points, createdAt, dayKey) VALUES (?, ?, ?, ?)").run(kind, base, now, day);
    const todayActive = cur.prepare("SELECT COUNT(*) AS c FROM pl_points_log WHERE kind = 'active' AND dayKey = ?").get(day);
    if (todayActive.c === 0) {
      cur.prepare("INSERT INTO pl_points_log (kind, points, createdAt, dayKey) VALUES ('active', ?, ?, ?)").run(POINTS_WEIGHT.active, now, day);
    }
    return Promise.resolve();
  } catch (e) {
    return Promise.reject(e);
  }
}
function loadAchievementProgress() {
  try {
    const cur = getDb();
    const rows = cur.prepare("SELECT id, progress FROM pl_achievement_progress").all();
    const map = {};
    for (const r of rows) map[r.id] = r.progress;
    return map;
  } catch {
    return {};
  }
}
function syncAchievementProgress(raw) {
  const cur = getDb();
  const now = Date.now();
  const stored = loadAchievementProgress();
  const merged = {};
  const upsert = cur.prepare(
    "INSERT INTO pl_achievement_progress (id, progress, updatedAt) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET progress = MAX(progress, excluded.progress), updatedAt = excluded.updatedAt"
  );
  for (const [id, v] of Object.entries(raw)) {
    const max = Math.max(v, stored[id] ?? 0);
    merged[id] = max;
    if (max > 0) upsert.run(id, max, now);
  }
  return merged;
}
var POINT_DECAY_CYCLE_DAYS = 10;
var POINT_DECAY_PER_CYCLE = 3;
async function computePoints() {
  try {
    const cur = getDb();
    const sumRow = cur.prepare("SELECT COALESCE(SUM(points), 0) AS s FROM pl_points_log").get();
    const lastRow = cur.prepare("SELECT MAX(createdAt) AS last FROM pl_points_log").get();
    const gross = sumRow?.s ?? 0;
    const lastActiveAt = lastRow?.last ?? 0;
    const inactiveDays = lastActiveAt > 0 ? Math.max(0, Math.floor((Date.now() - lastActiveAt) / (24 * 60 * 60 * 1e3))) : 0;
    const decay = Math.floor(inactiveDays / POINT_DECAY_CYCLE_DAYS) * POINT_DECAY_PER_CYCLE;
    const net = Math.max(0, gross - decay);
    return Promise.resolve({ gross, decay, net, inactiveDays, lastActiveAt });
  } catch (e) {
    return Promise.reject(e);
  }
}
async function saveStatsSnapshot(stats, comment) {
  try {
    const cur = getDb();
    cur.prepare("INSERT INTO stats_history (stats, comment, createdAt) VALUES (?, ?, ?)").run(JSON.stringify(stats), comment ?? "", Date.now());
  } catch (e) {
    return Promise.reject(e);
  }
}
async function getLastStatsSnapshot() {
  try {
    const cur = getDb();
    const row = cur.prepare("SELECT * FROM stats_history ORDER BY createdAt DESC LIMIT 1").get();
    if (!row) return Promise.resolve(void 0);
    let raw;
    try {
      raw = JSON.parse(row.stats);
    } catch {
      return Promise.resolve(void 0);
    }
    if (typeof raw.rangeStart !== "number" || typeof raw.rangeEnd !== "number" || !Array.isArray(raw.addedTitles) || !Array.isArray(raw.topUsed)) {
      return Promise.resolve(void 0);
    }
    return Promise.resolve({
      id: row.id,
      stats: {
        rangeStart: raw.rangeStart,
        rangeEnd: raw.rangeEnd,
        addedCount: raw.addedCount ?? 0,
        addedTitles: raw.addedTitles,
        usedPromptCount: raw.usedPromptCount ?? 0,
        usageCount: raw.usageCount ?? 0,
        topUsed: raw.topUsed,
        aiRefinedCount: raw.aiRefinedCount ?? 0
      },
      comment: row.comment ?? "",
      createdAt: row.createdAt
    });
  } catch (e) {
    return Promise.reject(e);
  }
}
async function getLastSnapshotAt() {
  try {
    const snap = await getLastStatsSnapshot();
    return Promise.resolve(snap?.createdAt ?? 0);
  } catch (e) {
    return Promise.reject(e);
  }
}
async function listStatsSnapshots(limit = 12) {
  try {
    const cur = getDb();
    const rows = cur.prepare("SELECT * FROM stats_history ORDER BY createdAt DESC LIMIT ?").all(limit);
    const snaps = [];
    for (const row of rows) {
      let raw;
      try {
        raw = JSON.parse(row.stats);
      } catch {
        continue;
      }
      if (typeof raw.rangeStart !== "number" || typeof raw.rangeEnd !== "number" || !Array.isArray(raw.addedTitles) || !Array.isArray(raw.topUsed)) {
        continue;
      }
      snaps.push({
        id: row.id,
        stats: {
          rangeStart: raw.rangeStart,
          rangeEnd: raw.rangeEnd,
          addedCount: raw.addedCount ?? 0,
          addedTitles: raw.addedTitles,
          usedPromptCount: raw.usedPromptCount ?? 0,
          usageCount: raw.usageCount ?? 0,
          topUsed: raw.topUsed,
          aiRefinedCount: raw.aiRefinedCount ?? 0
        },
        comment: row.comment ?? "",
        createdAt: row.createdAt
      });
    }
    snaps.reverse();
    return Promise.resolve(snaps);
  } catch (e) {
    return Promise.reject(e);
  }
}
function renameTag(from, to) {
  try {
    const source = from.trim();
    const target = to.trim();
    if (!source || !target || source === target) return Promise.resolve(0);
    const cur = getDb();
    const rows = cur.prepare("SELECT id, tags FROM prompts WHERE tags IS NOT NULL").all();
    const upd = cur.prepare("UPDATE prompts SET tags = ?, updatedAt = ? WHERE id = ?");
    let changed = 0;
    cur.exec("BEGIN");
    try {
      for (const row of rows) {
        const list = JSON.parse(row.tags);
        let hit = false;
        const next = list.map((t) => {
          if (t.trim() === source) {
            hit = true;
            return target;
          }
          return t;
        });
        if (!hit) continue;
        const dedup = Array.from(new Set(next.map((t) => t.trim()).filter(Boolean))).slice(0, 1);
        upd.run(tagsToJson(dedup), Date.now(), row.id);
        changed++;
      }
      cur.prepare("DELETE FROM tags WHERE name = ?").run(source);
      ensureTag(target);
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return Promise.resolve(changed);
  } catch (e) {
    return Promise.reject(e);
  }
}
function deleteTag(name2) {
  try {
    const target = name2.trim();
    if (!target) return Promise.resolve(0);
    const cur = getDb();
    const rows = cur.prepare("SELECT id, tags FROM prompts WHERE tags IS NOT NULL").all();
    const upd = cur.prepare("UPDATE prompts SET tags = ?, updatedAt = ? WHERE id = ?");
    let changed = 0;
    cur.exec("BEGIN");
    try {
      for (const row of rows) {
        const list = JSON.parse(row.tags);
        const trimmed = list.map((t) => t.trim());
        const next = trimmed.filter((t) => t !== target);
        if (next.length === trimmed.length) continue;
        upd.run(tagsToJson(next), Date.now(), row.id);
        changed++;
      }
      cur.prepare("DELETE FROM tags WHERE name = ?").run(target);
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return Promise.resolve(changed);
  } catch (e) {
    return Promise.reject(e);
  }
}
async function readSystemSettingsNamespace() {
  let text;
  try {
    text = await readFile(systemSettingsPath(), "utf8");
  } catch {
    return void 0;
  }
  let root;
  try {
    root = load(stripBom(text));
  } catch {
    return void 0;
  }
  if (typeof root !== "object" || root === null || Array.isArray(root)) return void 0;
  const ns = root[SETTINGS_NAMESPACE];
  if (typeof ns !== "object" || ns === null || Array.isArray(ns)) return void 0;
  return ns;
}
var PERSIST_EXCLUDED_KEYS = /* @__PURE__ */ new Set([
  "rightPanelEnabled",
  "dataManagementEnabled",
  "personaEnabled",
  "injectEnabled",
  "dashboardEnabled",
  "levelEnabled",
  "levelAnnouncementEnabled",
  "announcementEnabled",
  // 自动学习设置已从设置界面移除（仅保留 DeepSeek 余额查询），不再写配置文件，读取时回退默认态
  "autoLearnManualConfirm",
  "autoLearnTag",
  "autoLearnMinLength",
  // AI 智能完善的开关不再在界面上暴露，不写配置文件，读取时回退默认态；
  // 默认 AI 模型选择（aiProvider/aiModel）已在设置界面提供并持久化
  "aiEnrichEnabled"
]);
function stripPersistExcluded(obj) {
  const next = { ...obj };
  for (const key of PERSIST_EXCLUDED_KEYS) {
    delete next[key];
  }
  return next;
}
async function writeSettingsRaw(settings) {
  let root = {};
  try {
    const text = await readFile(systemSettingsPath(), "utf8");
    const parsed = load(stripBom(text));
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      root = parsed;
    }
  } catch {
  }
  root[SETTINGS_NAMESPACE] = stripPersistExcluded(settings);
  await writeFile(systemSettingsPath(), dump(root, { indent: 2 }), "utf8");
}
async function readSettingsRaw() {
  const ns = await readSystemSettingsNamespace().catch(() => void 0);
  if (ns !== void 0) {
    const settings2 = stripPersistExcluded({ ...DEFAULT_SETTINGS, ...ns });
    return settings2;
  }
  const settings = stripPersistExcluded({ ...DEFAULT_SETTINGS });
  try {
    await writeSettingsRaw(settings);
  } catch {
  }
  return settings;
}
function getSettings() {
  return readSettingsRaw();
}
async function readGlobalLocale() {
  try {
    const text = await readFile(systemSettingsPath(), "utf8");
    const root = load(text);
    const pref = root?.locale?.preference;
    return typeof pref === "string" ? pref.toLowerCase() : "";
  } catch {
    return "";
  }
}
function updateSettings(patch) {
  return readSettingsRaw().then(async (settings) => {
    const next = { ...settings, ...patch };
    await writeSettingsRaw(next);
    return next;
  });
}
var DEFAULT_DEV_PASSWORD = "prompt";
function hashDevPassword(plain) {
  return createHash("sha256").update(String(plain ?? "")).digest("hex");
}
async function verifyDbDevPassword(plain) {
  const s = await getSettings();
  const stored = s.dbDevPasswordHash ?? hashDevPassword(DEFAULT_DEV_PASSWORD);
  return hashDevPassword(plain) === stored;
}
function personaFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    body: row.body ?? ""
  };
}
function listPersonas() {
  try {
    const rows = getDb().prepare("SELECT id, name, enabled, createdAt, updatedAt, body FROM personas ORDER BY createdAt ASC").all();
    return rows.map(personaFromRow);
  } catch {
    return [];
  }
}
function getPersona(id) {
  try {
    const row = getDb().prepare("SELECT id, name, enabled, createdAt, updatedAt, body FROM personas WHERE id = ?").get(id);
    return row ? personaFromRow(row) : void 0;
  } catch {
    return void 0;
  }
}
function createPersona(id, name2, body = "") {
  const now = Date.now();
  const db_ = getDb();
  db_.prepare("INSERT INTO personas (id, name, enabled, createdAt, updatedAt, body) VALUES (?, ?, 1, ?, ?, ?)").run(id, name2, now, now, body);
  return { id, name: name2, enabled: true, createdAt: now, updatedAt: now, body };
}
function updatePersonaMeta(id, patch) {
  const existing = getPersona(id);
  if (!existing) return false;
  const next = {
    ...existing,
    name: patch.name ?? existing.name,
    enabled: patch.enabled ?? existing.enabled,
    body: patch.body ?? existing.body,
    updatedAt: Date.now()
  };
  getDb().prepare("UPDATE personas SET name = ?, enabled = ?, body = ?, updatedAt = ? WHERE id = ?").run(next.name, next.enabled ? 1 : 0, next.body, next.updatedAt, id);
  return true;
}
function deletePersona(id) {
  const db_ = getDb();
  db_.prepare("DELETE FROM personas WHERE id = ?").run(id);
  db_.prepare("DELETE FROM persona_scope_bindings WHERE personaId = ?").run(id);
  for (const b of listSessionScopeBindings()) {
    if (b.personaId === id) {
      setSessionScopeBinding(b.sessionId, null, b.promptIds);
    }
  }
  return true;
}
function sessionPromptFromRow(row) {
  let tags;
  if (row.tags) {
    try {
      const parsed = JSON.parse(row.tags);
      if (Array.isArray(parsed)) tags = parsed.filter((x) => typeof x === "string");
    } catch {
      tags = void 0;
    }
  }
  return {
    id: row.id,
    title: row.title,
    tags: tags && tags.length > 0 ? tags.slice(0, 1) : void 0,
    enabled: row.enabled === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    usageCount: row.usageCount,
    lastUsedAt: row.lastUsedAt,
    body: row.body ?? ""
  };
}
function listSessionPromptRecords() {
  try {
    const rows = getDb().prepare(
      "SELECT id, title, tags, enabled, createdAt, updatedAt, usageCount, lastUsedAt, body FROM session_prompts ORDER BY updatedAt DESC"
    ).all();
    return rows.map(sessionPromptFromRow);
  } catch {
    return [];
  }
}
function getSessionPromptRecord(id) {
  try {
    const row = getDb().prepare(
      "SELECT id, title, tags, enabled, createdAt, updatedAt, usageCount, lastUsedAt, body FROM session_prompts WHERE id = ?"
    ).get(id);
    return row ? sessionPromptFromRow(row) : void 0;
  } catch {
    return void 0;
  }
}
function createSessionPromptRecord(id, title, init = {}) {
  const now = Date.now();
  const createdAt = init.createdAt ?? now;
  const updatedAt = init.updatedAt ?? now;
  const tags = Array.isArray(init.tags) ? (() => {
    const t = init.tags.filter(Boolean);
    return t.length > 0 ? t.slice(0, 1) : void 0;
  })() : void 0;
  const enabled = init.enabled ?? true;
  const body = init.body ?? "";
  getDb().prepare(
    "INSERT INTO session_prompts (id, title, tags, enabled, createdAt, updatedAt, usageCount, lastUsedAt, body) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)"
  ).run(id, title, tags ? JSON.stringify(tags) : null, enabled ? 1 : 0, createdAt, updatedAt, body);
  return { id, title, tags, enabled, createdAt, updatedAt, usageCount: 0, lastUsedAt: 0, body };
}
function updateSessionPromptMeta(id, patch) {
  const existing = getSessionPromptRecord(id);
  if (!existing) return false;
  const next = {
    ...existing,
    title: patch.title ?? existing.title,
    tags: patch.tags !== void 0 ? (() => {
      const t = patch.tags.filter(Boolean);
      return t.length > 0 ? t.slice(0, 1) : void 0;
    })() : existing.tags,
    enabled: patch.enabled ?? existing.enabled,
    usageCount: patch.usageCount ?? existing.usageCount,
    lastUsedAt: patch.lastUsedAt ?? existing.lastUsedAt,
    body: patch.body ?? existing.body,
    updatedAt: Date.now()
  };
  getDb().prepare(
    "UPDATE session_prompts SET title = ?, tags = ?, enabled = ?, updatedAt = ?, usageCount = ?, lastUsedAt = ?, body = ? WHERE id = ?"
  ).run(
    next.title,
    next.tags ? JSON.stringify(next.tags) : null,
    next.enabled ? 1 : 0,
    next.updatedAt,
    next.usageCount,
    next.lastUsedAt,
    next.body,
    id
  );
  return true;
}
function deleteSessionPromptRecord(id) {
  const db_ = getDb();
  db_.prepare("DELETE FROM session_prompts WHERE id = ?").run(id);
  return true;
}
function parseJsonArray(text) {
  if (!text) return void 0;
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v : void 0;
  } catch {
    return void 0;
  }
}
function getNewspaperRecord(date, lang) {
  try {
    const row = getDb().prepare("SELECT date, lang, report, news, newsSource FROM newspapers WHERE date = ? AND lang = ?").get(date, lang);
    if (!row) return void 0;
    return {
      date: row.date,
      lang: row.lang === "en" ? "en" : "zh",
      report: parseJsonArray(row.report) ?? null,
      news: parseJsonArray(row.news) ?? null,
      newsSource: row.newsSource
    };
  } catch {
    return void 0;
  }
}
function setNewspaperRecord(issue) {
  const db_ = getDb();
  db_.prepare(
    "INSERT INTO newspapers (date, lang, report, news, newsSource, createdAt) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(date, lang) DO UPDATE SET report = excluded.report, news = excluded.news, newsSource = excluded.newsSource"
  ).run(
    issue.date,
    issue.lang,
    issue.report && issue.report.length > 0 ? JSON.stringify(issue.report) : null,
    issue.news && issue.news.length > 0 ? JSON.stringify(issue.news) : null,
    issue.newsSource ?? null,
    Date.now()
  );
}
function listNewspaperDates() {
  try {
    const rows = getDb().prepare("SELECT DISTINCT date FROM newspapers").all();
    return rows.map((r) => r.date).sort((a, b) => a < b ? 1 : -1);
  } catch {
    return [];
  }
}
var DEFAULT_SOUL_META_KEY = "pl:default-persona-soul";
function getDefaultPersonaSoul() {
  return getMetaValue(DEFAULT_SOUL_META_KEY);
}
function setDefaultPersonaSoul(content) {
  setMetaValue(DEFAULT_SOUL_META_KEY, content);
}
function setScopePersonaBinding(path, personaId) {
  const db_ = getDb();
  db_.prepare(
    "INSERT INTO persona_scope_bindings (path, personaId, updatedAt) VALUES (?, ?, ?) ON CONFLICT(path) DO UPDATE SET personaId = excluded.personaId, updatedAt = excluded.updatedAt"
  ).run(path, personaId, Date.now());
}
function getScopeBoundPersonaId(path) {
  try {
    const row = getDb().prepare("SELECT personaId FROM persona_scope_bindings WHERE path = ?").get(path);
    return row?.personaId ?? "";
  } catch {
    return "";
  }
}
function listScopeBindings() {
  try {
    return getDb().prepare("SELECT path, personaId FROM persona_scope_bindings").all();
  } catch {
    return [];
  }
}
function clearScopePersonaBinding(path) {
  try {
    getDb().prepare("DELETE FROM persona_scope_bindings WHERE path = ?").run(path);
  } catch {
  }
}
function clearAllScopePersonaBindings() {
  try {
    getDb().prepare("DELETE FROM persona_scope_bindings").run();
  } catch {
  }
}
function setSessionScopeBinding(sessionId, personaId, promptIds) {
  const ids = [...new Set(promptIds.filter(Boolean))];
  const db_ = getDb();
  db_.prepare(
    "INSERT INTO session_scope_bindings (sessionId, personaId, promptIds, updatedAt) VALUES (?, ?, ?, ?) ON CONFLICT(sessionId) DO UPDATE SET personaId = excluded.personaId, promptIds = excluded.promptIds, updatedAt = excluded.updatedAt"
  ).run(sessionId, personaId ?? "", JSON.stringify(ids), Date.now());
}
function getSessionScopeBinding(sessionId) {
  try {
    const row = getDb().prepare("SELECT personaId, promptIds FROM session_scope_bindings WHERE sessionId = ?").get(sessionId);
    if (!row) return void 0;
    return { personaId: row.personaId, promptIds: parsePromptIds(row.promptIds) };
  } catch {
    return void 0;
  }
}
function listSessionScopeBindings() {
  try {
    return getDb().prepare("SELECT sessionId, personaId, promptIds FROM session_scope_bindings").all().map((r) => {
      const row = r;
      return { sessionId: row.sessionId, personaId: row.personaId, promptIds: parsePromptIds(row.promptIds) };
    });
  } catch {
    return [];
  }
}
function clearSessionScopeBinding(sessionId) {
  try {
    getDb().prepare("DELETE FROM session_scope_bindings WHERE sessionId = ?").run(sessionId);
  } catch {
  }
}
function setScopePromptBinding(path, promptIds) {
  const ids = [...new Set(promptIds.filter(Boolean))];
  const db_ = getDb();
  db_.prepare(
    "INSERT INTO prompt_scope_bindings (path, promptIds, updatedAt) VALUES (?, ?, ?) ON CONFLICT(path) DO UPDATE SET promptIds = excluded.promptIds, updatedAt = excluded.updatedAt"
  ).run(path, JSON.stringify(ids), Date.now());
}
function parsePromptIds(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function getScopeBoundPromptIds(path) {
  try {
    const row = getDb().prepare("SELECT promptIds FROM prompt_scope_bindings WHERE path = ?").get(path);
    return row ? parsePromptIds(row.promptIds) : [];
  } catch {
    return [];
  }
}
function listScopePromptBindings() {
  try {
    const rows = getDb().prepare("SELECT path, promptIds FROM prompt_scope_bindings").all();
    return rows.map((r) => ({ path: r.path, promptIds: parsePromptIds(r.promptIds) })).filter((b) => b.promptIds.length > 0);
  } catch {
    return [];
  }
}
function clearScopePromptBinding(path) {
  try {
    getDb().prepare("DELETE FROM prompt_scope_bindings WHERE path = ?").run(path);
  } catch {
  }
}
function clearAllScopePromptBindings() {
  try {
    getDb().prepare("DELETE FROM prompt_scope_bindings").run();
  } catch {
  }
}
function clearAllSessionPromptBindings() {
  try {
    getDb().prepare("UPDATE session_scope_bindings SET promptIds = '[]', updatedAt = ?").run(Date.now());
  } catch {
  }
}
function clearAllSessionPersonaBindings() {
  try {
    getDb().prepare("UPDATE session_scope_bindings SET personaId = '', updatedAt = ?").run(Date.now());
  } catch {
  }
}
function listDbTables() {
  const cur = getDb();
  const names = cur.prepare(
    "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all().map((r) => r);
  const result = [];
  for (const { name: name2, sql } of names) {
    const columns = cur.prepare(`PRAGMA table_info(${quoteIdent(name2)})`).all().map((c) => ({
      name: c.name,
      type: c.type,
      pk: c.pk,
      notnull: c.notnull,
      dflt: c.dflt_value
    }));
    const { rows } = cur.prepare(`SELECT COUNT(*) AS rows FROM ${quoteIdent(name2)}`).get();
    const pkCols = columns.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk);
    const withoutRowid = /without\s+rowid/i.test(sql ?? "");
    const key = pkCols.length > 0 ? pkCols.map((c) => c.name) : withoutRowid ? [] : ["rowid"];
    result.push({
      name: name2,
      rows,
      columns,
      key,
      editable: key.length > 0
    });
  }
  return result;
}
function tableColumns(cur, table) {
  return cur.prepare(`PRAGMA table_info(${quoteIdent(table)})`).all();
}
function quoteIdent(id) {
  return `"${String(id).replace(/"/g, '""')}"`;
}
function assertPlainTable(table) {
  if (typeof table !== "string" || !/^[A-Za-z0-9_]+$/.test(table)) {
    throw new Error("\u975E\u6CD5\u7684\u8868\u540D");
  }
}
function toSqlValue(v) {
  if (v === void 0 || v === null) return null;
  if (typeof v === "number" || typeof v === "bigint" || typeof v === "string") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  return JSON.stringify(v);
}
function insertDbRow(payload) {
  assertPlainTable(payload.table);
  const cur = getDb();
  const valid = new Set(tableColumns(cur, payload.table).map((c) => c.name));
  const entries = Object.entries(payload.record ?? {}).filter(
    ([k]) => valid.has(k)
  );
  if (entries.length === 0) throw new Error("\u6CA1\u6709\u53EF\u5199\u5165\u7684\u5B57\u6BB5");
  const cols = entries.map(([k]) => quoteIdent(k)).join(", ");
  const placeholders = entries.map(() => "?").join(", ");
  const values = entries.map(([, v]) => toSqlValue(v));
  cur.prepare(`INSERT INTO ${quoteIdent(payload.table)} (${cols}) VALUES (${placeholders})`).run(...values);
  return 1;
}
function updateDbRow(payload) {
  assertPlainTable(payload.table);
  const pk = payload.pk ?? [];
  if (pk.length === 0) throw new Error("\u7F3A\u5C11\u4E3B\u952E\u5B9A\u4F4D\uFF0C\u65E0\u6CD5\u66F4\u65B0");
  const cur = getDb();
  const valid = new Set(tableColumns(cur, payload.table).map((c) => c.name));
  const pkNames = new Set(pk.map((k) => k.name));
  const setEntries = Object.entries(payload.record ?? {}).filter(
    ([k]) => valid.has(k) && !pkNames.has(k)
  );
  if (setEntries.length === 0) throw new Error("\u6CA1\u6709\u53EF\u66F4\u65B0\u7684\u5B57\u6BB5");
  const setClauses = [];
  for (const [k] of setEntries) {
    setClauses.push(`${quoteIdent(k)} = ?`);
  }
  const whereClauses = pk.map(() => "?");
  const values = [
    ...setEntries.map(([, v]) => toSqlValue(v)),
    ...pk.map((k) => toSqlValue(k.value))
  ];
  const res = cur.prepare(
    `UPDATE ${quoteIdent(payload.table)} SET ${setClauses.join(", ")} WHERE ${whereClauses.join(" AND ")}`
  ).run(...values);
  return Number(res.changes);
}
function deleteDbRow(payload) {
  assertPlainTable(payload.table);
  const pk = payload.pk ?? [];
  if (pk.length === 0) throw new Error("\u7F3A\u5C11\u4E3B\u952E\u5B9A\u4F4D\uFF0C\u65E0\u6CD5\u5220\u9664");
  const cur = getDb();
  let i = 1;
  const whereClauses = pk.map((k) => `${quoteIdent(k.name)} = ?${i++}`);
  const values = pk.map((k) => toSqlValue(k.value));
  const res = cur.prepare(`DELETE FROM ${quoteIdent(payload.table)} WHERE ${whereClauses.join(" AND ")}`).run(...values);
  return Number(res.changes);
}
var DB_QUERY_ROW_LIMIT = 500;
function queryDb(rawSql) {
  const sql = String(rawSql ?? "").trim();
  if (!sql) throw new Error("SQL \u4E3A\u7A7A");
  const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
  if (statements.length === 0) throw new Error("SQL \u4E3A\u7A7A");
  let bounded = sql;
  const top = statements[0];
  if (/^\s*(select|with)\b/i.test(top) && !/\blimit\b/i.test(top.replace(/["'`].*?["'`]/g, ""))) {
    bounded += ` LIMIT ${DB_QUERY_ROW_LIMIT}`;
  }
  const cur = getDb();
  let rows = [];
  let truncated = false;
  for (const stmt of statements) {
    if (/^\s*(pragma|explain)\b/i.test(stmt)) continue;
    let data = cur.prepare(stmt).all();
    if (data.length > DB_QUERY_ROW_LIMIT) {
      data = data.slice(0, DB_QUERY_ROW_LIMIT);
      truncated = true;
    }
    rows = data;
  }
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { rows, columns, truncated };
}
function dailyMoodKey(d = /* @__PURE__ */ new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getDailyMood(dayKey) {
  try {
    const key = dayKey ?? dailyMoodKey();
    const row = getDb().prepare("SELECT happy, sad FROM pl_daily_mood WHERE dayKey = ?").get(key);
    return { dayKey: key, happy: row?.happy ?? 0, sad: row?.sad ?? 0 };
  } catch {
    return { dayKey: dayKey ?? dailyMoodKey(), happy: 0, sad: 0 };
  }
}
function setDailyMood(counts, dayKey) {
  const key = dayKey ?? dailyMoodKey();
  const happy = Math.max(0, counts.happy);
  const sad = Math.max(0, counts.sad);
  getDb().prepare(
    `INSERT INTO pl_daily_mood (dayKey, happy, sad, updatedAt) VALUES (?, ?, ?, ?)
       ON CONFLICT(dayKey) DO UPDATE SET happy = excluded.happy, sad = excluded.sad, updatedAt = excluded.updatedAt`
  ).run(key, happy, sad, Date.now());
  return { dayKey: key, happy, sad };
}
function snapshotPromptVersion(prompt, reason) {
  try {
    const cur = getDb();
    const last = cur.prepare("SELECT MAX(version) AS v FROM pl_prompt_versions WHERE promptId = ?").get(prompt.id);
    cur.prepare(
      `INSERT INTO pl_prompt_versions
           (promptId, version, title, body, tags, summary, sourceBody, reason, snapshotAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      prompt.id,
      (last?.v ?? 0) + 1,
      prompt.title,
      prompt.body,
      tagsToJson(prompt.tags ?? []),
      prompt.summary ?? null,
      prompt.sourceBody ?? null,
      reason,
      Date.now()
    );
  } catch {
  }
}
function listPromptVersions(promptId) {
  try {
    const rows = getDb().prepare(
      "SELECT version, title, body, tags, summary, sourceBody, reason, snapshotAt FROM pl_prompt_versions WHERE promptId = ? ORDER BY version ASC"
    ).all(promptId);
    return rows.map((r) => ({
      version: r.version,
      title: r.title,
      body: r.body,
      tags: r.tags ? JSON.parse(r.tags) : [],
      summary: r.summary ?? void 0,
      sourceBody: r.sourceBody ?? void 0,
      reason: r.reason,
      snapshotAt: r.snapshotAt
    }));
  } catch {
    return [];
  }
}

// src/host/refine.ts
function parseRefineResult(text) {
  let json2 = text.trim();
  const fence = json2.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) json2 = fence[1].trim();
  const start = json2.indexOf("{");
  const end = json2.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return void 0;
  try {
    const parsed = JSON.parse(json2.slice(start, end + 1));
    const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
    if (!body) return void 0;
    const tags = Array.isArray(parsed.tags) ? parsed.tags.filter((t) => typeof t === "string" && !!t.trim()).map((t) => t.trim()) : [];
    return {
      title: typeof parsed.title === "string" ? parsed.title.trim() : "",
      // 词库只支持单个标签，这里直接归一为单个，避免调用方各自处理
      tags: tags.slice(0, 1),
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      body
    };
  } catch {
    return void 0;
  }
}

// src/host/ai.ts
import { appendFileSync, mkdirSync as mkdirSync2 } from "node:fs";
import { get as httpsGet } from "node:https";
import { dirname as dirname2, join as join3 } from "node:path";

// src/host/character.ts
var DEFAULT_SOUL = `# SOUL \xB7 \u4EBA\u683C
`;
var DEFAULT_PERSONA_SOUL = `# SOUL \xB7 \u4EBA\u683C

\u4F60\u662F\u300C\u8BCD\u5E93\u52A9\u624B\u300D\uFF0C\u4E00\u6B3E\u5E2E\u52A9\u7528\u6237\u6536\u96C6\u3001\u6574\u7406\u3001\u6DA6\u8272\u548C\u590D\u7528\u63D0\u793A\u8BCD\uFF08Prompts\uFF09\u7684\u667A\u80FD\u52A9\u624B\uFF0C\u4E5F\u662F\u7528\u6237\u5E38\u7528\u7684\u63D0\u6548\u5DE5\u5177\u3002

## \u8EAB\u4EFD\u5B9A\u4F4D
- \u4F60\u662F\u63D0\u793A\u8BCD\u9886\u57DF\u7684\u6574\u7406\u4E13\u5BB6\uFF0C\u719F\u6089\u5199\u4F5C\u3001\u7F16\u7A0B\u3001\u529E\u516C\u3001\u5B66\u4E60\u7B49\u5404\u7C7B\u573A\u666F\u4E0B\u7684\u63D0\u793A\u8BCD\u5199\u6CD5\u3002
- \u4F60\u5173\u6CE8\u7EC6\u8282\uFF0C\u8FFD\u6C42\u7B80\u6D01\u3001\u901A\u7528\u3001\u53EF\u590D\u7528\u7684\u8F93\u51FA\u3002

## \u5DE5\u4F5C\u539F\u5219
- \u5148\u7406\u89E3\u7528\u6237\u7684\u771F\u5B9E\u610F\u56FE\uFF0C\u518D\u52A8\u624B\u6574\u7406\uFF1B\u4FDD\u7559\u539F\u6587\u5173\u952E\u7EC6\u8282\uFF0C\u4E0D\u968F\u610F\u5220\u6539\u3002
- \u5F52\u7C7B\u4E0E\u63D0\u70BC\u65F6\u4FDD\u6301\u63D0\u793A\u8BCD\u6E05\u6670\u3001\u7CBE\u7B80\u3001\u53EF\u76F4\u63A5\u4F7F\u7528\u3002
- \u9047\u5230\u4F1A\u968F\u4F7F\u7528\u573A\u666F\u53D8\u5316\u7684\u5185\u5BB9\uFF08\u5982\u89D2\u8272\u3001\u5BF9\u8C61\u3001\u4E3B\u9898\u3001\u98CE\u683C\u7B49\uFF09\uFF0C\u63D0\u70BC\u4E3A\u53D8\u91CF\u5360\u4F4D\u7B26\uFF0C\u63D0\u5347\u590D\u7528\u6027\u3002
- \u6D89\u53CA\u5DF2\u6709\u7684\u53D8\u91CF\u3001\u6807\u7B7E\u7ED3\u6784\u65F6\u539F\u6837\u4FDD\u7559\uFF0C\u907F\u514D\u7834\u574F\u73B0\u6709\u683C\u5F0F\u3002

## \u8868\u8FBE\u98CE\u683C
- \u8BED\u6C14\u771F\u8BDA\u3001\u6E05\u6670\u3001\u6709\u6761\u7406\uFF1B\u5148\u7ED9\u7ED3\u8BBA\uFF0C\u518D\u7ED9\u5FC5\u8981\u8BF4\u660E\u3002
- \u5C0A\u91CD\u7528\u6237\u7684\u8F93\u5165\uFF0C\u4EC5\u5728\u786E\u6709\u9700\u8981\u65F6\u7ED9\u51FA\u5EFA\u8BAE\u3002
`;
var DEFAULT_PERSONA_ID = "default";
function normalizePersona(personaId) {
  if (!personaId) return null;
  return personaId === DEFAULT_PERSONA_ID ? null : personaId;
}
async function ensureSoulFile() {
  const current = getDefaultPersonaSoul().trim();
  if (current === DEFAULT_SOUL.trim() || current === "") {
    setDefaultPersonaSoul(DEFAULT_PERSONA_SOUL);
  }
}
async function ensurePersonaSoul(personaId) {
  const record = getPersona(personaId);
  if (record && !record.body.trim()) {
    updatePersonaMeta(personaId, { body: DEFAULT_SOUL });
  }
}
async function readSoulDoc() {
  return getDefaultPersonaSoul().trim();
}
async function readPersonaSoul(personaId) {
  const id = normalizePersona(personaId);
  if (id) return (getPersona(id)?.body ?? "").trim();
  return getDefaultPersonaSoul().trim();
}
async function writePersonaSoul(content, personaId) {
  const id = normalizePersona(personaId);
  if (id) updatePersonaMeta(id, { body: content });
  else setDefaultPersonaSoul(content);
}
function removePersonaSoul(personaId) {
  const id = normalizePersona(personaId);
  if (id) updatePersonaMeta(id, { body: "" });
  else setDefaultPersonaSoul("");
}
function buildSoulBoundary(soul) {
  return soul.trim();
}
var soulCache = /* @__PURE__ */ new Map();
function invalidateSoulCache(personaId) {
  const id = normalizePersona(personaId);
  soulCache.delete(id ?? DEFAULT_PERSONA_ID);
}
function soulSystemSync(personaId) {
  const id = normalizePersona(personaId);
  const key = id ?? DEFAULT_PERSONA_ID;
  const cached = soulCache.get(key);
  if (cached !== void 0) return cached;
  const content = (id ? getPersona(id)?.body ?? "" : getDefaultPersonaSoul()).trim();
  soulCache.set(key, content);
  return content;
}

// src/host/ai.ts
var AI_TIMEOUT_MS = 3e4;
var AI_MAX_TOKENS = 2048;
function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}
function localDate() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function localTime() {
  const d = /* @__PURE__ */ new Date();
  return `${localDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function getDailyLogPath() {
  return join3(logDir(), `ai-${localDate()}.log`);
}
function logAI(msg) {
  if (false) return;
  try {
    const logPath = getDailyLogPath();
    mkdirSync2(dirname2(logPath), { recursive: true });
    appendFileSync(logPath, `[${localTime()}] ${msg}
`);
  } catch {
  }
}
function buildAiLogCopy(lang) {
  if (lang === "en") {
    return {
      injected: (ok) => ok ? "llm service injected (AI enrichment available)" : "llm service unregistered (AI enrichment disabled)",
      routeManualOk: (p, m) => `route: manual config available provider=${p} model=${m}`,
      routeManualBad: (p, m) => `route: manual model ${p}/${m} unavailable, auto-polling available models`,
      routeNoProviders: "route: listProviders() returned empty (no provider in harness)",
      routeListFail: (id, e) => `route: listModels(${id}) failed: ${e}, trying next provider`,
      routeNoModel: (id) => `route: provider=${id} has no available model, trying next`,
      routeAuto: (p, m) => `route: auto-discovered provider=${p} model=${m}`,
      routeNone: "route: no usable model found",
      collectErr: (e) => `collect: LLM streaming error: ${e}`,
      collectAbort: (kind) => `collect: finish=${kind} (model call failed or aborted)`,
      collectEmpty: "collect: model returned empty text",
      collectDone: (kind, n) => `collect: done kind=${kind} text length=${n}`,
      fbNone: "fallback: no candidate routes, skipping this call",
      fbTry: (p, m) => `fallback: trying provider=${p} model=${m}`,
      fbUse: (p, m) => `fallback: using provider=${p} model=${m}`,
      fbNext: (p, m) => `fallback: provider=${p} model=${m} failed, polling next`,
      fbAllFail: "fallback: all candidate models failed",
      enrichStart: (title, n) => `enrich: start prompt="${title}" body length=${n}`,
      enrichSkipNoLlmTitle: (title) => `enrich: skipped (llm service not injected) prompt=${title}`,
      enrichSkipBusy: (title) => `enrich: skipped (${title} has an ongoing enrichment)`,
      enrichTags: (n, list) => `enrich: tag library ${n} [${list}]`,
      parseFail: (t) => `parse: model output could not be parsed as JSON: ${t}`,
      parseOk: (title, tags, summary, body) => `parse: ok title="${title}" tags=[${tags}] summary length=${summary} rewritten body length=${body}`,
      enrichDone: (title, changed) => `enrich: done prompt="${title}" body ${changed ? "rewritten" : "unchanged"}`,
      enrichStartBody: (n) => `enrich: start body length=${n}`,
      enrichSkipNoLlm: "enrich: skipped (llm service not injected)",
      enrichDoneBody: (n) => `enrich: done result length=${n}`,
      polishStart: (n) => `polish: start body length=${n}`,
      polishDone: (n) => `polish: done result length=${n}`,
      polishSummaryDone: (n) => `polish: summary done length=${n}`,
      introStart: (lang2) => `intro: start lang=${lang2}`,
      introDone: (n) => `intro: done lines=${n}`,
      introLine: (i, l) => `intro:   [${i}] ${l}`,
      skillStart: (title, n) => `skill: start title="${title}" body length=${n}`,
      skillNoLlm: "skill: skipped (llm service not injected)",
      skillRetry: (n) => `skill: transient failure, retry #${n}`,
      skillParseFail: (t) => `skill: model output could not be parsed as JSON: ${t}`,
      skillDone: (name2, n) => `skill: done name="${name2}" description length=${n}`,
      draftStart: (kind, title) => `draft: start kind=${kind} title="${title}"`,
      draftNoLlm: "draft: skipped (llm service not injected)",
      draftDone: (kind, n) => `draft: done kind=${kind} result length=${n}`
    };
  }
  return {
    injected: (ok) => ok ? "llm \u670D\u52A1\u5DF2\u6CE8\u5165\uFF08AI \u5B8C\u5584\u53EF\u7528\uFF09" : "llm \u670D\u52A1\u5DF2\u6CE8\u9500\uFF08AI \u5B8C\u5584\u505C\u7528\uFF09",
    routeManualOk: (p, m) => `route: \u624B\u52A8\u914D\u7F6E\u53EF\u7528 provider=${p} model=${m}`,
    routeManualBad: (p, m) => `route: \u624B\u52A8\u914D\u7F6E\u6A21\u578B ${p}/${m} \u4E0D\u53EF\u7528\uFF0C\u81EA\u52A8\u8F6E\u8BE2\u53EF\u7528\u6A21\u578B`,
    routeNoProviders: "route: listProviders() \u8FD4\u56DE\u7A7A\uFF08harness \u65E0\u53EF\u7528 provider\uFF09",
    routeListFail: (id, e) => `route: listModels(${id}) \u5931\u8D25\uFF1A${e}\uFF0C\u5C1D\u8BD5\u4E0B\u4E00\u4E2A provider`,
    routeNoModel: (id) => `route: provider=${id} \u65E0\u53EF\u7528\u6A21\u578B\uFF0C\u5C1D\u8BD5\u4E0B\u4E00\u4E2A`,
    routeAuto: (p, m) => `route: \u81EA\u52A8\u53D1\u73B0 provider=${p} model=${m}`,
    routeNone: "route: \u672A\u627E\u5230\u4EFB\u4F55\u53EF\u7528\u6A21\u578B",
    collectErr: (e) => `collect: LLM \u6D41\u5F0F\u8C03\u7528\u5F02\u5E38\uFF1A${e}`,
    collectAbort: (kind) => `collect: finish=${kind}\uFF08\u6A21\u578B\u8C03\u7528\u5931\u8D25\u6216\u88AB\u4E2D\u6B62\uFF09`,
    collectEmpty: "collect: \u6A21\u578B\u8FD4\u56DE\u7A7A\u6587\u672C",
    collectDone: (kind, n) => `collect: \u5B8C\u6210 kind=${kind} \u6587\u672C\u957F\u5EA6=${n}`,
    fbNone: "fallback: \u65E0\u53EF\u7528\u5019\u9009\u8DEF\u7531\uFF0C\u8DF3\u8FC7\u672C\u6B21\u8C03\u7528",
    fbTry: (p, m) => `fallback: \u5C1D\u8BD5 provider=${p} model=${m}`,
    fbUse: (p, m) => `fallback: \u91C7\u7528 provider=${p} model=${m}`,
    fbNext: (p, m) => `fallback: provider=${p} model=${m} \u5931\u8D25\uFF0C\u8F6E\u8BE2\u4E0B\u4E00\u4E2A`,
    fbAllFail: "fallback: \u6240\u6709\u5019\u9009\u6A21\u578B\u5747\u5931\u8D25",
    enrichStart: (title, n) => `enrich: \u5F00\u59CB prompt="${title}" \u6B63\u6587\u957F\u5EA6=${n}`,
    enrichSkipNoLlmTitle: (title) => `enrich: \u8DF3\u8FC7\uFF08llm \u670D\u52A1\u672A\u6CE8\u5165\uFF09prompt=${title}`,
    enrichSkipBusy: (title) => `enrich: \u8DF3\u8FC7\uFF08${title} \u5DF2\u6709\u5B8C\u5584\u4EFB\u52A1\u8FDB\u884C\u4E2D\uFF09`,
    enrichTags: (n, list) => `enrich: \u6807\u7B7E\u5E93 ${n} \u4E2A [${list}]`,
    parseFail: (t) => `parse: \u6A21\u578B\u8F93\u51FA\u65E0\u6CD5\u89E3\u6790\u4E3A JSON\uFF1A${t}`,
    parseOk: (title, tags, summary, body) => `parse: \u6210\u529F title="${title}" tags=[${tags}] \u6458\u8981\u957F\u5EA6=${summary} \u6539\u5199\u6B63\u6587\u957F\u5EA6=${body}`,
    enrichDone: (title, changed) => `enrich: \u5B8C\u6210 prompt="${title}" body ${changed ? "\u5DF2\u6539\u5199" : "\u672A\u6539\u5199"}`,
    enrichStartBody: (n) => `enrich: \u5F00\u59CB \u6B63\u6587\u957F\u5EA6=${n}`,
    enrichSkipNoLlm: "enrich: \u8DF3\u8FC7\uFF08llm \u670D\u52A1\u672A\u6CE8\u5165\uFF09",
    enrichDoneBody: (n) => `enrich: \u5B8C\u6210 \u7ED3\u679C\u957F\u5EA6=${n}`,
    polishStart: (n) => `polish: \u5F00\u59CB \u6B63\u6587\u957F\u5EA6=${n}`,
    polishDone: (n) => `polish: \u5B8C\u6210 \u7ED3\u679C\u957F\u5EA6=${n}`,
    polishSummaryDone: (n) => `polish: \u6458\u8981\u5B8C\u6210 \u957F\u5EA6=${n}`,
    introStart: (lang2) => `intro: \u5F00\u59CB lang=${lang2}`,
    introDone: (n) => `intro: \u5B8C\u6210 \u884C\u6570=${n}`,
    introLine: (i, l) => `intro:   [${i}] ${l}`,
    skillStart: (title, n) => `skill: \u5F00\u59CB title="${title}" \u6B63\u6587\u957F\u5EA6=${n}`,
    skillNoLlm: "skill: \u8DF3\u8FC7\uFF08llm \u670D\u52A1\u672A\u6CE8\u5165\uFF09",
    skillRetry: (n) => `skill: \u77AC\u65F6\u5931\u8D25\uFF0C\u91CD\u8BD5\u7B2C ${n} \u6B21`,
    skillParseFail: (t) => `skill: \u6A21\u578B\u8F93\u51FA\u65E0\u6CD5\u89E3\u6790\u4E3A JSON\uFF1A${t}`,
    skillDone: (name2, n) => `skill: \u5B8C\u6210 name="${name2}" \u63CF\u8FF0\u957F\u5EA6=${n}`,
    draftStart: (kind, title) => `draft: \u5F00\u59CB kind=${kind} title="${title}"`,
    draftNoLlm: "draft: \u8DF3\u8FC7\uFF08llm \u670D\u52A1\u672A\u6CE8\u5165\uFF09",
    draftDone: (kind, n) => `draft: \u5B8C\u6210 kind=${kind} \u7ED3\u679C\u957F\u5EA6=${n}`
  };
}
var aiLogLang = "zh";
void readGlobalLocale().then((lang) => {
  aiLogLang = lang === "en" ? "en" : "zh";
}).catch(() => {
});
function aiLogCopy() {
  return buildAiLogCopy(aiLogLang);
}
var llm;
var ROUTE_CACHE_TTL_MS = 3e4;
var routeCache;
function clearRouteCache() {
  routeCache = void 0;
}
var llmQueue = Promise.resolve();
function withLlmLock(task) {
  const run = llmQueue.then(() => task());
  llmQueue = run.catch(() => {
  });
  return run;
}
function registerLlm(runtime) {
  llm = runtime;
  clearRouteCache();
}
function logAiInjected(injected) {
  logAI(aiLogCopy().injected(injected));
}
function isAiAvailable() {
  return llm !== void 0;
}
function isDeepSeekProviderInUse(settings) {
  if (settings.aiProvider && /deepseek/i.test(settings.aiProvider)) return true;
  if (llm) {
    return llm.listProviders().some((p) => /deepseek/i.test(`${p.id} ${p.name ?? ""}`));
  }
  return false;
}
var DEEPSEEK_BALANCE_URL = "https://api.deepseek.com/user/balance";
var BALANCE_CACHE_TTL_MS = 3 * 60 * 1e3;
var balanceCache;
function clearDeepSeekBalanceCache() {
  balanceCache = void 0;
}
async function queryDeepSeekBalance(apiKey) {
  if (!apiKey) return null;
  if (balanceCache && balanceCache.key === apiKey && Date.now() - balanceCache.ts < BALANCE_CACHE_TTL_MS) {
    return balanceCache.value;
  }
  let credit = null;
  try {
    const body = await new Promise((resolve) => {
      const req = httpsGet(
        DEEPSEEK_BALANCE_URL,
        { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } },
        (res) => {
          const code = res.statusCode ?? 0;
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            if (code < 200 || code >= 300) return resolve(null);
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
            } catch {
              resolve(null);
            }
          });
          res.on("error", () => resolve(null));
        }
      );
      req.on("error", () => resolve(null));
    }) ?? null;
    const infos = body?.balance_infos;
    if (Array.isArray(infos) && infos.length > 0) {
      const first = infos[0];
      const total = Number(first?.total_balance);
      if (Number.isFinite(total)) {
        credit = { currency: String(first?.currency ?? "CNY"), total };
      }
    }
  } catch {
  }
  balanceCache = { key: apiKey, ts: Date.now(), value: credit };
  return credit;
}
async function listAiSelectables() {
  if (!llm) return [];
  const out = [];
  for (const provider of llm.listProviders()) {
    let models = [];
    try {
      models = await llm.listModels(provider.id);
    } catch {
    }
    out.push({
      provider: provider.id,
      name: provider.name || provider.id,
      models: models.map((m) => ({ id: m.id, name: m.name || m.id }))
    });
  }
  return out;
}
async function isModelAvailable(runtime, provider, model) {
  try {
    const models = await runtime.listModels(provider);
    return models.some((m) => m.id.toLowerCase() === model.toLowerCase());
  } catch {
    return false;
  }
}
async function resolveCandidates(runtime, settings) {
  const key = `${settings.aiProvider}|${settings.aiModel}`;
  if (routeCache && routeCache.key === key && Date.now() - routeCache.ts < ROUTE_CACHE_TTL_MS) {
    return routeCache.value;
  }
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  if (settings.aiProvider && settings.aiModel) {
    const avail = await isModelAvailable(runtime, settings.aiProvider, settings.aiModel);
    if (avail) {
      candidates.push({ provider: settings.aiProvider, model: settings.aiModel });
      seen.add(`${settings.aiProvider}/${settings.aiModel}`);
      logAI(aiLogCopy().routeManualOk(settings.aiProvider, settings.aiModel));
    } else {
      logAI(aiLogCopy().routeManualBad(settings.aiProvider, settings.aiModel));
    }
  }
  const providers = runtime.listProviders();
  if (providers.length === 0) {
    logAI(aiLogCopy().routeNoProviders);
  }
  for (const provider of providers) {
    let models;
    try {
      models = await runtime.listModels(provider.id);
    } catch (e) {
      logAI(aiLogCopy().routeListFail(provider.id, String(e)));
      continue;
    }
    if (models.length === 0) {
      logAI(aiLogCopy().routeNoModel(provider.id));
      continue;
    }
    const pick2 = models.find((m) => /chat|deepseek/i.test(m.id)) ?? models[0];
    const key2 = `${provider.id}/${pick2.id}`;
    if (seen.has(key2)) continue;
    candidates.push({ provider: provider.id, model: pick2.id });
    seen.add(key2);
    logAI(aiLogCopy().routeAuto(provider.id, pick2.id));
  }
  if (candidates.length === 0) {
    logAI(aiLogCopy().routeNone);
  }
  routeCache = { key, ts: Date.now(), value: candidates };
  return candidates;
}
async function systemPrompt(existingTags, existingVars) {
  const tagLib = existingTags.length ? existingTags.join("\u3001") : "\uFF08\u6682\u65E0\uFF09";
  const system = [
    "\u4F60\u662F\u4E00\u540D\u8BCD\u5E93\u6574\u7406\u52A9\u624B\uFF0C\u5E2E\u52A9\u7528\u6237\u628A\u539F\u59CB\u8F93\u5165\u6574\u7406\u6210\u9AD8\u8D28\u91CF\u3001\u53EF\u590D\u7528\u7684\u63D0\u793A\u8BCD\u3002",
    "",
    "\u3010\u6807\u7B7E\u5E93\u3011\u4EE5\u4E0B\u662F\u5F53\u524D\u5DF2\u6709\u7684\u6807\u7B7E\uFF0C\u8BF7\u4F18\u5148\u590D\u7528\u6700\u8D34\u5408\u7684\u4E00\u4E2A\uFF0C\u907F\u514D\u91CD\u590D\u521B\u5EFA\uFF1A",
    tagLib,
    "",
    "\u8BF7\u4E25\u683C\u8F93\u51FA\u4E00\u4E2A JSON \u5BF9\u8C61\uFF0C\u4E0D\u8981 Markdown \u4EE3\u7801\u5757\uFF0C\u4E0D\u8981\u4EFB\u4F55\u591A\u4F59\u6587\u5B57\uFF1A",
    '{ "title": "\u7B80\u6D01\u6807\u9898", "tags": ["\u6807\u7B7E"], "summary": "\u7528\u9014\u6458\u8981\u4E0E\u4F7F\u7528\u8BF4\u660E", "body": "\u4F18\u5316\u6539\u5199\u540E\u7684\u63D0\u793A\u8BCD\u6B63\u6587" }',
    "",
    "\u8981\u6C42\uFF1A",
    "- title\uFF1A\u7B80\u6D01\u660E\u4E86\uFF0C\u4E0D\u8D85\u8FC7 30 \u5B57\uFF1B",
    "- tags\uFF1A\u53EA\u8F93\u51FA 1 \u4E2A\u6807\u7B7E\uFF1B\u4F18\u5148\u4ECE\u3010\u6807\u7B7E\u5E93\u3011\u4E2D\u9009\u62E9\u6700\u8D34\u5408\u7684\u4E00\u4E2A\uFF0C\u82E5\u6CA1\u6709\u5408\u9002\u7684\u518D\u65B0\u9020\u4E00\u4E2A\u7B80\u6D01\u3001\u8D34\u5408\u5185\u5BB9\u7684\u65B0\u6807\u7B7E\uFF1B",
    "- summary\uFF1A\u4E00\u4E24\u53E5\u8BDD\u8BF4\u660E\u8FD9\u4E2A\u63D0\u793A\u8BCD\u7684\u7528\u9014\u4E0E\u4F7F\u7528\u65B9\u6CD5\uFF1B",
    "- body\uFF1A\u5728\u4FDD\u7559\u539F\u610F\u7684\u57FA\u7840\u4E0A\u6DA6\u8272\uFF0C\u4F7F\u8868\u8FBE\u66F4\u6E05\u6670\u3001\u901A\u7528\u3001\u53EF\u76F4\u63A5\u4F7F\u7528\uFF0C\u4E0D\u8981\u4E22\u5931\u5173\u952E\u7EC6\u8282\uFF1B",
    ...existingVars.length ? [
      "- \u6B63\u6587\u4E2D\u7684 `{{\u53D8\u91CF\u540D}}` \u662F\u6A21\u677F\u53D8\u91CF\u5360\u4F4D\u7B26\uFF08\u8FD0\u884C\u65F6\u7531\u4F7F\u7528\u8005\u66FF\u6362\uFF09\uFF1A\u6240\u6709\u5DF2\u6709\u7684 {{}} \u5FC5\u987B\u539F\u6837\u4FDD\u7559\uFF0C\u4E0D\u5F97\u5220\u9664\u3001\u6539\u5199\u6216\u66FF\u6362\u5176\u4E2D\u7684\u53D8\u91CF\u540D\u3001\u4E0D\u5F97\u4FEE\u6539\u5176\u62EC\u53F7\u683C\u5F0F\uFF1B"
    ] : [],
    "- \u82E5\u6B63\u6587\u67D0\u5904\u5185\u5BB9\u4F1A\u56E0\u4F7F\u7528\u573A\u666F\u800C\u53D8\u5316\uFF08\u5982\u89D2\u8272\u3001\u5BF9\u8C61\u3001\u4E3B\u9898\u3001\u98CE\u683C\u3001\u7EC6\u8282\u7B49\uFF09\uFF0C\u53EF\u5728\u90A3\u5904\u65B0\u589E\u547D\u540D\u6E05\u6670\u3001\u8D34\u5408\u8BED\u5883\u7684 {{\u53D8\u91CF\u540D}} \u5360\u4F4D\u7B26\uFF0C\u63D0\u5347\u63D0\u793A\u8BCD\u53EF\u590D\u7528\u6027\uFF1B\u6CA1\u6709\u8FD9\u79CD\u9700\u6C42\u65F6\u4E0D\u8981\u753B\u86C7\u6DFB\u8DB3\uFF1B"
  ].join("\n");
  return withSoulSystem(system);
}
function userMessage(rawBody, tag, existingVars) {
  const lines = ["\u4EE5\u4E0B\u662F\u7528\u6237\u8981\u5B66\u4E60\u7684\u539F\u59CB\u63D0\u793A\u8BCD\uFF1A", "", rawBody];
  if (tag) lines.push("", `\u7528\u6237\u7ED9\u51FA\u7684\u5019\u9009\u6807\u7B7E\uFF1A${tag}`);
  if (existingVars && existingVars.length) {
    lines.push("", `\u6B63\u6587\u5DF2\u6709\u6A21\u677F\u53D8\u91CF\uFF08{{}} \u5185\u4E3A\u53D8\u91CF\u540D\uFF0C\u8FD0\u884C\u65F6\u66FF\u6362\uFF0C\u5FC5\u987B\u539F\u6837\u4FDD\u7559\uFF09\uFF1A${existingVars.join("\u3001")}`);
  }
  return lines.join("\n");
}
async function withSoulSystem(system, soul) {
  try {
    const boundary = buildSoulBoundary(soul ?? await readSoulDoc());
    if (!boundary) return system;
    return [system, "", "# SOUL \xB7 \u4EBA\u683C", boundary].join("\n");
  } catch {
    return system;
  }
}
async function collectText(runtime, route, system, content) {
  const options = {
    provider: route.provider,
    model: route.model,
    messages: [
      createUserMessage({
        content: [{ type: "text", text: content }],
        source: { kind: "plugin", plugin: "prompt-library" }
      })
    ],
    system,
    maxTokens: AI_MAX_TOKENS,
    temperature: 0.4,
    signal: AbortSignal.timeout(AI_TIMEOUT_MS)
  };
  const assembler = new BlockAssembler();
  try {
    for await (const chunk of runtime.stream(options)) {
      assembler.push(chunk);
    }
  } catch (e) {
    logAI(aiLogCopy().collectErr(String(e)));
    return void 0;
  }
  if (assembler.finish.kind !== "stop" && assembler.finish.kind !== "max-tokens") {
    logAI(aiLogCopy().collectAbort(assembler.finish.kind));
    return void 0;
  }
  const text = assembler.blocks().filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  if (!text) {
    logAI(aiLogCopy().collectEmpty);
    return void 0;
  }
  logAI(aiLogCopy().collectDone(assembler.finish.kind, text.length));
  return text;
}
async function collectTextWithFallback(runtime, candidates, system, content) {
  if (candidates.length === 0) {
    logAI(aiLogCopy().fbNone);
    return void 0;
  }
  for (const route of candidates) {
    logAI(aiLogCopy().fbTry(route.provider, route.model));
    const text = await withLlmLock(() => collectText(runtime, route, system, content));
    if (text !== void 0) {
      logAI(aiLogCopy().fbUse(route.provider, route.model));
      return text;
    }
    logAI(aiLogCopy().fbNext(route.provider, route.model));
  }
  logAI(aiLogCopy().fbAllFail);
  return void 0;
}
function parseJson(text) {
  return parseRefineResult(text);
}
async function enrichLearnedPrompt(prompt, settings) {
  logAI(aiLogCopy().enrichStart(prompt.title, prompt.body.length));
  if (!llm) {
    logAI(aiLogCopy().enrichSkipNoLlmTitle(prompt.title));
    return;
  }
  if (enrichInFlight.has(prompt.id)) {
    logAI(aiLogCopy().enrichSkipBusy(prompt.title));
    return;
  }
  enrichInFlight.add(prompt.id);
  try {
    await enrichLearnedPromptInner(prompt, settings);
  } finally {
    enrichInFlight.delete(prompt.id);
  }
}
var enrichInFlight = /* @__PURE__ */ new Set();
async function enrichLearnedPromptInner(prompt, settings) {
  if (!llm) return;
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return;
  const tagList = await listTags().catch(() => []);
  const existingTags = tagList.map((t) => t.name);
  logAI(aiLogCopy().enrichTags(existingTags.length, existingTags.join(", ")));
  const existingVars = [...prompt.body.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((m) => m[1].trim()).filter(Boolean);
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await systemPrompt(existingTags, existingVars),
    userMessage(prompt.body, prompt.tags?.[0], existingVars)
  );
  if (!text) return;
  const result = parseJson(text);
  if (!result) {
    logAI(aiLogCopy().parseFail(text.slice(0, 300)));
    return;
  }
  logAI(aiLogCopy().parseOk(result.title || "", result.tags.join(", "), result.summary.length, result.body.length));
  const changed = result.body !== prompt.body;
  await updatePrompt(prompt.id, {
    title: result.title || prompt.title,
    // AI 智能完善只创建一个标签，避免生成过多标签；手动多选标签走前端 TagInput，不受影响
    tags: result.tags.length ? result.tags.slice(0, 1) : prompt.tags,
    summary: result.summary || void 0,
    body: changed ? result.body : prompt.body,
    sourceBody: changed ? prompt.body : void 0,
    aiRefined: true
  });
  logAI(aiLogCopy().enrichDone(result.title || prompt.title, changed));
}
var AI_OPEN_RE = /^(好的?|好的呢|没问题|收到|可以|想到了|毕竟是|这是我的|这是我(为[你您])?(优化|润色|完善|整理|改写)?(后|好的?|的|成的|版)?|以下为?(你|您)?(的)?(优化|润色|完善|整理|改写)?(后|好的?|的|成的|版|结果|建议)?|下面是?(的)?|以下是?[你您]?(的)?|这会?是|为你?|为您?|已(经)?为[你您]|已为你|结果如下|如下|示例如下|请[你您]查收|我给[你您]|回答完毕|帮你|现在为[你您]|给你(的)?)|^(hello|hi\b|hey\b|sure|of\s+course|no\s+problem|here(?:\s|'s| is)|below\b|this\s+is|the\s+(polished|optimized|improved|revised|updated|cleaned|final|better)\s+version|i(?:'ve| have| am)?(?: prepared| optimized| provided| polished| revised| improved| updated)?|please\s+find|glad\s+to\s+help|conforme?d)/i;
var AI_CLOSE_RE = /^(希望(?:能|对)?[你您]?|如有(?:任何)?|如果(?:有|需要|你)|倘若|有问题|有任何|祝你?|祝您|以上(?:是)?|仅供|谢谢|感谢|需要|如需|有需要|敬请|请继续|随时|以下是根据|我[可能已经]?可以|加油|总体来说|总而言之|只需|您可以在|您可以按|有任何需要)|^(hope|i\s+hope|let\s+me\s+know|if\s+you\s+need|feel\s+free|thanks|thank\s+you|regards|best\s+regards|good\s+luck|please\s+(?:feel\s+free|let\s+me|don't|do\s+not\s+hesitate)|any\s+questions|do\s+not\s+hesitate)/i;
function stripAiFiller(text) {
  if (!text) return text;
  let out = text.trim();
  out = out.replace(/^\s*```[a-zA-Z0-9_+\-.]*\s*\n?([\s\S]*?)\s*\n?```\s*$/, "$1").trim();
  const lines = out.split("\n");
  let start = 0;
  const maxFront = Math.min(lines.length, 6);
  while (start < maxFront && AI_OPEN_RE.test(lines[start].trim())) start++;
  let end = lines.length;
  while (end - 1 > start && end - start <= 6 && AI_CLOSE_RE.test(lines[end - 1].trim())) end--;
  return lines.slice(start, end).join("\n").trim();
}
async function enrichPromptProfessional(body, settings) {
  logAI(aiLogCopy().enrichStartBody(body.length));
  if (!llm) {
    logAI(aiLogCopy().enrichSkipNoLlm);
    return void 0;
  }
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return void 0;
  const system = [
    "\u4F60\u662F\u4E00\u540D\u4E13\u4E1A\u7684\u63D0\u793A\u8BCD\u5B8C\u5584\u52A9\u624B\uFF0C\u64C5\u957F\u628A\u7528\u6237\u7684\u63D0\u793A\u8BCD\u5B8C\u5584\u6210\u66F4\u5168\u9762\u3001\u66F4\u4E13\u4E1A\u3001\u7ED3\u6784\u5B8C\u6574\u3001\u53EF\u76F4\u63A5\u6267\u884C\u7684\u9AD8\u8D28\u91CF\u4F5C\u54C1\u3002",
    "",
    "\u8981\u6C42\uFF08\u4E0E\u300C\u6DA6\u8272\u300D\u76F8\u53CD\uFF1A\u6DA6\u8272\u662F\u628A\u5185\u5BB9\u6362\u5F97\u66F4\u7B80\u6D01\u7CBE\u70BC\uFF1B\u6B64\u5904\u662F\u6269\u5199\u5B8C\u5584\uFF0C\u4F7F\u5176\u66F4\u5B8C\u6574\u4E13\u4E1A\uFF09\uFF1A",
    "- \u53EA\u5B8C\u5584\u63D0\u793A\u8BCD\u6B63\u6587\u672C\u8EAB\uFF0C\u4E0D\u8981\u6D89\u53CA\u6807\u9898\u3001\u6807\u7B7E\u3001\u5206\u7C7B\uFF1B",
    "- \u4FDD\u7559\u539F\u610F\u4E0E\u6838\u5FC3\u8981\u6C42\uFF0C\u5728\u6B64\u57FA\u7840\u4E0A\u6269\u5199\u5B8C\u5584\uFF1A\u8865\u5145\u5FC5\u8981\u7684\u65B9\u6CD5\u3001\u6B65\u9AA4\u3001\u7EA6\u675F\u3001\u8FB9\u754C\u4E0E\u81EA\u67E5\u8981\u70B9\uFF0C\u4F7F\u63D0\u793A\u8BCD\u66F4\u5168\u9762\u3001\u66F4\u4E13\u4E1A\u3001\u66F4\u53EF\u6267\u884C\uFF1B",
    "- \u7528\u6E05\u6670\u7684\u7ED3\u6784\u7EC4\u7EC7\u5185\u5BB9\uFF08\u5206\u6B65\u9AA4 / \u5206\u8981\u70B9 / \u5206\u9636\u6BB5\uFF09\uFF0C\u65B9\u4FBF\u4F7F\u7528\u8005\u9010\u9879\u843D\u5B9E\uFF1B",
    "- \u4F7F\u7528\u4E13\u4E1A\u3001\u7CBE\u51C6\u3001\u89C4\u8303\u7684\u8868\u8FBE\uFF0C\u907F\u514D\u542B\u7CCA\u4E0E\u53E3\u8BED\u5316\uFF1B",
    "- \u4E0D\u8981\u523B\u610F\u7F29\u77ED\u6216\u538B\u7F29\u5185\u5BB9\uFF0C\u9002\u5F53\u6269\u5145\u7EC6\u8282\u4EE5\u63D0\u5347\u5B8C\u6210\u5EA6\uFF1B",
    "- \u76F4\u63A5\u8F93\u51FA\u5B8C\u5584\u540E\u7684\u63D0\u793A\u8BCD\u6B63\u6587\uFF0C\u4E0D\u8981\u4EFB\u4F55\u89E3\u91CA\u6216 Markdown \u4EE3\u7801\u5757\u3002"
  ].join("\n");
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await withSoulSystem(system),
    `\u8BF7\u628A\u4EE5\u4E0B\u63D0\u793A\u8BCD\u5B8C\u5584\u6210\u66F4\u4E13\u4E1A\u3001\u66F4\u5168\u9762\u3001\u7ED3\u6784\u5B8C\u6574\u7684\u7248\u672C\uFF1A

${body}`
  );
  if (!text) return void 0;
  logAI(aiLogCopy().enrichDoneBody(text.length));
  return stripAiFiller(text);
}
async function polishPromptBody(body, settings, opts) {
  logAI(aiLogCopy().polishStart(body.length));
  if (!llm) {
    logAI(aiLogCopy().enrichSkipNoLlm);
    return void 0;
  }
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return void 0;
  const keepVariables = opts?.keepVariables !== false;
  const existingVars = keepVariables ? [...body.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((m) => m[1].trim()).filter(Boolean) : [];
  const system = [
    "\u4F60\u662F\u4E00\u540D\u4E13\u4E1A\u7684\u63D0\u793A\u8BCD\u6DA6\u8272\u52A9\u624B\uFF0C\u64C5\u957F\u8D34\u5408\u7528\u6237\u7684\u5199\u4F5C\u98CE\u683C\u5BF9\u63D0\u793A\u8BCD\u8FDB\u884C\u6DA6\u8272\u3002",
    "",
    "\u8981\u6C42\uFF1A",
    "- \u53EA\u6DA6\u8272\u63D0\u793A\u8BCD\u5185\u5BB9\u672C\u8EAB\uFF0C\u4E0D\u8981\u6D89\u53CA\u6807\u9898\u3001\u6807\u7B7E\u3001\u5206\u7C7B\u7B49\uFF1B",
    "- \u4FDD\u6301\u539F\u610F\u4E0E\u6240\u6709\u5173\u952E\u7EC6\u8282\uFF0C\u4E0D\u5F97\u9057\u6F0F\u3001\u66F2\u89E3\u6216\u5220\u51CF\uFF1B",
    ...keepVariables ? [
      "- \u6B63\u6587\u4E2D\u7684 `{{\u53D8\u91CF\u540D}}` \u662F\u6A21\u677F\u53D8\u91CF\u5360\u4F4D\u7B26\uFF08\u8FD0\u884C\u524D\u7531\u4F7F\u7528\u8005\u66FF\u6362\uFF09\uFF1A\u6240\u6709\u5DF2\u6709\u7684 {{}} \u5FC5\u987B\u539F\u6837\u4FDD\u7559\uFF0C\u4E0D\u5F97\u5220\u9664\u3001\u6539\u5199\u6216\u66FF\u6362\u5176\u4E2D\u7684\u53D8\u91CF\u540D\uFF1B",
      "- \u82E5\u6B63\u6587\u67D0\u5904\u5185\u5BB9\u4F1A\u56E0\u4F7F\u7528\u573A\u666F\u800C\u53D8\u5316\uFF08\u5982\u89D2\u8272\u3001\u5BF9\u8C61\u3001\u4E3B\u9898\u3001\u98CE\u683C\u3001\u7EC6\u8282\u7B49\uFF09\uFF0C\u53EF\u5728\u8BE5\u5904\u65B0\u589E\u547D\u540D\u6E05\u6670\u3001\u8D34\u5408\u8BED\u5883\u7684 {{\u53D8\u91CF\u540D}} \u5360\u4F4D\u7B26\uFF0C\u63D0\u5347\u63D0\u793A\u8BCD\u53EF\u590D\u7528\u6027\uFF1B\u6CA1\u6709\u8FD9\u79CD\u9700\u6C42\u65F6\u4E0D\u8981\u753B\u86C7\u6DFB\u8DB3\uFF1B"
    ] : [],
    "- \u8BA9\u63D0\u793A\u8BCD\u66F4\u6E05\u6670\u3001\u901A\u7528\u3001\u7ED3\u6784\u6E05\u6670\u3001\u53EF\u76F4\u63A5\u590D\u7528\uFF1B",
    "- \u76F4\u63A5\u8F93\u51FA\u6DA6\u8272\u540E\u7684\u63D0\u793A\u8BCD\u6B63\u6587\uFF0C\u4E0D\u8981\u4EFB\u4F55\u89E3\u91CA\u6216 Markdown \u4EE3\u7801\u5757\u3002"
  ].join("\n");
  const content = keepVariables && existingVars.length ? `\u8BF7\u6DA6\u8272\u4EE5\u4E0B\u63D0\u793A\u8BCD\u5185\u5BB9\u3002\u5176\u4E2D\u5DF2\u6709\u6A21\u677F\u53D8\u91CF\uFF08{{}} \u5185\u4E3A\u53D8\u91CF\u540D\uFF0C\u8FD0\u884C\u524D\u4F1A\u88AB\u66FF\u6362\uFF0C\u5FC5\u987B\u539F\u6837\u4FDD\u7559\uFF09\uFF1A${existingVars.join("\u3001")}

${body}` : `\u8BF7\u6DA6\u8272\u4EE5\u4E0B\u63D0\u793A\u8BCD\u5185\u5BB9\uFF1A

${body}`;
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await withSoulSystem(system),
    content
  );
  if (!text) return void 0;
  logAI(aiLogCopy().polishDone(text.length));
  return stripAiFiller(text);
}
function parseSummaryJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return void 0;
  try {
    const obj = JSON.parse(candidate.slice(start, end + 1));
    const summary = typeof obj.summary === "string" ? obj.summary.trim() : "";
    return summary || void 0;
  } catch {
    return void 0;
  }
}
async function polishPromptBodyWithSummary(body, settings, opts) {
  const polished = await polishPromptBody(body, settings, opts);
  if (polished === void 0) return void 0;
  if (!llm) return { polished };
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return { polished };
  const summarySystem = [
    "\u4F60\u662F\u4E00\u540D\u4E13\u4E1A\u7684\u63D0\u793A\u8BCD\u5206\u6790\u5E08\uFF0C\u64C5\u957F\u7528\u4E00\u53E5\u8BDD\u6982\u62EC\u63D0\u793A\u8BCD\u7684\u7528\u9014\u4E0E\u7528\u6CD5\u3002",
    "",
    "\u8981\u6C42\uFF1A",
    "- \u7528\u4E00\u4E24\u53E5\u8BDD\u8BF4\u660E\u8FD9\u6761\u63D0\u793A\u8BCD\u7684\u6838\u5FC3\u7528\u9014\u4E0E\u5927\u81F4\u4F7F\u7528\u65B9\u6CD5\uFF08\u9002\u7528\u573A\u666F/\u4F7F\u7528\u65B9\u5F0F\uFF09\uFF1B",
    "- \u7B80\u6D01\u81EA\u7136\uFF0C\u4E0D\u8981\u590D\u8FF0\u6B63\u6587\u7684\u5177\u4F53\u7EC6\u8282\u4E0E\u6B65\u9AA4\uFF0C50 \u5B57\u4EE5\u5185\uFF1B",
    '- \u76F4\u63A5\u8F93\u51FA JSON\uFF1A{ "summary": "\u7528\u9014\u6458\u8981" }\uFF0C\u4E0D\u8981\u4EFB\u4F55\u89E3\u91CA\u6216 Markdown \u4EE3\u7801\u5757\u3002'
  ].join("\n");
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await withSoulSystem(summarySystem),
    `\u8BF7\u4E3A\u4EE5\u4E0B\u63D0\u793A\u8BCD\u751F\u6210\u7528\u9014\u6458\u8981\uFF1A

${polished}`
  );
  if (!text) return { polished };
  const summary = parseSummaryJson(text);
  logAI(aiLogCopy().polishSummaryDone(summary?.length ?? 0));
  return summary ? { polished, summary } : { polished };
}
async function commentOnStats(statsText, settings, lang = "zh") {
  if (!llm) return "";
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return "";
  const system = lang === "en" ? [
    "You are a prompt-library operations analyst who gives concise, actionable reviews and suggestions based on stats.",
    "",
    "Requirements:",
    "- Write one paragraph (within 100 words) in English, highlighting strengths and areas to improve;",
    "- Give practical, actionable suggestions, no empty talk;",
    "- Output only the review text: no headings, numbering, or Markdown code blocks; do not restate raw stats."
  ].join("\n") : [
    "\u4F60\u662F\u4E00\u540D\u8BCD\u5E93\u8FD0\u8425\u5206\u6790\u52A9\u624B\uFF0C\u64C5\u957F\u6839\u636E\u7EDF\u8BA1\u6570\u636E\u7ED9\u51FA\u7B80\u6D01\u3001\u53EF\u6267\u884C\u7684\u70B9\u8BC4\u4E0E\u6539\u8FDB\u5EFA\u8BAE\u3002",
    "",
    "\u8981\u6C42\uFF1A",
    "- \u7528\u4E00\u6BB5\u4E2D\u6587\u70B9\u8BC4\u4EE5\u4E0A\u7EDF\u8BA1\u6570\u636E\uFF08100 \u5B57\u4EE5\u5185\uFF09\uFF0C\u6307\u51FA\u4EAE\u70B9\u4E0E\u53EF\u4F18\u5316\u70B9\uFF1B",
    "- \u7ED9\u51FA\u63A5\u5730\u6C14\u3001\u53EF\u6267\u884C\u7684\u5EFA\u8BAE\uFF0C\u4E0D\u8981\u7A7A\u8BDD\u5957\u8BDD\uFF1B",
    "- \u76F4\u63A5\u8F93\u51FA\u70B9\u8BC4\u6587\u672C\uFF0C\u4E0D\u8981\u6807\u9898\u3001\u7F16\u53F7\u6216 Markdown \u4EE3\u7801\u5757\uFF0C\u4E0D\u8981\u590D\u8FF0\u539F\u59CB\u7EDF\u8BA1\u6570\u636E\u3002"
  ].join("\n");
  const content = `\u4EE5\u4E0B\u662F\u8BCD\u5E93\u7684\u4F7F\u7528\u7EDF\u8BA1\u6570\u636E\uFF0C\u8BF7\u70B9\u8BC4\uFF1A

${statsText}`;
  const text = await collectTextWithFallback(llm, candidates, system, content);
  return text?.trim() ?? "";
}
async function generateIntro(lang, settings) {
  logAI(aiLogCopy().introStart(lang));
  if (!llm) {
    logAI(aiLogCopy().enrichSkipNoLlm);
    return void 0;
  }
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return void 0;
  const zhMode = lang !== "en";
  const system = zhMode ? [
    "\u4F60\u662F\u4E00\u540D\u64C5\u957F\u62DF\u5E7F\u544A\u6587\u6848\u7684\u4E2D\u6587\u6587\u6848\uFF0C\u4E3A\u300C\u8BCD\u5E93\u300D\uFF08\u4E00\u6B3E\u4FDD\u5B58\u3001\u7EC4\u7EC7\u3001AI \u6DA6\u8272\u5E76\u590D\u7528\u63D0\u793A\u8BCD\u7684\u5C0F\u5DE5\u5177\uFF09\u64B0\u5199\u7B80\u6D01\u8D70\u5FC3\u7684\u529F\u80FD\u7B80\u4ECB\u3002",
    "",
    "\u8981\u6C42\uFF1A",
    "- \u8F93\u51FA\u6070\u597D 5 \u53E5\u7B80\u4ECB\uFF0C\u6BCF\u53E5\u4E00\u884C\uFF0C\u5206\u522B\u4ECE\u8BB0\u5F55\u3001\u6DA6\u8272\u3001\u6574\u7406\u3001\u4E00\u952E\u4F7F\u7528\u3001\u968F\u65F6\u53EF\u5F97\u7B49\u89D2\u5EA6\u4ECB\u7ECD\u4EF7\u503C\uFF1B",
    "- \u98CE\u683C\u6709\u6587\u6C14\u3001\u6709\u753B\u9762\u611F\u3001\u81EA\u7136\u7075\u52A8\uFF0C\u907F\u514D\u6587\u8A00\u5806\u780C\u4E0E\u7A7A\u6D1E\u5957\u8BDD\uFF08\u5982\u201C\u53D7\u76CA\u65E0\u7A77\u201D\u201C\u591A\u591A\u76CA\u5584\u201D\uFF09\uFF1B",
    "- \u6BCF\u53E5 10~20 \u5B57\uFF0C\u6717\u6717\u4E0A\u53E3\uFF0C\u957F\u77ED\u9519\u843D\uFF0C\u4E0D\u8981\u5168\u90FD\u4E00\u4E2A\u53E5\u5F0F\uFF1B",
    "- \u4E0D\u8981\u7F16\u53F7\u3001\u9879\u76EE\u7B26\u53F7\u3001\u5F15\u53F7\u3001\u8BED\u6C14\u8BCD\u6216\u4EFB\u4F55\u89E3\u91CA\u3002",
    "",
    "\u98CE\u683C\u793A\u8303\uFF08\u4EC5\u53C2\u8003\uFF0C\u52FF\u7167\u6284\uFF09\uFF1A",
    "- \u6167\u5FC3\u8BB0\u4E4B\uFF0C\u968F\u53D6\u968F\u7528\u3002",
    "- AI \u6DA6\u9970\uFF0C\u70BC\u5B57\u6210\u53E5\u3002",
    "- \u5206\u95E8\u522B\u7C7B\uFF0C\u68C0\u7D22\u5982\u6D41\u3002"
  ].join("\n") : [
    "You are a copywriter crafting elegant short taglines for a prompt library where users save, organize, AI-polish, and reuse prompts.",
    "",
    "Requirements:",
    "- Output exactly 5 taglines, one per line, covering saving, polishing, organizing, one-tap use and always-on access;",
    "- Keep the tone refined, vivid and memorable, 6-12 words each; avoid clich\xE9s and empty praise;",
    "- Vary the sentence shapes a little; no numbering, bullets, quotes, filler words, or explanation."
  ].join("\n");
  const content = zhMode ? "\u4E3A\u300C\u8BCD\u5E93\u300D\u5DE5\u5177\u5199 5 \u53E5\u7B80\u4ECB\u3002" : "Write 5 taglines for the prompt library tool.";
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await withSoulSystem(system),
    content
  );
  if (!text) return void 0;
  const lines = text.split(/\r?\n/).map((l) => l.trim().replace(/^\d+[.、)）]\s*/, "").replace(/^-+\s*/, "")).filter(Boolean);
  logAI(aiLogCopy().introDone(lines.length));
  lines.forEach((l, i) => logAI(aiLogCopy().introLine(i, l)));
  return lines.slice(0, 5);
}
function parseJsonArray2(text) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start < 0 || end <= start) return void 0;
  try {
    const v = JSON.parse(t.slice(start, end + 1));
    return Array.isArray(v) ? v : void 0;
  } catch {
    return void 0;
  }
}
function todayLocalDate() {
  const d = /* @__PURE__ */ new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
async function generateDailyReport(statsText, settings, lang = "zh") {
  if (!llm) return void 0;
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return void 0;
  const zhMode = lang !== "en";
  const system = zhMode ? [
    "\u4F60\u662F\u4E00\u540D\u300C\u8BCD\u5E93\u65E5\u62A5\u300D\u7F16\u8F91\uFF0C\u6839\u636E\u5F53\u65E5\u7684\u8BCD\u5E93\u4F7F\u7528\u6570\u636E\uFF0C\u4E3A\u4F7F\u7528\u8005\u64B0\u5199\u4E00\u4EFD\u7B80\u660E\u3001\u6709\u6E29\u5EA6\u7684\u4ECA\u65E5\u8BCD\u5E93\u65E5\u62A5\u3002",
    "",
    "\u8981\u6C42\uFF1A",
    "- \u57FA\u4E8E\u7ED9\u51FA\u7684\u7EDF\u8BA1\u6570\u636E\uFF0C\u63D0\u70BC 3~5 \u6761\u6838\u5FC3\u8981\u70B9\uFF08\u4E0D\u5B9C\u8FC7\u591A\uFF09\uFF1B",
    "- \u6BCF\u6761\u8981\u70B9\u4E3A\u4E00\u4E2A JSON \u5BF9\u8C61 { headline, body }\uFF1Aheadline \u662F 10 \u5B57\u4EE5\u5185\u7684\u9192\u76EE\u77ED\u6807\u9898\uFF0Cbody \u662F\u4E00\u53E5\u8BDD\u5C55\u5F00\u8BF4\u660E\uFF0840 \u5B57\u5185\uFF09\uFF1B",
    "- \u8BED\u6C14\u81EA\u7136\u4EB2\u5207\u3001\u63A5\u5730\u6C14\uFF0C\u907F\u514D\u5957\u8BDD\u4E0E\u7A7A\u6D1E\u9F13\u52B1\uFF1B",
    '- \u53EA\u8F93\u51FA\u4E00\u4E2A JSON \u6570\u7EC4\uFF0C\u4F8B\u5982 [{"headline":"\u4F7F\u7528\u6E10\u5165\u4F73\u5883","body":"\u4ECA\u65E5\u5171\u4F7F\u7528 12 \u6B21\u63D0\u793A\u8BCD\uFF0C\u8F83\u6B64\u524D\u66F4\u9891\u7E41\u3002"}]\uFF1B\u4E0D\u8981\u4EFB\u4F55\u89E3\u91CA\u6216 Markdown \u4EE3\u7801\u5757\u3002'
  ].join("\n") : [
    `You are the editor of a "daily library report" (\u8BCD\u5E93\u65E5\u62A5). Based on today's library usage data, write a brief and warm report for the user.`,
    "",
    "Requirements:",
    "- Distill 3-5 core points from the given stats (not too many);",
    "- Each point is a JSON object { headline, body }: headline is a punchy short title (within 10 words), body is a one-sentence explanation (within 40 words);",
    "- Keep the tone natural, friendly and down-to-earth; avoid clich\xE9s and empty praise;",
    '- Output only a JSON array, e.g. [{"headline":"Usage on the rise","body":"Used 12 prompts today, more than before."}]; no explanation or Markdown fences.',
    "- IMPORTANT: reply entirely in English, even though the stats may be described in Chinese."
  ].join("\n");
  const text = await collectTextWithFallback(
    llm,
    candidates,
    system,
    zhMode ? `\u4EE5\u4E0B\u662F\u4ECA\u65E5\u8BCD\u5E93\u7684\u7EDF\u8BA1\u6570\u636E\uFF1A

${statsText}` : `Here are today's library usage stats:

${statsText}

Write the daily report in English.`
  );
  if (!text) return void 0;
  const arr = parseJsonArray2(text);
  if (!arr) return void 0;
  const items = [];
  for (const x of arr) {
    if (typeof x !== "object" || x === null) continue;
    const o = x;
    const headline = String(o.headline ?? "").trim();
    const body = String(o.body ?? "").trim();
    if (!headline || !body) continue;
    items.push({ headline, body });
  }
  if (items.length === 0) return void 0;
  logAI(aiLogCopy().introDone(items.length));
  return items.slice(0, 5);
}
function parseSkillJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return void 0;
  try {
    const obj = JSON.parse(candidate.slice(start, end + 1));
    const name2 = typeof obj.name === "string" ? obj.name.trim() : "";
    if (!name2) return void 0;
    return {
      name: name2,
      description: typeof obj.description === "string" ? obj.description.trim() : "",
      whenToUse: typeof obj.whenToUse === "string" ? obj.whenToUse.trim() : void 0
    };
  } catch {
    return void 0;
  }
}
async function generateSkillDescriptor(prompt, settings) {
  logAI(aiLogCopy().skillStart(prompt.title, prompt.body.length));
  if (!llm) {
    logAI(aiLogCopy().skillNoLlm);
    return { fail: "no-llm" };
  }
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return { fail: "route" };
  const vars = [...prompt.body.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((m) => m[1].trim()).filter(Boolean);
  const system = [
    "\u4F60\u662F\u4E00\u540D DSH \u6280\u80FD\uFF08SKILL\uFF09\u8BBE\u8BA1\u52A9\u624B\u3002\u7528\u6237\u4F1A\u7ED9\u4F60\u4E00\u6761\u63D0\u793A\u8BCD\uFF0C\u8BF7\u628A\u5B83\u8F6C\u5316\u4E3A\u4E00\u4E2A\u89C4\u8303\u3001\u53EF\u76F4\u63A5\u590D\u7528\u7684\u6280\u80FD\u3002",
    "",
    "\u8981\u6C42\uFF1A",
    "- name\uFF1A\u82F1\u6587\u5C0F\u5199 kebab-case\uFF08\u4EC5\u5B57\u6BCD/\u6570\u5B57/\u8FDE\u5B57\u7B26\uFF0C4-40 \u4E2A\u5B57\u7B26\uFF09\uFF0C\u7B80\u6D01\u8FBE\u610F\uFF0C\u4F5C\u4E3A\u6280\u80FD\u76EE\u5F55\u540D\u4E0E\u804A\u5929\u6846 /\u89E6\u53D1\u540D\uFF1B",
    "- description\uFF1A\u7528\u4E00\u53E5\u82F1\u6587\u63CF\u8FF0\u8BE5\u6280\u80FD\u7684\u7528\u9014\u4E0E\u9002\u7528\u573A\u666F\uFF08\u4E0D\u8981 Markdown\uFF09\uFF0C\u4F9B\u6280\u80FD AI \u5728\u5408\u9002\u65F6\u673A\u81EA\u52A8\u89E6\u53D1\uFF1B",
    "- whenToUse\uFF1A\u82F1\u6587\uFF0C\u4E00\u4E24\u53E5\u8BDD\u8BF4\u660E\u4EC0\u4E48\u573A\u666F\u4E0B\u5E94\u8BE5\u4F7F\u7528\u8BE5\u6280\u80FD\uFF1B",
    `- \u6B63\u6587\u4E2D\u7684 {{\u53D8\u91CF\u540D}} \u662F\u6A21\u677F\u53D8\u91CF\u5360\u4F4D\u7B26\uFF08\u8FD0\u884C\u65F6\u7531\u4F7F\u7528\u8005\u66FF\u6362\uFF09\uFF0C\u5FC5\u987B\u539F\u6837\u4FDD\u7559\uFF0C\u4E0D\u5F97\u5220\u9664\u3001\u6539\u5199\u6216\u66FF\u6362\u5176\u4E2D\u7684\u53D8\u91CF\u540D\uFF1B${vars.length ? `\u8BE5\u6280\u80FD\u9700\u8981\u7528\u6237\u63D0\u4F9B\u7684\u8F93\u5165\u53D8\u91CF\u6709\uFF1A${vars.join("\u3001")}\uFF0C\u8BF7\u5728\u63CF\u8FF0\u4E2D\u4F53\u73B0\u3002` : "\u8BE5\u6280\u80FD\u6CA1\u6709\u6A21\u677F\u53D8\u91CF\u3002"}`,
    "\u8BF7\u4E25\u683C\u8F93\u51FA\u4E00\u4E2A JSON \u5BF9\u8C61\uFF0C\u4E0D\u8981 Markdown \u4EE3\u7801\u5757\uFF0C\u4E0D\u8981\u4EFB\u4F55\u591A\u4F59\u6587\u5B57\uFF1A",
    '{ "name": "skill-name", "description": "...", "whenToUse": "..." }'
  ].join("\n");
  const content = [
    `\u63D0\u793A\u8BCD\u6807\u9898\uFF1A${prompt.title}`,
    ...prompt.summary ? [`\u63D0\u793A\u8BCD\u6458\u8981\uFF1A${prompt.summary}`] : [],
    ...prompt.tags?.length ? [`\u63D0\u793A\u8BCD\u6807\u7B7E\uFF1A${prompt.tags.join("\u3001")}`] : [],
    "",
    "\u4EE5\u4E0B\u662F\u63D0\u793A\u8BCD\u6B63\u6587\uFF08{{\u53D8\u91CF\u540D}} \u4E3A\u6A21\u677F\u53D8\u91CF\uFF0C\u5FC5\u987B\u539F\u6837\u4FDD\u7559\uFF09\uFF1A",
    prompt.body
  ].join("\n");
  const sysText = await withSoulSystem(system);
  for (let attempt = 0; attempt < 3; attempt++) {
    const text = await collectTextWithFallback(llm, candidates, sysText, content);
    if (!text) {
      if (attempt < 2) logAI(aiLogCopy().skillRetry(attempt + 1));
      else return { fail: "empty" };
      continue;
    }
    const parsed = parseSkillJson(text);
    if (!parsed) {
      logAI(aiLogCopy().skillParseFail(text.slice(0, 300)));
      if (attempt < 2) logAI(aiLogCopy().skillRetry(attempt + 1));
      else return { fail: "parse" };
      continue;
    }
    logAI(aiLogCopy().skillDone(parsed.name, parsed.description.length));
    return { desc: parsed };
  }
  return { fail: "empty" };
}
async function generateDraft(kind, title, input, settings, lang = "zh") {
  logAI(aiLogCopy().draftStart(kind, title));
  if (!llm) {
    logAI(aiLogCopy().draftNoLlm);
    return { fail: "no-llm" };
  }
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return { fail: "route" };
  const enMode = lang === "en";
  const system = enMode ? kind === "soul" ? [
    "You are an expert at writing a SOUL.md persona for an AI assistant. Based on the given persona name and any draft notes, write a complete, well-structured persona definition.",
    "",
    "Requirements:",
    "- Write the full SOUL.md content in English, with clear sections (identity, tone, working rules) using Markdown headings;",
    "- Keep it practical and warm, matching the persona's purpose; avoid clich\xE9s;",
    "- Output only the SOUL.md content \u2014 no extra explanation, no code fence."
  ].join("\n") : [
    "You are an expert at writing a DSH skill (SKILL.md) instruction for an AI assistant. Based on the given skill title and any draft notes, write a complete, actionable skill definition.",
    "",
    "Requirements:",
    "- Write the full skill content in English, starting with a short summary, then concrete instructions the assistant should follow, using Markdown;",
    "- Keep it specific, actionable and easy to reuse; avoid vagueness;",
    "- Output only the skill content \u2014 no extra explanation, no code fence."
  ].join("\n") : kind === "soul" ? [
    "\u4F60\u662F\u4E00\u540D\u64C5\u957F\u7F16\u5199 AI \u4EBA\u683C\uFF08SOUL.md\uFF09\u7684\u4E13\u5BB6\u3002\u6839\u636E\u7528\u6237\u7ED9\u7684\u4EBA\u683C\u540D\u79F0\u4E0E\u8349\u7A3F\uFF0C\u751F\u6210\u4E00\u6BB5\u5B8C\u6574\u3001\u7ED3\u6784\u6E05\u6670\u7684\u4EBA\u683C\u8BBE\u5B9A\u3002",
    "",
    "\u8981\u6C42\uFF1A",
    "- \u7528\u4E2D\u6587\u5199\u5B8C\u6574\u7684 SOUL.md \u5185\u5BB9\uFF0C\u7528 Markdown \u6807\u9898\u5206\u8282\uFF08\u8EAB\u4EFD\u8BBE\u5B9A / \u8BED\u6C14\u98CE\u683C / \u5DE5\u4F5C\u89C4\u8303\u7B49\uFF09\uFF1B",
    "- \u5185\u5BB9\u52A1\u5B9E\u3001\u6709\u6E29\u5EA6\uFF0C\u8D34\u5408\u4EBA\u683C\u7528\u9014\uFF0C\u907F\u514D\u5957\u8BDD\u7A7A\u8BDD\uFF1B",
    "- \u53EA\u8F93\u51FA SOUL.md \u6B63\u6587\uFF0C\u4E0D\u8981\u4EFB\u4F55\u89E3\u91CA\uFF0C\u4E0D\u8981 Markdown \u4EE3\u7801\u5757\u3002"
  ].join("\n") : [
    "\u4F60\u662F\u4E00\u540D\u64C5\u957F\u7F16\u5199 DSH \u6280\u80FD\uFF08SKILL.md\uFF09\u6307\u4EE4\u7684\u4E13\u5BB6\u3002\u6839\u636E\u7528\u6237\u7ED9\u7684\u6280\u80FD\u6807\u9898\u4E0E\u8349\u7A3F\uFF0C\u751F\u6210\u4E00\u6BB5\u5B8C\u6574\u3001\u53EF\u76F4\u63A5\u590D\u7528\u7684\u6280\u80FD\u5B9A\u4E49\u3002",
    "",
    "\u8981\u6C42\uFF1A",
    "- \u7528\u4E2D\u6587\u5199\u5B8C\u6574\u6280\u80FD\u6B63\u6587\uFF0C\u5148\u5199\u4E00\u6BB5\u7B80\u77ED\u7528\u9014\u8BF4\u660E\uFF0C\u518D\u5199\u5177\u4F53\u3001\u53EF\u6267\u884C\u7684\u6307\u4EE4\uFF08\u7528 Markdown \u7EC4\u7EC7\uFF09\uFF1B",
    "- \u5185\u5BB9\u5177\u4F53\u3001\u53EF\u843D\u5730\u3001\u4FBF\u4E8E\u590D\u7528\uFF0C\u907F\u514D\u7A7A\u6CDB\uFF1B",
    "- \u53EA\u8F93\u51FA\u6280\u80FD\u6B63\u6587\uFF0C\u4E0D\u8981\u4EFB\u4F55\u89E3\u91CA\uFF0C\u4E0D\u8981 Markdown \u4EE3\u7801\u5757\u3002"
  ].join("\n");
  const content = [
    `\u6807\u9898\uFF1A${title}`,
    input && input.trim() ? `\u4EE5\u4E0B\u662F\u5DF2\u6709\u7684\u8349\u7A3F / \u8865\u5145\u8981\u6C42\uFF08\u53EF\u5728\u6B64\u57FA\u7840\u5B8C\u5584\uFF09\uFF1A
${input.trim()}` : "\uFF08\u6682\u65E0\u8349\u7A3F\uFF0C\u8BF7\u6839\u636E\u6807\u9898\u5C55\u5F00\u5B8C\u6574\u5185\u5BB9\uFF09"
  ].join("\n\n");
  const sysText = system;
  for (let attempt = 0; attempt < 3; attempt++) {
    const text = await collectTextWithFallback(llm, candidates, sysText, content);
    if (!text) {
      if (attempt < 2) logAI(aiLogCopy().skillRetry(attempt + 1));
      else return { fail: "empty" };
      continue;
    }
    const cleaned = text.replace(/^```(?:md|markdown|soul|skill)?\s*/i, "").replace(/\s*```$/, "").trim();
    if (!cleaned) return { fail: "empty" };
    logAI(aiLogCopy().draftDone(kind, cleaned.length));
    return { content: cleaned };
  }
  return { fail: "empty" };
}

// src/host/skills.ts
import { mkdir, readdir, readFile as readFile2, rm as rm2, stat, writeFile as writeFile2 } from "node:fs/promises";
import { basename, dirname as dirname3, join as join4 } from "node:path";

// src/host/session-prompts.ts
import { randomUUID as randomUUID2 } from "node:crypto";
function normalizeScopePath(p) {
  let s = p.replace(/\\/g, "/").trim();
  while (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return process.platform === "win32" ? s.toLowerCase() : s;
}
function readPromptBody(record) {
  return record.body;
}
function recordToPrompt(record) {
  return {
    id: record.id,
    title: record.title,
    body: readPromptBody(record),
    tags: record.tags,
    enabled: record.enabled,
    updatedAt: record.updatedAt,
    usageCount: record.usageCount,
    lastUsedAt: record.lastUsedAt
  };
}
function listSessionPrompts() {
  return listSessionPromptRecords().map(recordToPrompt);
}
function getSessionPromptsByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const out = [];
  for (const id of ids) {
    const record = getSessionPromptRecord(id);
    if (record) out.push(recordToPrompt(record));
  }
  return out;
}
function createSessionPrompt(input) {
  const now = Date.now();
  const prompt = {
    id: randomUUID2(),
    title: clampTitle(input.title.trim()),
    body: input.body,
    tags: Array.isArray(input.tags) ? input.tags.filter(Boolean).slice(0, 1) : void 0,
    enabled: true,
    updatedAt: now,
    usageCount: 0,
    lastUsedAt: 0
  };
  createSessionPromptRecord(prompt.id, prompt.title, {
    tags: prompt.tags,
    enabled: prompt.enabled,
    updatedAt: now,
    body: prompt.body
  });
  return prompt;
}
function updateSessionPrompt(id, patch) {
  const record = getSessionPromptRecord(id);
  if (!record) return void 0;
  const currentBody = record.body;
  const next = {
    id,
    title: patch.title !== void 0 ? clampTitle(patch.title.trim()) : record.title,
    body: patch.body !== void 0 ? patch.body : currentBody,
    tags: patch.tags !== void 0 ? patch.tags.filter(Boolean).slice(0, 1) : record.tags,
    enabled: patch.enabled !== void 0 ? patch.enabled : record.enabled,
    updatedAt: Date.now(),
    usageCount: record.usageCount,
    lastUsedAt: record.lastUsedAt
  };
  updateSessionPromptMeta(id, {
    title: next.title,
    tags: next.tags,
    enabled: next.enabled,
    body: next.body
  });
  return next;
}
function deleteSessionPrompt(id) {
  for (const b of listScopePromptBindings()) {
    const next = b.promptIds.filter((x) => x !== id);
    if (next.length !== b.promptIds.length) {
      if (next.length === 0) clearScopePromptBinding(b.path);
      else setScopePromptBinding(b.path, next);
    }
  }
  for (const [scope, ids] of activeSessionPrompts) {
    const next = ids.filter((x) => x !== id);
    if (next.length !== ids.length) {
      if (next.length === 0) activeSessionPrompts.delete(scope);
      else activeSessionPrompts.set(scope, next);
    }
  }
  for (const b of listSessionBindings()) {
    if (b.promptIds.includes(id)) {
      const next = b.promptIds.filter((x) => x !== id);
      setSessionPromptBindingForSession(b.sessionId, next);
    }
  }
  deleteSessionPromptRecord(id);
  return true;
}
function setScopePromptBinding2(path, promptIds) {
  setScopePromptBinding(path, Array.isArray(promptIds) ? promptIds : []);
}
function getScopeBoundPromptIds2(path) {
  return getScopeBoundPromptIds(path);
}
function listScopePromptBindings2() {
  return listScopePromptBindings();
}
function clearScopePromptBinding2(path) {
  clearScopePromptBinding(path);
}
function resolveBoundPromptIdsForPath(cwd) {
  if (!cwd) return [];
  const normals = /* @__PURE__ */ new Map();
  for (const b of listScopePromptBindings()) {
    normals.set(normalizeScopePath(b.path), b.promptIds);
  }
  let cur = normalizeScopePath(cwd);
  for (; ; ) {
    const ids = normals.get(cur);
    if (ids && ids.length > 0) return ids;
    const idx = cur.lastIndexOf("/");
    if (idx <= 0) break;
    cur = cur.slice(0, idx);
  }
  return [];
}
var activeSessionPrompts = /* @__PURE__ */ new Map();
function setSessionActivePrompts(scope, promptIds) {
  const ids = Array.isArray(promptIds) ? [...new Set(promptIds.filter(Boolean))] : [];
  if (ids.length === 0) activeSessionPrompts.delete(scope);
  else activeSessionPrompts.set(scope, ids);
}
function getSessionActivePromptIds(scope) {
  return activeSessionPrompts.get(scope) ?? [];
}
var currentSessionScope = null;
function setCurrentSessionScope(scope) {
  currentSessionScope = typeof scope === "string" && scope ? scope : null;
}
function getCurrentSessionScope() {
  return currentSessionScope;
}
function setSessionPromptBindingForSession(sessionId, promptIds) {
  setSessionScopeBinding(sessionId, readSessionBoundPersonaId(sessionId), Array.isArray(promptIds) ? promptIds : []);
}
function setSessionPersonaBindingForSession(sessionId, personaId) {
  const pid = normalizeBoundPersonaId(personaId);
  const binding = getSessionScopeBinding(sessionId);
  setSessionScopeBinding(sessionId, pid, binding?.promptIds ?? []);
}
function getSessionBoundPromptIds(sessionId) {
  return getSessionScopeBinding(sessionId)?.promptIds ?? [];
}
function getSessionBoundPersonaId(sessionId) {
  return getSessionScopeBinding(sessionId)?.personaId ?? "";
}
function listSessionBindings() {
  return listSessionScopeBindingsAll().map((b) => ({ sessionId: b.sessionId, promptIds: b.promptIds }));
}
function readSessionBoundPersonaId(sessionId) {
  return getSessionScopeBinding(sessionId)?.personaId ?? "";
}
function normalizeBoundPersonaId(personaId) {
  return personaId && personaId !== "default" ? personaId : "";
}
function listSessionScopeBindingsAll() {
  return listSessionScopeBindingsFromStore();
}
function listSessionScopeBindingsFromStore() {
  return listSessionScopeBindings();
}
function clearSessionBinding(sessionId) {
  clearSessionScopeBinding(sessionId);
}
function clearAllSkillBindings() {
  clearAllScopePromptBindings();
  clearAllSessionPromptBindings();
}
function clearAllPersonaBindings() {
  clearAllScopePersonaBindings();
  clearAllSessionPersonaBindings();
}
function resolveSessionPromptBindingIds(sessionId, cwd) {
  if (typeof sessionId === "string" && sessionId) {
    const ids = getSessionBoundPromptIds(sessionId);
    if (ids.length > 0) return ids;
  }
  return resolveBoundPromptIdsForPath(cwd);
}
var DEFAULT_SESSION_PROMPT_SEEDS = {
  zh: [
    {
      title: "\u7F16\u7A0B",
      tags: ["\u7F16\u7A0B"],
      body: [
        "\u4F60\u662F\u4E00\u540D\u8D44\u6DF1\u5168\u6808\u5DE5\u7A0B\u5E08\uFF0C\u7CBE\u901A\u4E3B\u6D41\u7F16\u7A0B\u8BED\u8A00\u3001\u6846\u67B6\u4E0E\u5DE5\u7A0B\u5B9E\u8DF5\u3002\u56DE\u7B54\u7F16\u7A0B\u95EE\u9898\u65F6\u8BF7\uFF1A",
        "1. \u5148\u786E\u8BA4\u9700\u6C42\u4E0E\u7EA6\u675F\u6761\u4EF6\uFF0C\u5FC5\u8981\u65F6\u63D0\u95EE\u6F84\u6E05\uFF1B",
        "2. \u7ED9\u51FA\u53EF\u76F4\u63A5\u8FD0\u884C\u7684\u4EE3\u7801\u793A\u4F8B\uFF0C\u5E76\u8BF4\u660E\u5173\u952E\u5B9E\u73B0\u601D\u8DEF\uFF1B",
        "3. \u6307\u51FA\u5E38\u89C1\u5751\u70B9\u4E0E\u8FB9\u754C\u60C5\u51B5\uFF0C\u7ED9\u51FA\u9632\u5FA1\u6027\u5199\u6CD5\uFF1B",
        "4. \u6D89\u53CA\u591A\u79CD\u65B9\u6848\u65F6\u5BF9\u6BD4\u5229\u5F0A\uFF0C\u7ED9\u51FA\u660E\u786E\u63A8\u8350\u5E76\u8BF4\u660E\u7406\u7531\u3002"
      ].join("\n")
    },
    {
      title: "\u6587\u5458",
      tags: ["\u6587\u5458"],
      body: [
        "\u4F60\u662F\u4E00\u540D\u7ECF\u9A8C\u4E30\u5BCC\u7684\u529E\u516C\u5BA4\u6587\u5458\uFF0C\u64C5\u957F\u516C\u6587\u5199\u4F5C\u3001\u4F1A\u8BAE\u7EAA\u8981\u3001\u8868\u683C\u6574\u7406\u4E0E\u65E5\u5E38\u884C\u653F\u4E8B\u52A1\u3002\u56DE\u7B54\u529E\u516C\u7C7B\u4EFB\u52A1\u65F6\u8BF7\uFF1A",
        "1. \u4F7F\u7528\u6B63\u5F0F\u3001\u89C4\u8303\u7684\u4E66\u9762\u8BED\uFF0C\u884C\u6587\u7B80\u6D01\u660E\u4E86\uFF1B",
        "2. \u7ED3\u6784\u6E05\u6670\u3001\u6761\u7406\u5206\u660E\uFF0C\u5584\u7528\u5C0F\u6807\u9898\u4E0E\u5217\u8868\uFF1B",
        "3. \u63D0\u4F9B\u53EF\u76F4\u63A5\u5957\u7528\u7684\u6A21\u677F\u6216\u8303\u4F8B\uFF1B",
        "4. \u6CE8\u610F\u683C\u5F0F\u3001\u63AA\u8F9E\u4E0E\u79F0\u8C13\u7684\u89C4\u8303\u6027\uFF0C\u7B26\u5408\u804C\u573A\u60EF\u4F8B\u3002"
      ].join("\n")
    },
    {
      title: "\u5F8B\u5E08",
      tags: ["\u5F8B\u5E08"],
      body: [
        "\u4F60\u662F\u4E00\u540D\u4E25\u8C28\u4E13\u4E1A\u7684\u5F8B\u5E08\uFF0C\u64C5\u957F\u6CD5\u5F8B\u54A8\u8BE2\u3001\u6587\u4E66\u64B0\u5199\u4E0E\u5408\u89C4\u5206\u6790\u3002\u56DE\u7B54\u6CD5\u5F8B\u95EE\u9898\u65F6\u8BF7\uFF1A",
        "1. \u4F9D\u636E\u73B0\u884C\u6CD5\u5F8B\u6CD5\u89C4\u4E0E\u53F8\u6CD5\u89E3\u91CA\u7ED9\u51FA\u5206\u6790\u4E0E\u5EFA\u8BAE\uFF1B",
        "2. \u63D0\u793A\u6F5C\u5728\u6CD5\u5F8B\u98CE\u9669\u4E0E\u8D23\u4EFB\u8FB9\u754C\uFF1B",
        "3. \u63D0\u4F9B\u89C4\u8303\u7684\u6CD5\u5F8B\u6587\u4E66\u8868\u8FF0\u6216\u6761\u6B3E\u793A\u4F8B\uFF1B",
        "4. \u5BF9\u4E0D\u786E\u5B9A\u6216\u9700\u4E2A\u6848\u5224\u65AD\u7684\u4E8B\u9879\uFF0C\u660E\u786E\u8BF4\u660E\u5C40\u9650\u5E76\u5EFA\u8BAE\u54A8\u8BE2\u4E13\u4E1A\u5F8B\u5E08\u6216\u673A\u6784\u3002"
      ].join("\n")
    }
  ],
  en: [
    {
      title: "Programming",
      tags: ["Programming"],
      body: [
        "You are a senior full-stack engineer proficient in mainstream programming languages, frameworks, and engineering practices. When answering coding questions:",
        "1. Clarify the requirement and constraints first, asking questions when needed;",
        "2. Provide runnable code examples and explain the key implementation ideas;",
        "3. Point out common pitfalls and edge cases, offering defensive coding practices;",
        "4. When multiple approaches exist, compare their trade-offs and give a clear recommendation with reasons."
      ].join("\n")
    },
    {
      title: "Office Clerk",
      tags: ["Office"],
      body: [
        "You are an experienced office clerk skilled in official writing, meeting minutes, spreadsheet organization, and daily administrative tasks. When handling office tasks:",
        "1. Use formal, standard written language that is concise and clear;",
        "2. Keep the structure well-organized with headings and lists;",
        "3. Provide ready-to-use templates or examples;",
        "4. Follow workplace conventions for format, wording, and forms of address."
      ].join("\n")
    },
    {
      title: "Lawyer",
      tags: ["Lawyer"],
      body: [
        "You are a rigorous professional lawyer skilled in legal consultation, document drafting, and compliance analysis. When answering legal questions:",
        "1. Base your analysis and advice on current laws, regulations, and judicial interpretations;",
        "2. Flag potential legal risks and the boundaries of liability;",
        "3. Provide standard legal wording or sample clauses;",
        "4. For matters requiring case-specific judgment, clearly state the limitations and recommend consulting a licensed attorney or institution."
      ].join("\n")
    }
  ]
};
function seedDefaultSessionPromptsIfEmpty() {
  try {
    if (getMetaValue("session-prompts-seeded") === "1") return;
    if (listSessionPromptRecords().length > 0) {
      setMetaValue("session-prompts-seeded", "1");
      return;
    }
    const seeds = readUiLangSync() === "zh" ? DEFAULT_SESSION_PROMPT_SEEDS.zh : DEFAULT_SESSION_PROMPT_SEEDS.en;
    for (const seed of seeds) {
      createSessionPrompt({ title: seed.title, body: seed.body, tags: seed.tags });
    }
    setMetaValue("session-prompts-seeded", "1");
  } catch {
  }
}

// src/md-text.ts
function mdToPlainText(raw) {
  const lines = raw.replace(/^\uFEFF/, "").split("\n");
  const out = [];
  let inCode = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(line);
      continue;
    }
    if (/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)) continue;
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) continue;
    const stripped = line.replace(/^#{1,6}\s+/, "").replace(/^\s*>\s?/, "").replace(/^\s*[-*+]\s+/, "").replace(/^\s*\d+[.)]\s+/, "");
    out.push(stripInlineMd(stripped));
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function stripInlineMd(line) {
  let s = line;
  if (s.trimStart().startsWith("|") || s.trimEnd().endsWith("|")) {
    s = s.trim().replace(/^\|/, "").replace(/\|\s*$/, "").replace(/\|/g, " ");
  }
  return s.replace(/!\[([^\]]*)\]\([^)]*\)/g, (_m, alt) => alt).replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/~~([^~]+)~~/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/_(.+?)_/g, "$1").replace(/<[^>]+>/g, "").replace(/[ \t]+/g, " ").trim();
}

// src/host/skills.ts
function skillsRoot() {
  return join4(dshHome(), "skills");
}
function toKebab(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
function foldDescription(desc) {
  const trimmed = desc.trim();
  if (!trimmed) return 'description: ""';
  const lines = trimmed.split("\n").map((l) => `  ${l}`);
  return `description: >
${lines.join("\n")}`;
}
function buildSkillBody(body) {
  return body.trim();
}
function toReadableTitle(name2) {
  const words = name2.trim().replace(/[-_]+/g, " ").split(" ").filter(Boolean);
  if (words.length === 0) return "";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function parseSkillFile(raw) {
  const text = raw.replace(/^\uFEFF/, "");
  const lines = text.split("\n");
  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
    if (end > 0) {
      const fmText = lines.slice(1, end).join("\n");
      const body = lines.slice(end + 1).join("\n").trim();
      let fm = {};
      try {
        const parsed = load(fmText);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          fm = parsed;
        }
      } catch {
        fm = {};
      }
      return {
        name: typeof fm.name === "string" ? fm.name.trim() : void 0,
        description: typeof fm.description === "string" ? fm.description.trim() : void 0,
        whenToUse: typeof fm.whenToUse === "string" ? fm.whenToUse.trim() : void 0,
        body
      };
    }
  }
  return { body: text.trim() };
}
async function listAvailableSkills() {
  const dir = skillsRoot();
  let names = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    names = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
  const out = [];
  for (const name2 of names) {
    const skillName = toKebab(name2) || name2;
    const skillFile = join4(dir, name2, "SKILL.md");
    let raw;
    try {
      raw = await readFile2(skillFile, "utf8");
    } catch {
      continue;
    }
    const parsed = parseSkillFile(raw);
    const body = mdToPlainText(parsed.body);
    if (!body) continue;
    out.push({
      name: skillName,
      title: toReadableTitle(parsed.name || name2),
      body,
      summary: parsed.description || "",
      exists: Boolean(getPromptIdBySkillName(skillName))
    });
  }
  return out;
}
async function listSkillsFromDir(dir) {
  const out = [];
  const walk = async (d) => {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    if (!entries) return;
    for (const ent of entries) {
      if (ent.isDirectory()) {
        await walk(join4(d, ent.name));
      } else if (ent.isFile() && /\.md$/i.test(ent.name)) {
        const base = ent.name.replace(/\.md$/i, "");
        try {
          const raw = await readFile2(join4(d, ent.name), "utf8");
          const parsed = parseSkillFile(raw);
          const body = mdToPlainText(parsed.body);
          if (!body) continue;
          const skillName = toKebab(parsed.name || base) || toKebab(base);
          out.push({
            name: skillName,
            title: toReadableTitle(parsed.name || base),
            body,
            summary: parsed.description || "",
            exists: Boolean(getPromptIdBySkillName(skillName))
          });
        } catch {
        }
      }
    }
  };
  await walk(dir);
  return out;
}
function parseSkillRaw(raw) {
  const parsed = parseSkillFile(raw);
  return {
    title: toReadableTitle(parsed.name || ""),
    body: mdToPlainText(parsed.body),
    summary: parsed.description || ""
  };
}
async function importSkillEntries(entries) {
  const items = [];
  const errors = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const body = entry.body.trim();
    const title = entry.title.trim();
    const skillName = (entry.name ? toKebab(entry.name) : toKebab(title)) || `skill-${i + 1}`;
    if (!body) {
      skipped++;
      items.push({ title: title || "(\u672A\u547D\u540D)", name: skillName, status: "skipped" });
      continue;
    }
    const summary = entry.summary?.trim() || "";
    try {
      const existingId = getPromptIdBySkillName(skillName);
      if (existingId) {
        if (isPromptActive(existingId)) {
          await updatePrompt(existingId, { title, body, summary, tags: ["skill"] });
          updated++;
          items.push({ title, name: skillName, status: "updated" });
        } else if (isPromptTrashed(existingId)) {
          await restorePrompts([existingId]);
          await updatePrompt(existingId, { title, body, summary, tags: ["skill"] });
          imported++;
          items.push({ title, name: skillName, status: "imported" });
        } else {
          const prompt = await createPrompt({ title, body, tags: ["skill"], summary });
          setSkillNameForPrompt(prompt.id, skillName);
          imported++;
          items.push({ title, name: skillName, status: "imported" });
        }
      } else {
        const prompt = await createPrompt({ title, body, tags: ["skill"], summary });
        setSkillNameForPrompt(prompt.id, skillName);
        imported++;
        items.push({ title, name: skillName, status: "imported" });
      }
    } catch (e) {
      errors.push({ name: title, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return { imported, updated, skipped, items, errors };
}
async function importSkillsFromDisk() {
  const sources = await listAvailableSkills();
  if (sources.length === 0) {
    return { imported: 0, updated: 0, skipped: 0, items: [], errors: [] };
  }
  return importSkillEntries(
    sources.map((s) => ({ name: s.name, title: s.title, body: s.body, summary: s.summary }))
  );
}
async function exportPromptsAsSkills(entries, root) {
  const items = [];
  const errors = [];
  const dirRoot = root ?? skillsRoot();
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const title = entry.title.trim() || "(\u672A\u547D\u540D)";
    const body = entry.body.trim();
    if (!body) {
      errors.push({ title, reason: "\u6B63\u6587\u4E3A\u7A7A\uFF0C\u65E0\u6CD5\u5BFC\u51FA\u6280\u80FD" });
      continue;
    }
    const linked = entry.promptId ? getSkillNameForPrompt(entry.promptId) : void 0;
    const name2 = linked || toKebab(entry.name || "") || toKebab(title) || `prompt-skill-${i + 1}`;
    const description = entry.summary?.trim() || "";
    try {
      const dir = join4(dirRoot, name2);
      await mkdir(dir, { recursive: true });
      const fm = ["---", `name: ${name2}`];
      fm.push(foldDescription(description));
      fm.push("---");
      const md = [...fm, "", buildSkillBody(body), ""].join("\n");
      await writeFile2(join4(dir, "SKILL.md"), md, "utf8");
      if (entry.promptId) setSkillNameForPrompt(entry.promptId, name2);
      items.push({ title, name: name2 });
    } catch (e) {
      errors.push({ title, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return { exported: items.length, items, errors, root: dirRoot };
}
async function exportAsSessionPrompts(entries, sessionId) {
  const items = [];
  const errors = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const title = entry.title.trim() || "(\u672A\u547D\u540D)";
    const body = entry.body.trim();
    if (!body) {
      errors.push({ title, reason: "\u6B63\u6587\u4E3A\u7A7A\uFF0C\u65E0\u6CD5\u5BFC\u51FA\u6280\u80FD" });
      continue;
    }
    try {
      const prompt = createSessionPrompt({ title, body });
      if (typeof sessionId === "string" && sessionId) {
        const next = [.../* @__PURE__ */ new Set([...getSessionBoundPromptIds(sessionId), prompt.id])];
        setSessionPromptBindingForSession(sessionId, next);
      }
      items.push({ title, name: prompt.id });
    } catch (e) {
      errors.push({ title, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return { exported: items.length, items, errors, root: "" };
}
var HARNESS_SKILL_TOGGLE_KEY = "pl:harness-skill-toggles";
function readSkillToggles() {
  const raw = getMetaValue(HARNESS_SKILL_TOGGLE_KEY);
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
function writeSkillToggles(map) {
  setMetaValue(HARNESS_SKILL_TOGGLE_KEY, JSON.stringify(map));
}
async function dirExists(p) {
  try {
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}
async function scanSkillRootForToggles(root) {
  let names = [];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    names = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
  const out = [];
  for (const name2 of names) {
    const skillName = toKebab(name2) || name2;
    let raw;
    try {
      raw = await readFile2(join4(root, name2, "SKILL.md"), "utf8");
    } catch {
      continue;
    }
    const parsed = parseSkillFile(raw);
    if (!parsed.body.trim()) continue;
    out.push({
      id: join4(root, name2),
      name: skillName,
      title: toReadableTitle(parsed.name || name2),
      summary: parsed.description || ""
    });
  }
  return out;
}
async function listHarnessSkillToggles(projectRoot) {
  const toggles = readSkillToggles();
  const items = [];
  const pushEntries = async (root, scope) => {
    if (!await dirExists(root)) return;
    for (const e of await scanSkillRootForToggles(root)) {
      items.push({
        id: e.id,
        scope,
        name: e.name,
        title: e.title,
        summary: e.summary,
        root,
        enabled: toggles[e.id] !== false
      });
    }
  };
  await pushEntries(skillsRoot(), "system");
  if (projectRoot) {
    await pushEntries(join4(projectRoot, ".dsh", "skills"), "project");
  }
  return items;
}
function setHarnessSkillToggle(id, enabled) {
  const map = readSkillToggles();
  if (enabled) delete map[id];
  else map[id] = false;
  writeSkillToggles(map);
}
async function deleteHarnessSkill(id) {
  const target = join4(id);
  const parent = dirname3(target);
  if (basename(parent) !== "skills") throw new Error("invalid skill path");
  const exists = await dirExists(target).catch(() => false);
  if (!exists) return false;
  await rm2(target, { recursive: true, force: true });
  const map = readSkillToggles();
  delete map[id];
  writeSkillToggles(map);
  return true;
}
function normalizeForInjection(p) {
  return p.replace(/\\/g, "/").toLowerCase();
}
function disabledHarnessSkillsInstruction(cwd) {
  const map = readSkillToggles();
  const disabled = Object.keys(map).filter((id) => map[id] === false);
  if (disabled.length === 0) return "";
  const sysPrefix = normalizeForInjection(skillsRoot()) + "/";
  const projPrefix = cwd ? normalizeForInjection(join4(cwd, ".dsh", "skills")) + "/" : "";
  const rel = [];
  for (const id of disabled) {
    const norm = normalizeForInjection(id);
    if (norm.startsWith(sysPrefix)) {
      rel.push(basename(norm));
    } else if (projPrefix && norm.startsWith(projPrefix)) {
      rel.push(`${basename(norm)}\uFF08\u9879\u76EE\u6280\u80FD\uFF09`);
    }
  }
  if (rel.length === 0) return "";
  return [
    "\u3010\u6280\u80FD\u8F6F\u63A7\u5236 \xB7 \u7528\u6237\u5DF2\u7981\u7528\u7684\u6280\u80FD\u3011\u4EE5\u4E0B\u6280\u80FD\u5F53\u524D\u88AB\u7528\u6237\u7981\u7528\uFF0C\u9664\u975E\u7528\u6237\u660E\u786E\u8981\u6C42\uFF0C\u5426\u5219\u4E0D\u8981\u8C03\u7528\u6216\u4F7F\u7528\u5B83\u4EEC\uFF1A",
    rel.map((n) => `\xB7 ${n}`).join("\n")
  ].join("\n");
}

// src/host/update.ts
import { get as httpsGet2 } from "node:https";
import { appendFileSync as appendFileSync2, mkdirSync as mkdirSync3, readFileSync as readFileSync2 } from "node:fs";
import { spawn } from "node:child_process";
import { dirname as dirname5, join as join6 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// src/host/updateWorkbench.ts
import { execFile } from "node:child_process";
import { statSync } from "node:fs";
import { promisify } from "node:util";
import { cp, mkdir as mkdir2, readFile as readFile3, rm as rm3, stat as stat2, writeFile as writeFile3 } from "node:fs/promises";
import { dirname as dirname4, join as join5 } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
var execFileP = promisify(execFile);
var WORKBENCH_PKG = "@sunjuntao/dsh-file-workbench";
var DEFAULT_REPO = "https://github.com/master1Sun/dsh-file-workbench-lib.git";
var LIBRARY_ROOT = dirname4(dirname4(fileURLToPath(import.meta.url)));
async function readJson(p) {
  try {
    return JSON.parse(await readFile3(p, "utf8"));
  } catch {
    return null;
  }
}
function bare(tag) {
  return tag.replace(/^v/i, "");
}
function semverCompare(a, b) {
  const pa = a.split(".").map((n) => Number.isFinite(Number(n)) ? Number(n) : 0);
  const pb = b.split(".").map((n) => Number.isFinite(Number(n)) ? Number(n) : 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}
function profileRoot() {
  const envName = process.env.DSH_PROFILE || process.env.DSH_PROFILE_NAME;
  const dshHomeReal = dshHome();
  if (envName) {
    const root = join5(dshHomeReal, "profiles", envName);
    if (root) return root;
  }
  const profile = dirname4(dirname4(dirname4(LIBRARY_ROOT)));
  if (/[\\/]profiles[\\/][^\\/]+$/.test(profile)) return profile;
  return null;
}
async function workbenchRoot(profile) {
  const parts = WORKBENCH_PKG.split("/");
  const p = join5(profile, "node_modules", ...parts);
  try {
    await stat2(join5(p, "package.json"));
    return p;
  } catch {
    return null;
  }
}
async function latestRemoteTag(repo) {
  const { stdout } = await execFileP("git", ["ls-remote", "--tags", repo], {
    timeout: 15e3,
    windowsHide: true
  });
  let bestRaw = "";
  let bestSem = "";
  for (const line of stdout.split("\n")) {
    const m = /refs\/tags\/(.*?)(\^\{\})?$/.exec(line.trim());
    if (!m) continue;
    const raw = m[1];
    const sem = bare(raw);
    if (!/^\d+\.\d+\.\d+/.test(sem)) continue;
    if (!bestSem || semverCompare(sem, bestSem) > 0) {
      bestSem = sem;
      bestRaw = raw;
    }
  }
  return bestSem ? { raw: bestRaw, sem: bestSem } : null;
}
function fsExists(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}
function pkgNameFromDest(dest) {
  const idx = dest.indexOf("node_modules");
  const rel = idx >= 0 ? dest.slice(idx + "node_modules".length + 1) : dest;
  return rel.split(/[\\/]/).join("/");
}
async function installFromGit(repo, rawTag, dest) {
  const staging = join5(tmpdir(), `wb-install-${Date.now()}`);
  await rm3(staging, { recursive: true, force: true });
  await mkdir2(staging, { recursive: true });
  try {
    await execFileP(
      "git",
      ["clone", "--depth", "1", "--branch", rawTag, "--single-branch", "--", repo, staging],
      { timeout: 12e4, windowsHide: true }
    );
    await stat2(join5(staging, "lib"));
    const remotePkg = await readJson(join5(staging, "package.json"));
    let pkg;
    if (remotePkg) {
      if (bare(String(remotePkg.version ?? "")) !== bare(rawTag)) {
        throw new Error(`tag(${rawTag}) \u4E0E\u5305\u7248\u672C(${String(remotePkg.version)})\u4E0D\u7B26`);
      }
      pkg = { ...remotePkg, version: bare(rawTag) };
    } else {
      pkg = { name: pkgNameFromDest(dest), version: bare(rawTag), type: "module", main: "./lib/index.js" };
    }
    await mkdir2(dest, { recursive: true });
    await rm3(dest, { recursive: true, force: true });
    await mkdir2(dest, { recursive: true });
    await cp(join5(staging, "lib"), join5(dest, "lib"), { recursive: true });
    await writeFile3(join5(dest, "package.json"), JSON.stringify(pkg, null, 2) + "\n", "utf8");
    if (fsExists(join5(staging, "cordis.patch.yml"))) {
      await cp(join5(staging, "cordis.patch.yml"), join5(dest, "cordis.patch.yml"));
    }
  } finally {
    await rm3(staging, { recursive: true, force: true }).catch(() => void 0);
  }
}
async function ensureInBundles(profile) {
  const pkgPath = join5(profile, "package.json");
  let conf = null;
  try {
    conf = JSON.parse(await readFile3(pkgPath, "utf8"));
  } catch {
    return false;
  }
  const dsh = conf?.dsh ?? null;
  const bundleDsh = dsh?.profile ?? null;
  const bundles = bundleDsh?.bundles;
  if (!Array.isArray(bundles)) return false;
  if (bundles.includes(WORKBENCH_PKG)) return true;
  bundleDsh.bundles = [...bundles, WORKBENCH_PKG];
  await writeFile3(pkgPath, JSON.stringify(conf, null, 2) + "\n", "utf8");
  return true;
}
async function ensureWorkbenchInstalled() {
  try {
    const profile = profileRoot();
    if (!profile) return false;
    const root = await workbenchRoot(profile);
    if (root) {
      await ensureInBundles(profile).catch(() => false);
      return false;
    }
    const remote = await latestRemoteTag(DEFAULT_REPO).catch(() => null);
    if (!remote) return false;
    const dest = join5(profile, "node_modules", ...WORKBENCH_PKG.split("/"));
    await installFromGit(DEFAULT_REPO, remote.raw, dest);
    await ensureInBundles(profile).catch(() => false);
    emitWorkbenchInstalled();
    return true;
  } catch (error) {
    try {
      console.error("[dsh-prompt-library] ensureWorkbenchInstalled skipped:", error.message);
    } catch {
    }
    return false;
  }
}
async function checkWorkbenchUpdate() {
  try {
    const profile = profileRoot();
    if (!profile) return false;
    const remote = await latestRemoteTag(DEFAULT_REPO).catch(() => null);
    if (!remote) return false;
    const root = await workbenchRoot(profile);
    let installedBare = "";
    if (root) {
      const pkg = await readJson(join5(root, "package.json"));
      installedBare = bare(String(pkg?.version ?? ""));
    }
    if (installedBare && semverCompare(remote.sem, installedBare) <= 0) {
      await ensureInBundles(profile).catch(() => false);
      return false;
    }
    const dest = root ?? join5(profile, "node_modules", ...WORKBENCH_PKG.split("/"));
    await installFromGit(DEFAULT_REPO, remote.raw, dest);
    await ensureInBundles(profile).catch(() => false);
    emitWorkbenchInstalled();
    return true;
  } catch (error) {
    try {
      console.error("[dsh-prompt-library] checkWorkbenchUpdate skipped:", error.message);
    } catch {
    }
    return false;
  }
}

// src/host/update.ts
var REGISTRY_URL = "https://registry.npmjs.org/@sunjuntao%2fdsh-prompt-library/latest";
var LIBRARY_ROOT2 = dirname5(dirname5(fileURLToPath2(import.meta.url)));
var GITHUB_REPO = "master1Sun/dsh-prompt-library";
var GITHUB_RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
var CACHE_MS = 24 * 60 * 60 * 1e3;
var REQUEST_TIMEOUT_MS = 8e3;
var cache = null;
function pad22(n) {
  return n < 10 ? `0${n}` : String(n);
}
function localTime2() {
  const d = /* @__PURE__ */ new Date();
  const date = `${d.getFullYear()}-${pad22(d.getMonth() + 1)}-${pad22(d.getDate())}`;
  return `${date} ${pad22(d.getHours())}:${pad22(d.getMinutes())}:${pad22(d.getSeconds())}`;
}
function buildVersionLogCopy(lang) {
  const zh = lang === "zh";
  if (zh) {
    return {
      check: (cur, npm, github) => `\u7248\u672C\u68C0\u67E5 \u5F53\u524D=${cur} npm=${npm} github=${github}`,
      noSource: "\u7248\u672C\u68C0\u67E5 \u65E0\u53EF\u7528\u66F4\u65B0\u6E90\uFF0C\u8DF3\u8FC7",
      result: (latest) => `\u7248\u672C\u68C0\u67E5 \u7ED3\u679C latest=${latest}`,
      upgradeStart: (target, cmd) => `\u5F00\u59CB\u5347\u7EA7 \u76EE\u6807=${target} \u547D\u4EE4=${cmd}`,
      upgradeFail: (out) => `\u5347\u7EA7\u5931\u8D25 ${out}`,
      upgradeOk: "\u5347\u7EA7\u6210\u529F\uFF0C\u5DF2\u6E05\u9664\u7248\u672C\u68C0\u67E5\u7F13\u5B58",
      silentSkip: (latest) => `\u9759\u9ED8\u81EA\u52A8\u66F4\u65B0 \u65E0\u9700\u81EA\u52A8\u5347\u7EA7 latest=${latest}`,
      silentTo: (v) => `\u9759\u9ED8\u81EA\u52A8\u66F4\u65B0 \u5347\u7EA7\u5230 ${v}`,
      silentErr: (msg) => `\u9759\u9ED8\u81EA\u52A8\u66F4\u65B0 \u5F02\u5E38 ${msg}`,
      restartCmd: (method, cmd) => `\u91CD\u542F\u670D\u52A1 \u65B9\u5F0F=${method} \u547D\u4EE4=${cmd}`,
      restartErr: (msg) => `\u91CD\u542F\u670D\u52A1 \u5F02\u5E38 ${msg}`
    };
  }
  return {
    check: (cur, npm, github) => `Version check current=${cur} npm=${npm} github=${github}`,
    noSource: "Version check no available update source, skipped",
    result: (latest) => `Version check result latest=${latest}`,
    upgradeStart: (target, cmd) => `Upgrade starting target=${target} command=${cmd}`,
    upgradeFail: (out) => `Upgrade failed ${out}`,
    upgradeOk: "Upgrade succeeded, update cache cleared",
    silentSkip: (latest) => `Silent auto-update no upgrade needed latest=${latest}`,
    silentTo: (v) => `Silent auto-update upgrading to ${v}`,
    silentErr: (msg) => `Silent auto-update error ${msg}`,
    restartCmd: (method, cmd) => `Restart service method=${method} command=${cmd}`,
    restartErr: (msg) => `Restart service error ${msg}`
  };
}
function logVersion(msg) {
  if (false) return;
  try {
    const logPath = join6(logDir(), "version.log");
    mkdirSync3(dirname5(logPath), { recursive: true });
    appendFileSync2(logPath, `[${localTime2()}] ${msg}
`);
  } catch {
  }
}
function currentVersion() {
  try {
    const pkgPath = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync2(pkgPath, "utf8"));
    return typeof pkg.version === "string" && pkg.version ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}
function builtVersion() {
  return "0.12.6" ? "0.12.6" : "0.0.0";
}
function getVersionInfo() {
  return { server: builtVersion(), installed: currentVersion() };
}
function compareVersions(a, b) {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = httpsGet2(url, { headers }, (res) => {
      const code = res.statusCode ?? 0;
      if (code < 200 || code >= 300) {
        res.resume();
        reject(new Error(`responded ${code}`));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
      res.on("error", reject);
    });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}
async function fetchLatestVersion() {
  const body = await fetchJson(REGISTRY_URL, { accept: "application/json" });
  if (typeof body.version !== "string" || !body.version) {
    throw new Error("registry had no version");
  }
  return body.version;
}
async function fetchGithubLatestRelease() {
  try {
    const body = await fetchJson(GITHUB_RELEASES_URL, {
      "user-agent": "dsh",
      accept: "application/vnd.github+json"
    });
    if (typeof body.tag_name === "string") {
      const tag = body.tag_name;
      const version = tag.replace(/^v/, "");
      if (/^\d+\.\d+\.\d+/.test(version)) return { tag, version };
    }
  } catch {
  }
  return null;
}
async function isAutoUpdateEnabled() {
  try {
    const s = await getSettings();
    return s.autoUpdateEnabled ?? false;
  } catch {
    return false;
  }
}
async function checkUpdate(force = false) {
  const now = Date.now();
  const current = currentVersion();
  if (!force && cache && now - cache.at < cache.ttl) return cache.info;
  const vlog = buildVersionLogCopy(await readGlobalLocale());
  const [npmRes, ghRes] = await Promise.allSettled([fetchLatestVersion(), fetchGithubLatestRelease()]);
  const npm = npmRes.status === "fulfilled" ? npmRes.value : null;
  const gh = ghRes.status === "fulfilled" ? ghRes.value : null;
  logVersion(vlog.check(current, npm || "-", gh?.version || "-"));
  let info;
  if (npm && gh) {
    const useGit = compareVersions(gh.version, npm) > 0;
    const latest = useGit ? gh.version : npm;
    info = {
      current,
      latest,
      hasUpdate: compareVersions(latest, current) > 0,
      source: useGit ? "github" : "npm",
      gitTag: useGit ? gh.tag : ""
    };
  } else if (npm) {
    info = {
      current,
      latest: npm,
      hasUpdate: compareVersions(npm, current) > 0,
      source: "npm",
      gitTag: ""
    };
  } else if (gh) {
    info = {
      current,
      latest: gh.version,
      hasUpdate: compareVersions(gh.version, current) > 0,
      source: "github",
      gitTag: gh.tag
    };
  } else {
    logVersion(vlog.noSource);
    info = { current, latest: current, hasUpdate: false, source: "npm", gitTag: "" };
  }
  logVersion(vlog.result(info.latest));
  cache = { at: now, info, ttl: CACHE_MS };
  return info;
}
var UPGRADE_TIMEOUT_MS = 18e4;
var upgradeState = { active: false, stage: "idle", percent: 0 };
function setUpgradeProgress(patch) {
  upgradeState = { ...upgradeState, ...patch };
}
function getUpgradeState() {
  return { ...upgradeState };
}
function startUpgrade() {
  if (upgradeState.active || autoUpdating) {
    return { ok: false, started: false, error: "busy" };
  }
  setUpgradeProgress({ active: true, stage: "checking", percent: 0 });
  void upgradePlugin();
  return { ok: true, started: true };
}
async function upgradePlugin(target, gitRef = "") {
  const pkg = "@sunjuntao/dsh-prompt-library";
  let version = target;
  let ref = gitRef;
  if (!version) {
    try {
      const info = await checkUpdate(true);
      if (info.hasUpdate && /^\d+\.\d+\.\d+/.test(info.latest)) {
        version = info.latest;
        ref = info.gitTag || "";
      }
    } catch {
    }
  }
  const vlog = buildVersionLogCopy(await readGlobalLocale());
  const customCmd = process.env.DSH_PLUGIN_UPGRADE_CMD;
  if (customCmd) {
    return new Promise((resolve) => {
      logVersion(vlog.upgradeStart(version || pkg, customCmd));
      const child = spawn(customCmd, { shell: true, windowsHide: true });
      const parts = [];
      let completed = false;
      let timer;
      const finish = (ok, out) => {
        if (completed) return;
        completed = true;
        if (timer) clearTimeout(timer);
        if (ok) {
          cache = null;
          logVersion(vlog.upgradeOk);
          setUpgradeProgress({ active: false, stage: "done", percent: 100 });
        } else {
          logVersion(vlog.upgradeFail(out || "unknown error"));
          setUpgradeProgress({ active: false, stage: "failed", detail: out });
        }
        resolve({ ok, output: out });
      };
      let outLen = 0;
      const onData = (buf) => {
        const text = buf.toString("utf8");
        parts.push(text);
        outLen += text.length;
        setUpgradeProgress({
          stage: "installing",
          percent: Math.min(90, 5 + Math.floor(Math.min(80, outLen / 256)))
        });
      };
      child.stdout?.on("data", onData);
      child.stderr?.on("data", onData);
      child.on("error", (err) => finish(false, err instanceof Error ? err.message : String(err)));
      timer = setTimeout(() => {
        finish(false, "timeout");
        child.kill();
      }, UPGRADE_TIMEOUT_MS);
      child.on("close", (code) => {
        const output = parts.join("").trim().slice(0, 1e3);
        finish(code === 0, output);
      });
    });
  }
  if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
    setUpgradeProgress({ active: false, stage: "failed", detail: "no valid target version" });
    return { ok: false, output: "no valid target version" };
  }
  const tag = ref || `v${version}`;
  const repoUrl = `https://github.com/${GITHUB_REPO}.git`;
  logVersion(vlog.upgradeStart(version, `git clone ${repoUrl} #${tag} \u2192 ${LIBRARY_ROOT2}`));
  setUpgradeProgress({ active: true, stage: "downloading", percent: 5 });
  try {
    await installFromGit(repoUrl, tag, LIBRARY_ROOT2);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logVersion(vlog.upgradeFail(msg));
    setUpgradeProgress({ active: false, stage: "failed", detail: msg });
    return { ok: false, output: msg };
  }
  cache = null;
  setUpgradeProgress({ active: false, stage: "done", percent: 100 });
  logVersion(vlog.upgradeOk);
  return { ok: true, output: `\u5DF2\u5B89\u88C5 ${pkg}@${version} \u5230 ${LIBRARY_ROOT2}` };
}
var autoUpdating = false;
async function restartService() {
  const vlog = buildVersionLogCopy(await readGlobalLocale().catch(() => ""));
  try {
    const override = process.env.DSH_PLUGIN_RESTART_CMD;
    if (override) {
      spawn(override, { detached: true, stdio: "ignore", shell: true, windowsHide: true }).unref();
      logVersion(vlog.restartCmd("custom", override));
      return { ok: true };
    }
    if (process.platform === "win32") {
      const vbs = process.env.DSH_HARNESS_VBS || join6(dshHome(), "file", "dsh-console", "dsh-harness-start.vbs");
      const safeVbs = vbs.replace(/'/g, "''");
      const ps = [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-WindowStyle",
        "Hidden",
        "-Command",
        `Start-Sleep -Seconds 1; Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*--profile web*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep -Seconds 1; if (Test-Path '${safeVbs}') { wscript.exe '${safeVbs}' }`
      ];
      spawn("powershell.exe", ps, { detached: true, stdio: "ignore", windowsHide: true }).unref();
      logVersion(vlog.restartCmd("vbs", vbs));
      return { ok: true };
    }
    return {
      ok: false,
      error: "restart not supported on this platform; set DSH_PLUGIN_RESTART_CMD to customize"
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logVersion(vlog.restartErr(msg));
    return { ok: false, error: msg };
  }
}
async function autoUpdateDaily() {
  if (autoUpdating) return;
  autoUpdating = true;
  try {
    if (!await isAutoUpdateEnabled()) return;
    const vlog = buildVersionLogCopy(await readGlobalLocale());
    const info = await checkUpdate(true);
    if (!info.hasUpdate || !info.latest || !/^\d+\.\d+\.\d+/.test(info.latest)) {
      logVersion(vlog.silentSkip(info.latest));
      return;
    }
    logVersion(vlog.silentTo(info.latest));
    const res = await upgradePlugin(info.latest, info.gitTag);
    if (!res.ok) {
      cache = { at: Date.now(), info: { ...info, hasUpdate: false }, ttl: CACHE_MS / 2 };
      return;
    }
    await restartService();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logVersion(buildVersionLogCopy(await readGlobalLocale().catch(() => "")).silentErr(msg));
  } finally {
    autoUpdating = false;
  }
}

// src/host/activity.ts
import { EventEmitter } from "node:events";

// src/host/phrases.ts
var STYLE_KEYWORDS = {
  code: [
    "\u4EE3\u7801",
    "\u7F16\u7A0B",
    "\u5F00\u53D1",
    "bug",
    "\u62A5\u9519",
    "\u51FD\u6570",
    "\u63A5\u53E3",
    "\u6570\u636E\u5E93",
    "\u524D\u7AEF",
    "\u540E\u7AEF",
    "python",
    "javascript",
    "typescript",
    "java",
    "go ",
    "rust",
    "c++",
    "c#",
    "sql",
    "\u4EE3\u7801",
    "\u51FD\u6570",
    "\u53D8\u91CF",
    "\u7B97\u6CD5",
    "\u6570\u7EC4",
    "\u7F16\u8BD1",
    "\u90E8\u7F72",
    "github",
    "git ",
    "api"
  ],
  writing: [
    "\u5199\u4F5C",
    "\u6587\u6848",
    "\u6807\u9898",
    "\u6587\u7AE0",
    "\u6DA6\u8272",
    "\u6269\u5199",
    "\u6539\u5199",
    "\u603B\u7ED3",
    "\u6458\u8981",
    "\u90AE\u4EF6",
    "\u62A5\u544A",
    "\u5267\u672C",
    "\u5C0F\u8BF4",
    "\u6B4C\u8BCD",
    "\u7B80\u5386",
    "essay",
    "article",
    "draft",
    "rewrite"
  ],
  translate: [
    "\u7FFB\u8BD1",
    "\u8BD1\u6210",
    "\u7FFB\u8BD1\u6210",
    "\u4E2D\u8BD1",
    "\u82F1\u8BD1",
    "\u8BD1\u6587",
    "translate",
    "translation"
  ],
  qa: [
    "\u662F\u4EC0\u4E48",
    "\u4E3A\u4EC0\u4E48",
    "\u600E\u4E48",
    "\u5982\u4F55",
    "\u80FD\u5426",
    "\u533A\u522B",
    "\u89E3\u91CA",
    "\u539F\u7406",
    "\u542B\u4E49",
    "what is",
    "why",
    "how to",
    "explain",
    "difference"
  ]
};
function classifyTopic(text) {
  const low = text.toLowerCase();
  let best = "general";
  let bestHits = 0;
  for (const [style, kws] of Object.entries(STYLE_KEYWORDS)) {
    let hits = 0;
    for (const kw of kws) if (low.includes(kw)) hits += 1;
    if (hits > bestHits) {
      bestHits = hits;
      best = style;
    }
  }
  return best;
}
var PHASE_COPY_WHALE = {
  idle: {
    zh: ["\u5728\u8FD9\u91CC\u7B49\u4F60\u53D1\u4EE4", "\u6682\u505C\u5F85\u547D\uFF0C\u968F\u65F6\u51FA\u53D1", "\u7B49\u5F85\u4F60\u7684\u4E0B\u4E00\u6761\u6307\u4EE4", "\u6DF1\u547C\u5438\uFF0C\u51C6\u5907\u5C31\u7EEA"],
    en: [
      "Here waiting for your word",
      "On standby, ready to go",
      "Awaiting your next instruction",
      "Deep breath, all set to go"
    ]
  },
  waiting: {
    zh: [
      "\u7B49\u5F85\u6A21\u578B\u54CD\u5E94",
      "\u547C\u53EB\u5927\u8111\u4E2D\uFF0C\u8BF7\u7A0D\u7B49",
      "\u4FE1\u53F7\u53D1\u5C04\u4E2D\uFF0C\u7B49\u4E00\u4E2A\u56DE\u97F3",
      "\u7075\u611F\u6B63\u5728\u8DEF\u4E0A",
      "\u7AD6\u8D77\u8033\u6735\u7B49\u56DE\u590D",
      "\u5927\u8111\u6B63\u5728\u52A0\u8F7D",
      "\u5B83\u5728\u7EC4\u7EC7\u8BED\u8A00\uFF0C\u522B\u50AC",
      "\u7B49\u5B83\u70ED\u8EAB\u5B8C\u6BD5",
      "\u7B49\u5F85\u8FDE\u63A5\u4E2D",
      "\u5C4F\u4F4F\u547C\u5438\u7B49\u56DE\u590D"
    ],
    en: [
      "Waiting for the model to respond",
      "Calling the brain, one moment",
      "Sending signals, waiting for a reply",
      "Inspiration is on its way",
      "Ears up, waiting for an answer",
      "The brain is loading",
      "It's wording things, don't rush",
      "Waiting for it to warm up",
      "Still connecting",
      "Holding my breath for the reply"
    ]
  },
  thinking: {
    zh: [
      "\u6B63\u5728\u601D\u8003",
      "\u55EF\u2026\u2026\u8BA9\u6211\u60F3\u4E00\u60F3",
      "\u5206\u6790\u4E2D",
      "\u601D\u7EEA\u6B63\u5728\u68B3\u7406",
      "\u6B63\u5728\u6574\u7406\u601D\u8DEF",
      "\u7709\u5934\u4E00\u76B1\uFF0C\u8BA4\u771F\u5206\u6790",
      "\u8BA9\u601D\u8DEF\u6C89\u6DC0\u4E00\u4E0B",
      "\u6B63\u5728\u628A\u7EBF\u7D22\u634B\u4E00\u634B",
      "\u522B\u50AC\uFF0C\u5728\u60F3\u5462",
      "\u5927\u8111\u6B63\u5728\u8FD0\u8F6C",
      "\u8BA9\u6211\u597D\u597D\u60F3\u60F3\u8FD9\u4E2A\u95EE\u9898",
      "\u55EF\uFF0C\u6709\u70B9\u610F\u601D\u2026\u2026"
    ],
    en: [
      "Thinking\u2026",
      "Hmm\u2026 let me think",
      "Analysing",
      "Sorting through my thoughts",
      "Organizing my thoughts",
      "Thinking it over carefully",
      "Letting the idea settle",
      "Tying the clues together",
      "No rush, I'm thinking",
      "Working it out",
      "Let me think this through",
      "Hmm, that's interesting\u2026"
    ]
  },
  tool: {
    zh: [
      "\u6B63\u5728\u5904\u7406\u5DE5\u5177\u7ED3\u679C",
      "\u770B\u770B\u5E26\u56DE\u4EC0\u4E48\u7ED3\u679C",
      "\u6B63\u5728\u89E3\u6790\u5DE5\u5177\u8FD4\u56DE",
      "\u7ED3\u679C\u89E3\u8BFB\u4E2D",
      "\u6B63\u5728\u6838\u5BF9\u5DE5\u5177\u8F93\u51FA",
      "\u628A\u7EBF\u7D22\u62FC\u63A5\u8D77\u6765",
      "\u7ED3\u679C\u5230\u624B\uFF0C\u7EE7\u7EED\u524D\u8FDB"
    ],
    en: [
      "Processing the tool result",
      "Let's see what it brought back",
      "Parsing the tool output",
      "Reading the findings",
      "Checking the tool output",
      "Piecing the clues together",
      "Result in hand, moving on"
    ]
  },
  review: {
    zh: [
      "\u6B63\u5728\u6574\u7406\u56DE\u590D",
      "\u628A\u60F3\u6CD5\u5199\u4E0B\u6765",
      "\u7EC4\u7EC7\u8BED\u8A00\u4E2D",
      "\u5B57\u659F\u53E5\u914C\u4E2D",
      "\u6B63\u5728\u751F\u6210\u56DE\u590D",
      "\u628A\u7B54\u6848\u6574\u7406\u6210\u6587",
      "\u9063\u8BCD\u9020\u53E5\u6253\u78E8\u4E2D",
      "\u628A\u6700\u597D\u7684\u8868\u8FBE\u6311\u51FA\u6765"
    ],
    en: [
      "Composing my reply",
      "Putting thoughts to words",
      "Organizing my response",
      "Choosing each word carefully",
      "Drafting the reply",
      "Framing the answer",
      "Polishing the wording",
      "Picking the best way to say it"
    ]
  },
  done: {
    zh: [
      "\u5DF2\u5B8C\u6210",
      "\u641E\u5B9A\uFF0C\u6536\u5DE5",
      "\u4EFB\u52A1\u8FBE\u6210",
      "\u8FD9\u4E00\u8F6E\u5706\u6EE1\u5B8C\u6210",
      "\u987A\u5229\u62B5\u8FBE\u7EC8\u70B9",
      "\u62FF\u4E0B\uFF0C\u6536\u5DE5",
      "\u7A33\u4E86\uFF0C\u5706\u6EE1\u6536\u5B98"
    ],
    en: [
      "Done",
      "All set",
      "Task complete",
      "This one wrapped up well",
      "Made it to the finish",
      "Got it, wrapping up",
      "Solid, clean finish"
    ]
  },
  failed: {
    zh: [
      "\u6267\u884C\u5931\u8D25",
      "\u54CE\u5440\uFF0C\u4E2D\u9014\u5361\u4F4F\u4E86",
      "\u8FD9\u4E00\u6B65\u6CA1\u80FD\u8D70\u5B8C",
      "\u51FA\u4E86\u70B9\u5C94\u5B50\uFF0C\u7F13\u4E00\u4E0B\u518D\u6765",
      "\u5DE5\u5177\u6267\u884C\u5931\u8D25",
      "\u6CA1\u8DD1\u901A\uFF0C\u518D\u8BD5\u4E00\u6B21"
    ],
    en: [
      "Failed",
      "Hmm, got stuck mid-way",
      "Couldn't finish this step",
      "Hit a snag, let's retry",
      "Tool execution failed",
      "Didn't get through, try again"
    ]
  }
};
function pickPhaseCopy(lang, phase, counter) {
  return PHASE_COPY_WHALE[phase][lang][counter % PHASE_COPY_WHALE[phase][lang].length];
}

// src/host/activity.ts
var defaultConfig = { celebrateMs: 2400, failureMs: 2400 };
var ActivityMachine = class {
  constructor(config = defaultConfig, now = Date.now) {
    this.config = config;
    this.now = now;
  }
  phase = "idle";
  sessionActive = false;
  doneAt;
  failedAt;
  topic = "general";
  /** 每个阶段被命中的累计次数（阶段变化时递增），用于文案组内轮换。 */
  counters = {};
  /** 终点计时的定时器句柄（done/failed 窗口过期回落 idle）。 */
  settleTimer;
  /** 消费一次投影出的阶段更新。 */
  onInput(input) {
    if (input.phase !== this.phase) {
      this.counters[input.phase] = (this.counters[input.phase] ?? 0) + 1;
    }
    this.phase = input.phase;
    this.doneAt = input.phase === "done" ? this.now() : void 0;
    this.failedAt = input.phase === "failed" ? this.now() : void 0;
  }
  /** 更新当前聊天主题风格（依据最近聊天文本分类）。 */
  onTopic(style) {
    this.topic = style;
  }
  /** 会话变得活跃（或新建会话）。 */
  onSessionActive() {
    this.sessionActive = true;
  }
  /** 活跃会话被销毁（或无会话）。 */
  onSessionDisposed() {
    this.sessionActive = false;
    this.phase = "idle";
    this.doneAt = void 0;
    this.failedAt = void 0;
  }
  /** 渲染当前决策：done/failed 的展示窗口到期后回落 idle，并附上匹配主题+阶段的文案。 */
  render(lang) {
    const nowMs = this.now();
    if (this.phase === "done" && this.doneAt !== void 0 && nowMs - this.doneAt >= this.config.celebrateMs) {
      this.phase = "idle";
      this.doneAt = void 0;
      if (this.settleTimer !== void 0) {
        clearTimeout(this.settleTimer);
        this.settleTimer = void 0;
      }
    }
    if (this.phase === "failed" && this.failedAt !== void 0 && nowMs - this.failedAt >= this.config.failureMs) {
      this.phase = "idle";
      this.failedAt = void 0;
      if (this.settleTimer !== void 0) {
        clearTimeout(this.settleTimer);
        this.settleTimer = void 0;
      }
    }
    return {
      phase: this.phase,
      sessionActive: this.sessionActive,
      topic: this.topic,
      text: pickPhaseCopy(lang, this.phase, this.counters[this.phase] ?? 0)
    };
  }
};
function freshContext() {
  return { activeTools: /* @__PURE__ */ new Set(), stepHadFailure: false };
}
function projectEvent(event, ctx) {
  switch (event.type) {
    case "turn/start":
    case "step/start":
      ctx.activeTools.clear();
      ctx.stepHadFailure = false;
      return { phase: "waiting" };
    case "assistant/chunk": {
      const chunk = event.data?.chunk;
      const text = typeof chunk?.text === "string" ? chunk.text : "";
      if (chunk?.type === "reasoning-delta" && text.length > 0) {
        return { phase: "thinking" };
      }
      if (chunk?.type === "text-delta" && text.length > 0) {
        return { phase: "review" };
      }
      return void 0;
    }
    case "assistant/message":
      return { phase: "review" };
    case "tool/call":
      ctx.activeTools.add(String(event.data?.callId));
      return { phase: "tool" };
    case "tool/result": {
      const msg = event.data?.message;
      ctx.activeTools.delete(String(msg?.source?.callId));
      const content = msg?.content;
      ctx.stepHadFailure ||= event.data?.error !== void 0 || content?.[0]?.isError === true;
      if (ctx.activeTools.size > 0) return { phase: "tool" };
      return ctx.stepHadFailure ? { phase: "failed" } : { phase: "thinking" };
    }
    case "turn/end": {
      ctx.activeTools.clear();
      const reason = event.data?.reason?.kind;
      switch (reason) {
        case "completed":
          return { phase: "done" };
        case "error":
        case "max-tokens":
        case "interrupted":
          return { phase: "failed" };
        case "blocked":
          return { phase: "waiting" };
        default:
          return { phase: "idle" };
      }
    }
    default:
      return void 0;
  }
}
function extractTopicText(event) {
  const d = event.data;
  if (!d) return "";
  for (const key of ["input", "query", "prompt", "content", "text", "message"]) {
    const v = d[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const chunk = d.chunk;
  if (chunk && typeof chunk.text === "string" && chunk.text.trim()) return chunk.text;
  return "";
}
var displayMachine;
var displayActive = false;
var sseEmitter = new EventEmitter();
sseEmitter.setMaxListeners(100);
function getActivity(lang = "zh") {
  if (displayMachine === void 0) {
    return {
      phase: "idle",
      sessionActive: displayActive,
      topic: "general",
      text: pickPhaseCopy(lang, "idle", 0)
    };
  }
  return displayActive ? displayMachine.render(lang) : { phase: "idle", sessionActive: false, topic: "general", text: pickPhaseCopy(lang, "idle", 0) };
}
function onActivityChange(callback) {
  const handler = () => {
    callback(getActivity("zh"));
  };
  sseEmitter.on("change", handler);
  callback(getActivity("zh"));
  return () => {
    sseEmitter.off("change", handler);
  };
}
function emitActivityChange() {
  sseEmitter.emit("change");
}
function registerActivity(ctx) {
  displayMachine = displayMachine ?? new ActivityMachine();
  const perSession = /* @__PURE__ */ new Map();
  const bus = ctx;
  const onEvent = (session, event) => {
    const key = String(session.id);
    let proj = perSession.get(key);
    if (proj === void 0) {
      proj = freshContext();
      perSession.set(key, proj);
    }
    const topicText = extractTopicText(event);
    if (topicText) {
      displayMachine?.onTopic(classifyTopic(topicText));
    }
    const next = projectEvent(event, proj);
    if (next === void 0) return;
    displayActive = true;
    displayMachine?.onInput(next);
    displayMachine?.onSessionActive();
    emitActivityChange();
  };
  const onDisposed = (session) => {
    perSession.delete(String(session.id));
    if (perSession.size === 0) {
      displayActive = false;
      displayMachine?.onSessionDisposed();
      emitActivityChange();
    }
  };
  bus.on("session/event", onEvent);
  bus.on("session/disposed", onDisposed);
  return () => {
    bus.off("session/event", onEvent);
    bus.off("session/disposed", onDisposed);
    perSession.clear();
    displayActive = false;
    displayMachine = void 0;
  };
}

// src/host/gamification.ts
import { EventEmitter as EventEmitter2 } from "node:events";
var RARITY_POINTS = {
  common: 1,
  rare: 3,
  epic: 5,
  legendary: 10,
  myth: 20
};
var LEVEL_RULES = [
  { level: 1, threshold: 0, zh: "\u8BCD\u5E93\u840C\u65B0", en: "Library Rookie" },
  { level: 2, threshold: 30, zh: "\u8BCD\u5E93\u5B66\u5F92", en: "Library Apprentice" },
  { level: 3, threshold: 90, zh: "\u8BCD\u5E93\u719F\u624B", en: "Library Regular" },
  { level: 4, threshold: 240, zh: "\u8BCD\u5E93\u4E13\u5BB6", en: "Library Expert" },
  { level: 5, threshold: 600, zh: "\u8BCD\u5E93\u5927\u5E08", en: "Library Master" },
  { level: 6, threshold: 1500, zh: "\u8BCD\u5E93\u5B97\u5E08", en: "Library Grandmaster" }
];
var POINT_SOURCE_META = [
  { kind: "use", zh: "\u4F7F\u7528\u4E00\u6761\u63D0\u793A\u8BCD", en: "Use a prompt" },
  { kind: "collect", zh: "\u65B0\u589E\u6536\u85CF\u4E00\u6761\u63D0\u793A\u8BCD", en: "Collect a new prompt" },
  { kind: "ai", zh: "\u7528 AI \u5B8C\u5584\u4E00\u6761\u63D0\u793A\u8BCD\uFF08\u91CD\u590D\u4EC5\u8BB0\u4E00\u6B21\uFF09", en: "AI-polish a prompt (once each)" },
  { kind: "active", zh: "\u5F53\u5929\u9996\u6B21\u4EFB\u610F\u64CD\u4F5C\uFF08\u6BCF\u65E5\u9650\u4E00\u6B21\uFF09", en: "First action of the day (once daily)" }
];
function computeLevel(points, lang) {
  const net = points.net;
  let base = LEVEL_RULES[0];
  for (const r of LEVEL_RULES) {
    if (net >= r.threshold) base = r;
  }
  const cur = base;
  const next = LEVEL_RULES.find((r) => r.level === cur.level + 1);
  const prev = LEVEL_RULES.find((r) => r.level === cur.level - 1);
  const pct = next ? Math.min(100, Math.round((net - cur.threshold) / (next.threshold - cur.threshold) * 100)) : 100;
  return {
    level: cur.level,
    title: lang === "en" ? cur.en : cur.zh,
    current: net,
    next: next ? next.threshold : 0,
    gross: points.gross,
    decayedPoints: points.decay,
    pct,
    decayed: points.decay > 0,
    inactiveDays: points.inactiveDays,
    dropGap: prev ? net - prev.threshold : 0,
    prevTitle: prev ? lang === "en" ? prev.en : prev.zh : ""
  };
}
var cap = (v, target) => Math.min(v, target);
var ACHIEVEMENT_RULES = [
  // ── 普通档（18）难度逐级上升 ──
  {
    id: "first_use",
    rarity: "common",
    target: 1,
    zhTitle: "\u521D\u51FA\u8305\u5E90",
    enTitle: "First Steps",
    zhDesc: "\u7D2F\u8BA1\u4F7F\u7528 1 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use a prompt for the first time",
    progress: (s) => cap(s.totalUsage, 1)
  },
  {
    id: "use_10",
    rarity: "common",
    target: 5,
    zhTitle: "\u6E10\u5165\u4F73\u5883",
    enTitle: "Getting the Hang",
    zhDesc: "\u7D2F\u8BA1\u4F7F\u7528 5 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use prompts 5 times in total",
    progress: (s) => cap(s.totalUsage, 5)
  },
  {
    id: "use_25",
    rarity: "common",
    target: 10,
    zhTitle: "\u5C0F\u8BD5\u950B\u8292",
    enTitle: "Testing Waters",
    zhDesc: "\u7D2F\u8BA1\u4F7F\u7528 10 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use prompts 10 times in total",
    progress: (s) => cap(s.totalUsage, 10)
  },
  {
    id: "collector_5",
    rarity: "common",
    target: 3,
    zhTitle: "\u8BCD\u5E93\u53D1\u82BD",
    enTitle: "Seedling",
    zhDesc: "\u8BCD\u5E93\u6536\u85CF\u6EE1 3 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Collect 3 prompts in the library",
    progress: (s) => cap(s.total, 3)
  },
  {
    id: "streak_3",
    rarity: "common",
    target: 2,
    zhTitle: "\u4E09\u65E5\u4E4B\u7EA6",
    enTitle: "Three Days In",
    zhDesc: "\u8FDE\u7EED 2 \u5929\u4F7F\u7528\u8BCD\u5E93",
    enDesc: "Use the library 2 days in a row",
    progress: (_s, streak) => cap(streak, 2)
  },
  {
    id: "tags_3",
    rarity: "common",
    target: 2,
    zhTitle: "\u6807\u7B7E\u521D\u8BC6",
    enTitle: "Tag Intro",
    zhDesc: "\u62E5\u6709 2 \u4E2A\u4E0D\u540C\u6807\u7B7E",
    enDesc: "Keep 2 distinct tags",
    progress: (s) => cap(s.tagStats.length, 2)
  },
  {
    id: "avg_len_150",
    rarity: "common",
    target: 80,
    zhTitle: "\u5B57\u659F\u53E5\u914C",
    enTitle: "Word Weighing",
    zhDesc: "\u5E73\u5747\u6BCF\u6761\u63D0\u793A\u8BCD\u6B63\u6587\u8FBE 80 \u5B57",
    enDesc: "Average prompt body reaches 80 characters",
    progress: (s) => cap(s.avgBodyLength, 80)
  },
  {
    id: "used_10",
    rarity: "common",
    target: 5,
    zhTitle: "\u5C0F\u6709\u6D89\u730E",
    enTitle: "Dabbler",
    zhDesc: "\u7D2F\u8BA1\u7528\u8FC7 5 \u6761\u4E0D\u540C\u7684\u63D0\u793A\u8BCD",
    enDesc: "Use 5 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 5)
  },
  {
    id: "used_20",
    rarity: "common",
    target: 10,
    zhTitle: "\u6D89\u730E\u6E10\u5E7F",
    enTitle: "Widening Nets",
    zhDesc: "\u7D2F\u8BA1\u7528\u8FC7 10 \u6761\u4E0D\u540C\u7684\u63D0\u793A\u8BCD",
    enDesc: "Use 10 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 10)
  },
  {
    id: "ai_first",
    rarity: "common",
    target: 1,
    zhTitle: "AI \u4FE1\u5F92",
    enTitle: "AI Believer",
    zhDesc: "\u9996\u6B21\u7528 AI \u5B8C\u5584\u63D0\u793A\u8BCD",
    enDesc: "Polish a prompt with AI for the first time",
    progress: (s) => cap(s.aiRefinedCount, 1)
  },
  {
    id: "collector_15",
    rarity: "common",
    target: 8,
    zhTitle: "\u4E66\u67B6\u4E0A\u65B0",
    enTitle: "New Shelves",
    zhDesc: "\u8BCD\u5E93\u6536\u85CF\u6EE1 8 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Collect 8 prompts in the library",
    progress: (s) => cap(s.total, 8)
  },
  {
    id: "tag_focus_3",
    rarity: "common",
    target: 2,
    zhTitle: "\u5C0F\u6807\u7B7E\u5BB6",
    enTitle: "Mini Tagger",
    zhDesc: "\u5355\u4E00\u6807\u7B7E\u4E0B\u6536\u5F55 2 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Keep 2 prompts under one tag",
    progress: (s) => cap(s.tagStats.reduce((m, t) => Math.max(m, t.count), 0), 2)
  },
  {
    id: "active_7",
    rarity: "common",
    target: 3,
    zhTitle: "\u6D3B\u529B\u56DB\u5C04",
    enTitle: "Full of Energy",
    zhDesc: "\u8FD1 7 \u5929\u6709 3 \u6761\u63D0\u793A\u8BCD\u88AB\u4F7F\u7528",
    enDesc: "Use 3 different prompts within 7 days",
    progress: (s) => cap(s.usedIn7Days, 3)
  },
  {
    id: "author_10",
    rarity: "common",
    target: 5,
    zhTitle: "\u6301\u7EED\u521B\u4F5C",
    enTitle: "Steady Writer",
    zhDesc: "\u8FD1 30 \u5929\u65B0\u589E 5 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Add 5 prompts within 30 days",
    progress: (s) => cap(s.addedIn30Days, 5)
  },
  {
    id: "trash_start",
    rarity: "common",
    target: 1,
    zhTitle: "\u65AD\u820D\u79BB\u521D\u9636",
    enTitle: "Tidy Start",
    zhDesc: "\u56DE\u6536\u7AD9\u4E2D\u6709 1 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Keep 1 prompt in the recycle bin",
    progress: (s) => cap(s.trashCount, 1)
  },
  {
    id: "hot_15",
    rarity: "common",
    target: 8,
    zhTitle: "\u70ED\u529B\u5F00\u573A",
    enTitle: "Warm Start",
    zhDesc: "\u8FD1 7 \u5929\u7D2F\u8BA1\u4F7F\u7528 8 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use prompts 8 times within 7 days",
    progress: (s) => cap(s.usedIn7Days > 0 ? s.topUsed7.reduce((a, b) => a + b.count, 0) : 0, 8)
  },
  {
    id: "ai_3",
    rarity: "common",
    target: 2,
    zhTitle: "AI \u63A2\u8DEF",
    enTitle: "AI Pathfinder",
    zhDesc: "\u7D2F\u8BA1\u7528 AI \u5B8C\u5584 2 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Polish 2 prompts with AI in total",
    progress: (s) => cap(s.aiRefinedCount, 2)
  },
  {
    id: "author_3",
    rarity: "common",
    target: 2,
    zhTitle: "\u52E4\u5FEB\u5199\u624B",
    enTitle: "Diligent Scribe",
    zhDesc: "\u8FD1 7 \u5929\u65B0\u589E 2 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Add 2 prompts within 7 days",
    progress: (s) => cap(s.addedIn7Days, 2)
  },
  // ── 稀有档（12）──
  {
    id: "use_60",
    rarity: "rare",
    target: 25,
    zhTitle: "\u9A7E\u8F7B\u5C31\u719F",
    enTitle: "Skilled Hands",
    zhDesc: "\u7D2F\u8BA1\u4F7F\u7528 25 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use prompts 25 times in total",
    progress: (s) => cap(s.totalUsage, 25)
  },
  {
    id: "use_120",
    rarity: "rare",
    target: 50,
    zhTitle: "\u4ECE\u5BB9\u4E0D\u8FEB",
    enTitle: "Unflappable",
    zhDesc: "\u7D2F\u8BA1\u4F7F\u7528 50 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use prompts 50 times in total",
    progress: (s) => cap(s.totalUsage, 50)
  },
  {
    id: "collector_50",
    rarity: "rare",
    target: 20,
    zhTitle: "\u8BCD\u5E93\u8FDB\u9636",
    enTitle: "Library Step",
    zhDesc: "\u8BCD\u5E93\u6536\u85CF\u6EE1 20 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Collect 20 prompts in the library",
    progress: (s) => cap(s.total, 20)
  },
  {
    id: "collector_120",
    rarity: "rare",
    target: 50,
    zhTitle: "\u85CF\u4E66\u851A\u7136",
    enTitle: "Growing Shelves",
    zhDesc: "\u8BCD\u5E93\u6536\u85CF\u6EE1 50 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Collect 50 prompts in the library",
    progress: (s) => cap(s.total, 50)
  },
  {
    id: "streak_14",
    rarity: "rare",
    target: 6,
    zhTitle: "\u4E24\u5468\u4E4B\u7EA6",
    enTitle: "A Fortnight",
    zhDesc: "\u8FDE\u7EED 6 \u5929\u4F7F\u7528\u8BCD\u5E93",
    enDesc: "Use the library 6 days in a row",
    progress: (_s, streak) => cap(streak, 6)
  },
  {
    id: "tags_8",
    rarity: "rare",
    target: 4,
    zhTitle: "\u6807\u7B7E\u884C\u5BB6",
    enTitle: "Tag Expert",
    zhDesc: "\u62E5\u6709 4 \u4E2A\u4E0D\u540C\u6807\u7B7E",
    enDesc: "Keep 4 distinct tags",
    progress: (s) => cap(s.tagStats.length, 4)
  },
  {
    id: "active_15",
    rarity: "rare",
    target: 6,
    zhTitle: "\u56DB\u5904\u5F00\u82B1",
    enTitle: "Widespread",
    zhDesc: "\u8FD1 30 \u5929\u7528\u8FC7 6 \u6761\u4E0D\u540C\u7684\u63D0\u793A\u8BCD",
    enDesc: "Use 6 different prompts within 30 days",
    progress: (s) => cap(s.usedIn30Days, 6)
  },
  {
    id: "author_25",
    rarity: "rare",
    target: 10,
    zhTitle: "\u591A\u4EA7\u4F5C\u5BB6",
    enTitle: "Prolific Author",
    zhDesc: "\u8FD1 30 \u5929\u65B0\u589E 10 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Add 10 prompts within 30 days",
    progress: (s) => cap(s.addedIn30Days, 10)
  },
  {
    id: "active_40",
    rarity: "rare",
    target: 16,
    zhTitle: "\u6D3B\u8DC3\u5E38\u5BA2",
    enTitle: "Regular Vibe",
    zhDesc: "\u8FD1 30 \u5929\u7528\u8FC7 16 \u6761\u4E0D\u540C\u7684\u63D0\u793A\u8BCD",
    enDesc: "Use 16 different prompts within 30 days",
    progress: (s) => cap(s.usedIn30Days, 16)
  },
  {
    id: "used_80",
    rarity: "rare",
    target: 32,
    zhTitle: "\u8BCD\u5E93\u8FBE\u4EBA",
    enTitle: "Library Savvy",
    zhDesc: "\u7D2F\u8BA1\u7528\u8FC7 32 \u6761\u4E0D\u540C\u7684\u63D0\u793A\u8BCD",
    enDesc: "Use 32 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 32)
  },
  {
    id: "used_150",
    rarity: "rare",
    target: 60,
    zhTitle: "\u89C1\u591A\u8BC6\u5E7F",
    enTitle: "Well-Traveled",
    zhDesc: "\u7D2F\u8BA1\u7528\u8FC7 60 \u6761\u4E0D\u540C\u7684\u63D0\u793A\u8BCD",
    enDesc: "Use 60 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 60)
  },
  {
    id: "ai_50",
    rarity: "rare",
    target: 20,
    zhTitle: "AI \u70BC\u91D1\u672F\u5E08",
    enTitle: "AI Alchemist",
    zhDesc: "\u7D2F\u8BA1\u7528 AI \u5B8C\u5584 20 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Polish 20 prompts with AI in total",
    progress: (s) => cap(s.aiRefinedCount, 20)
  },
  // ── 史诗档（24）──
  {
    id: "use_300",
    rarity: "epic",
    target: 100,
    zhTitle: "\u7089\u706B\u7EAF\u9752",
    enTitle: "Masterful",
    zhDesc: "\u7D2F\u8BA1\u4F7F\u7528 100 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use prompts 100 times in total",
    progress: (s) => cap(s.totalUsage, 100)
  },
  {
    id: "use_600",
    rarity: "epic",
    target: 200,
    zhTitle: "\u72EC\u5F53\u4E00\u9762",
    enTitle: "Standalone",
    zhDesc: "\u7D2F\u8BA1\u4F7F\u7528 200 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use prompts 200 times in total",
    progress: (s) => cap(s.totalUsage, 200)
  },
  {
    id: "collector_200",
    rarity: "epic",
    target: 70,
    zhTitle: "\u85CF\u4E66\u4E07\u5377",
    enTitle: "A Library's Shores",
    zhDesc: "\u8BCD\u5E93\u6536\u85CF\u6EE1 70 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Collect 70 prompts in the library",
    progress: (s) => cap(s.total, 70)
  },
  {
    id: "collector_300",
    rarity: "epic",
    target: 100,
    zhTitle: "\u6EE1\u5C4B\u4E66\u9999",
    enTitle: "Books Everywhere",
    zhDesc: "\u8BCD\u5E93\u6536\u85CF\u6EE1 100 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Collect 100 prompts in the library",
    progress: (s) => cap(s.total, 100)
  },
  {
    id: "streak_60",
    rarity: "epic",
    target: 20,
    zhTitle: "\u5E38\u9A7B\u5609\u5BBE",
    enTitle: "Regular Guest",
    zhDesc: "\u8FDE\u7EED 20 \u5929\u4F7F\u7528\u8BCD\u5E93",
    enDesc: "Use the library 20 days in a row",
    progress: (_s, streak) => cap(streak, 20)
  },
  {
    id: "tags_15",
    rarity: "epic",
    target: 6,
    zhTitle: "\u6807\u7B7E\u5168\u624D",
    enTitle: "Tag All-Rounder",
    zhDesc: "\u62E5\u6709 6 \u4E2A\u4E0D\u540C\u6807\u7B7E",
    enDesc: "Keep 6 distinct tags",
    progress: (s) => cap(s.tagStats.length, 6)
  },
  {
    id: "author_50",
    rarity: "epic",
    target: 18,
    zhTitle: "\u9AD8\u4EA7\u8FBE\u4EBA",
    enTitle: "Prod Heavy",
    zhDesc: "\u8FD1 30 \u5929\u65B0\u589E 18 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Add 18 prompts within 30 days",
    progress: (s) => cap(s.addedIn30Days, 18)
  },
  {
    id: "util_50",
    rarity: "epic",
    target: 18,
    zhTitle: "\u7269\u5C3D\u5176\u7528",
    enTitle: "Put to Use",
    zhDesc: "\u8BCD\u5E93\u4E2D 18% \u7684\u63D0\u793A\u8BCD\u90FD\u88AB\u7528\u8FC7",
    enDesc: "18% of your prompts have been used",
    progress: (s) => cap(s.total > 0 ? Math.round(s.usedCount / s.total * 100) : 0, 18)
  },
  {
    id: "used_300",
    rarity: "epic",
    target: 100,
    zhTitle: "\u5E7F\u5F00\u8A00\u8DEF",
    enTitle: "Broad Reach",
    zhDesc: "\u7D2F\u8BA1\u7528\u8FC7 100 \u6761\u4E0D\u540C\u7684\u63D0\u793A\u8BCD",
    enDesc: "Use 100 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 100)
  },
  {
    id: "used_450",
    rarity: "epic",
    target: 150,
    zhTitle: "\u5386\u4E45\u5F25\u65B0",
    enTitle: "Time-Tested",
    zhDesc: "\u7D2F\u8BA1\u7528\u8FC7 150 \u6761\u4E0D\u540C\u7684\u63D0\u793A\u8BCD",
    enDesc: "Use 150 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 150)
  },
  {
    id: "ai_120",
    rarity: "epic",
    target: 40,
    zhTitle: "AI \u70B9\u77F3\u6210\u91D1",
    enTitle: "AI Grandmaster",
    zhDesc: "\u7D2F\u8BA1\u7528 AI \u5B8C\u5584 40 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Polish 40 prompts with AI in total",
    progress: (s) => cap(s.aiRefinedCount, 40)
  },
  {
    id: "ai_cover_60",
    rarity: "epic",
    target: 20,
    zhTitle: "AI \u534A\u58C1\u6C5F\u5C71",
    enTitle: "AI's Midland",
    zhDesc: "AI \u5B8C\u5584\u7684\u6280\u80FD\u5360\u6BD4\u8FBE 20%",
    enDesc: "20% of your prompts polished by AI",
    progress: (s) => cap(s.aiRefinedPct, 20)
  },
  {
    id: "hot_60",
    rarity: "epic",
    target: 20,
    zhTitle: "\u6D41\u91CF\u62C5\u5F53",
    enTitle: "Traffic Lead",
    zhDesc: "\u8FD1 7 \u5929\u7D2F\u8BA1\u4F7F\u7528 20 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use prompts 20 times within 7 days",
    progress: (s) => cap(s.usedIn7Days > 0 ? s.topUsed7.reduce((a, b) => a + b.count, 0) : 0, 20)
  },
  {
    id: "word_12000",
    rarity: "epic",
    target: 4e3,
    zhTitle: "\u85CF\u7ECF\u9601",
    enTitle: "Vault of Words",
    zhDesc: "\u6536\u85CF\u6280\u80FD\u7D2F\u8BA1 4 \u5343\u5B57",
    enDesc: "Stockpile 4,000 characters of prompts",
    progress: (s) => cap(s.totalBodyLength, 4e3)
  },
  {
    id: "trash_25",
    rarity: "epic",
    target: 10,
    zhTitle: "\u65AD\u820D\u79BB\u52CB\u7AE0",
    enTitle: "Declutter Medal",
    zhDesc: "\u56DE\u6536\u7AD9\u7D2F\u8BA1\u6709 10 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Keep 10 prompts in the recycle bin",
    progress: (s) => cap(s.trashCount, 10)
  },
  {
    id: "tag_focus_20",
    rarity: "epic",
    target: 8,
    zhTitle: "\u4E13\u4E1A\u6DF1\u8015",
    enTitle: "Deep Focus",
    zhDesc: "\u5355\u4E00\u6807\u7B7E\u4E0B\u6536\u5F55 8 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Keep 8 prompts under one tag",
    progress: (s) => cap(s.tagStats.reduce((m, t) => Math.max(m, t.count), 0), 8)
  },
  {
    id: "ai_week_30",
    rarity: "epic",
    target: 10,
    zhTitle: "\u5468\u5468\u70BC\u91D1",
    enTitle: "Weekly Alchemist",
    zhDesc: "\u8FD1 7 \u5929\u7528 AI \u5B8C\u5584 10 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Polish 10 prompts with AI within 7 days",
    progress: (s) => cap(s.aiRefinedIn7, 10)
  },
  {
    id: "hot_od",
    rarity: "epic",
    target: 12,
    zhTitle: "\u5F53\u65E5\u4E4B\u661F",
    enTitle: "Star of the Day",
    zhDesc: "\u8FD1 7 \u5929\u6700\u5E38\u7528\u6280\u80FD\u5355\u65E5\u4F7F\u7528\u8D85 12 \u6B21",
    enDesc: "A top prompt is used 12+ times in 7 days",
    progress: (s) => cap(s.topUsed7[0]?.count ?? 0, 12)
  },
  {
    id: "use_900",
    rarity: "epic",
    target: 300,
    zhTitle: "\u6325\u6D12\u81EA\u5982",
    enTitle: "Effortless",
    zhDesc: "\u7D2F\u8BA1\u4F7F\u7528 300 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use prompts 300 times in total",
    progress: (s) => cap(s.totalUsage, 300)
  },
  {
    id: "collector_400",
    rarity: "epic",
    target: 130,
    zhTitle: "\u8BCD\u5E93\u62E5\u8DB8",
    enTitle: "Devoted Collector",
    zhDesc: "\u8BCD\u5E93\u6536\u85CF\u6EE1 130 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Collect 130 prompts in the library",
    progress: (s) => cap(s.total, 130)
  },
  {
    id: "used_200",
    rarity: "epic",
    target: 70,
    zhTitle: "\u773C\u754C\u5F00\u9614",
    enTitle: "Open Horizons",
    zhDesc: "\u7D2F\u8BA1\u7528\u8FC7 70 \u6761\u4E0D\u540C\u7684\u63D0\u793A\u8BCD",
    enDesc: "Use 70 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 70)
  },
  {
    id: "streak_30",
    rarity: "epic",
    target: 10,
    zhTitle: "\u4E00\u6708\u540C\u884C",
    enTitle: "A Month Along",
    zhDesc: "\u8FDE\u7EED 10 \u5929\u4F7F\u7528\u8BCD\u5E93",
    enDesc: "Use the library 10 days in a row",
    progress: (_s, streak) => cap(streak, 10)
  },
  {
    id: "author_30_7",
    rarity: "epic",
    target: 10,
    zhTitle: "\u6587\u601D\u5982\u6F6E",
    enTitle: "Creative Flood",
    zhDesc: "\u8FD1 7 \u5929\u65B0\u589E 10 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Add 10 prompts within 7 days",
    progress: (s) => cap(s.addedIn7Days, 10)
  },
  {
    id: "word_25000",
    rarity: "epic",
    target: 8e3,
    zhTitle: "\u5377\u5E19\u6D69\u7E41",
    enTitle: "Towering Volumes",
    zhDesc: "\u6536\u85CF\u6280\u80FD\u7D2F\u8BA1 8 \u5343\u5B57",
    enDesc: "Stockpile 8,000 characters of prompts",
    progress: (s) => cap(s.totalBodyLength, 8e3)
  },
  // ── 传说档（16）──
  {
    id: "use_1000",
    rarity: "legendary",
    target: 250,
    zhTitle: "\u767B\u5CF0\u9020\u6781",
    enTitle: "Peak Performance",
    zhDesc: "\u7D2F\u8BA1\u4F7F\u7528 250 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use prompts 250 times in total",
    progress: (s) => cap(s.totalUsage, 250)
  },
  {
    id: "use_2000",
    rarity: "legendary",
    target: 500,
    zhTitle: "\u4E07\u6CD5\u5F52\u4E00",
    enTitle: "Prompts Beyond Measure",
    zhDesc: "\u7D2F\u8BA1\u4F7F\u7528 500 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use prompts 500 times in total",
    progress: (s) => cap(s.totalUsage, 500)
  },
  {
    id: "collector_600",
    rarity: "legendary",
    target: 150,
    zhTitle: "\u8BCD\u6D77\u85CF\u73CD",
    enTitle: "Treasure Trove",
    zhDesc: "\u8BCD\u5E93\u6536\u85CF\u6EE1 150 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Collect 150 prompts in the library",
    progress: (s) => cap(s.total, 150)
  },
  {
    id: "collector_900",
    rarity: "legendary",
    target: 220,
    zhTitle: "\u8BCD\u4E2D\u6CF0\u6597",
    enTitle: "Library Titan",
    zhDesc: "\u8BCD\u5E93\u6536\u85CF\u6EE1 220 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Collect 220 prompts in the library",
    progress: (s) => cap(s.total, 220)
  },
  {
    id: "streak_150",
    rarity: "legendary",
    target: 40,
    zhTitle: "\u5C81\u6708\u540C\u884C",
    enTitle: "Seasons Together",
    zhDesc: "\u8FDE\u7EED 40 \u5929\u4F7F\u7528\u8BCD\u5E93",
    enDesc: "Use the library 40 days in a row",
    progress: (_s, streak) => cap(streak, 40)
  },
  {
    id: "tags_25",
    rarity: "legendary",
    target: 8,
    zhTitle: "\u6807\u7B7E\u5927\u5BB6",
    enTitle: "Tag Mastermind",
    zhDesc: "\u62E5\u6709 8 \u4E2A\u4E0D\u540C\u6807\u7B7E",
    enDesc: "Keep 8 distinct tags",
    progress: (s) => cap(s.tagStats.length, 8)
  },
  {
    id: "used_500",
    rarity: "legendary",
    target: 120,
    zhTitle: "\u8BCD\u6D77\u6446\u6E21\u4EBA",
    enTitle: "Library Ferryman",
    zhDesc: "\u7D2F\u8BA1\u7528\u8FC7 120 \u6761\u4E0D\u540C\u7684\u63D0\u793A\u8BCD",
    enDesc: "Use 120 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 120)
  },
  {
    id: "used_800",
    rarity: "legendary",
    target: 200,
    zhTitle: "\u535A\u89C8\u7FA4\u4E66",
    enTitle: "Immense Reading",
    zhDesc: "\u7D2F\u8BA1\u7528\u8FC7 200 \u6761\u4E0D\u540C\u7684\u63D0\u793A\u8BCD",
    enDesc: "Use 200 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 200)
  },
  {
    id: "ai_250",
    rarity: "legendary",
    target: 60,
    zhTitle: "AI \u4F20\u4E16\u4E4B\u5E08",
    enTitle: "AI Legendary",
    zhDesc: "\u7D2F\u8BA1\u7528 AI \u5B8C\u5584 60 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Polish 60 prompts with AI in total",
    progress: (s) => cap(s.aiRefinedCount, 60)
  },
  {
    id: "util_90",
    rarity: "legendary",
    target: 25,
    zhTitle: "\u8BCD\u5C3D\u5176\u7528",
    enTitle: "Every Card Played",
    zhDesc: "\u8BCD\u5E93\u4E2D 25% \u7684\u63D0\u793A\u8BCD\u90FD\u88AB\u7528\u8FC7",
    enDesc: "25% of your prompts have been used",
    progress: (s) => cap(s.total > 0 ? Math.round(s.usedCount / s.total * 100) : 0, 25)
  },
  {
    id: "hot_200",
    rarity: "legendary",
    target: 50,
    zhTitle: "\u4E07\u4EBA\u7A7A\u5DF7",
    enTitle: "Stampede",
    zhDesc: "\u8FD1 7 \u5929\u7D2F\u8BA1\u4F7F\u7528 50 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use prompts 50 times within 7 days",
    progress: (s) => cap(s.usedIn7Days > 0 ? s.topUsed7.reduce((a, b) => a + b.count, 0) : 0, 50)
  },
  {
    id: "word_50000",
    rarity: "legendary",
    target: 12e3,
    zhTitle: "\u6C57\u725B\u5145\u680B",
    enTitle: "Rafters of Books",
    zhDesc: "\u6536\u85CF\u6280\u80FD\u7D2F\u8BA1 1.2 \u4E07\u5B57",
    enDesc: "Stockpile 12,000 characters of prompts",
    progress: (s) => cap(s.totalBodyLength, 12e3)
  },
  {
    id: "trash_50",
    rarity: "legendary",
    target: 15,
    zhTitle: "\u65AD\u820D\u79BB\u5927\u5E08",
    enTitle: "Declutter Guru",
    zhDesc: "\u56DE\u6536\u7AD9\u7D2F\u8BA1\u6709 15 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Keep 15 prompts in the recycle bin",
    progress: (s) => cap(s.trashCount, 15)
  },
  {
    id: "author_100",
    rarity: "legendary",
    target: 25,
    zhTitle: "\u6587\u601D\u6CC9\u6D8C",
    enTitle: "Fountain of Words",
    zhDesc: "\u8FD1 30 \u5929\u65B0\u589E 25 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Add 25 prompts within 30 days",
    progress: (s) => cap(s.addedIn30Days, 25)
  },
  {
    id: "streak_180",
    rarity: "legendary",
    target: 45,
    zhTitle: "\u534A\u8F7D\u540C\u884C",
    enTitle: "Half-Year Bond",
    zhDesc: "\u8FDE\u7EED 45 \u5929\u4F7F\u7528\u8BCD\u5E93",
    enDesc: "Use the library 45 days in a row",
    progress: (_s, streak) => cap(streak, 45)
  },
  {
    id: "ai_cover_80",
    rarity: "legendary",
    target: 20,
    zhTitle: "\u4EBA\u673A\u5408\u74A7",
    enTitle: "Human-Machine Union",
    zhDesc: "AI \u5B8C\u5584\u7684\u6280\u80FD\u5360\u6BD4\u8FBE 20%",
    enDesc: "20% of your prompts polished by AI",
    progress: (s) => cap(s.aiRefinedPct, 20)
  },
  // ── 神话档（8）最高难度，对应最强的大阿卡纳（高塔/星星/月亮/太阳/审判/世界/恶魔/死神）──
  {
    id: "use_10000",
    rarity: "myth",
    target: 2e3,
    zhTitle: "\u8BCD\u6D77\u65E0\u6DAF",
    enTitle: "Boundless Words",
    zhDesc: "\u7D2F\u8BA1\u4F7F\u7528 2000 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use prompts 2,000 times in total",
    progress: (s) => cap(s.totalUsage, 2e3)
  },
  {
    id: "collector_1500",
    rarity: "myth",
    target: 300,
    zhTitle: "\u8BCD\u5E93\u6D69\u701A",
    enTitle: "A Galaxy of Prompts",
    zhDesc: "\u8BCD\u5E93\u6536\u85CF\u6EE1 300 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Collect 300 prompts in the library",
    progress: (s) => cap(s.total, 300)
  },
  {
    id: "used_3000",
    rarity: "myth",
    target: 600,
    zhTitle: "\u535A\u95FB\u5F3A\u8BC6",
    enTitle: "Wide-Eyed",
    zhDesc: "\u7D2F\u8BA1\u7528\u8FC7 600 \u6761\u4E0D\u540C\u7684\u63D0\u793A\u8BCD",
    enDesc: "Use 600 distinct prompts in total",
    progress: (s) => cap(s.usedCount, 600)
  },
  {
    id: "ai_1000",
    rarity: "myth",
    target: 200,
    zhTitle: "AI \u795E\u660E\u4E4B\u624B",
    enTitle: "Hand of the Gods",
    zhDesc: "\u7D2F\u8BA1\u7528 AI \u5B8C\u5584 200 \u6761\u63D0\u793A\u8BCD",
    enDesc: "Polish 200 prompts with AI in total",
    progress: (s) => cap(s.aiRefinedCount, 200)
  },
  {
    id: "word_100000",
    rarity: "myth",
    target: 2e4,
    zhTitle: "\u6587\u58A8\u901A\u5929",
    enTitle: "Words Reach the Sky",
    zhDesc: "\u6536\u85CF\u6280\u80FD\u7D2F\u8BA1 2 \u4E07\u5B57",
    enDesc: "Stockpile 20,000 characters of prompts",
    progress: (s) => cap(s.totalBodyLength, 2e4)
  },
  {
    id: "streak_1095",
    rarity: "myth",
    target: 220,
    zhTitle: "\u4E09\u5E74\u4E4B\u7EA6",
    enTitle: "The Three-Year Oath",
    zhDesc: "\u8FDE\u7EED 220 \u5929\u4F7F\u7528\u8BCD\u5E93",
    enDesc: "Use the library 220 days in a row",
    progress: (_s, streak) => cap(streak, 220)
  },
  {
    id: "hot_1000",
    rarity: "myth",
    target: 200,
    zhTitle: "\u4E07\u7BAD\u9F50\u53D1",
    enTitle: "Storm of Use",
    zhDesc: "\u8FD1 7 \u5929\u7D2F\u8BA1\u4F7F\u7528 200 \u6B21\u63D0\u793A\u8BCD",
    enDesc: "Use prompts 200 times within 7 days",
    progress: (s) => cap(s.usedIn7Days > 0 ? s.topUsed7.reduce((a, b) => a + b.count, 0) : 0, 200)
  },
  {
    id: "avg_len_1000",
    rarity: "myth",
    target: 200,
    zhTitle: "\u5B57\u5B57\u73E0\u7391",
    enTitle: "Pearls of Words",
    zhDesc: "\u5E73\u5747\u6BCF\u6761\u63D0\u793A\u8BCD\u6B63\u6587\u8FBE 200 \u5B57",
    enDesc: "Average prompt body reaches 200 characters",
    progress: (s) => cap(s.avgBodyLength, 200)
  }
];
var ZERO_STATS = {
  total: 0,
  totalUsage: 0,
  usedCount: 0,
  unusedCount: 0,
  topUsed: [],
  recentUsed: [],
  tagStats: [],
  trashCount: 0,
  usedIn7Days: 0,
  usedIn30Days: 0,
  longestUnused: [],
  totalBodyLength: 0,
  avgBodyLength: 0,
  aiRefinedCount: 0,
  aiRefinedPct: 0,
  addedIn7Days: 0,
  addedIn30Days: 0,
  topUsed7: [],
  aiRefinedIn7: 0,
  autoLearnedCount: 0
};
function resolveStats(stats) {
  return stats ?? ZERO_STATS;
}
function computeAchievementProgress(stats, streak) {
  const s = resolveStats(stats);
  const map = {};
  for (const r of ACHIEVEMENT_RULES) map[r.id] = r.progress(s, streak);
  return map;
}
function computeAchievements(stats, streak, lang, progressOverride) {
  const s = resolveStats(stats);
  return ACHIEVEMENT_RULES.map((r) => {
    const live = r.progress(s, streak);
    const saved = progressOverride?.[r.id];
    const progress = saved !== void 0 ? Math.max(live, saved) : live;
    return {
      id: r.id,
      title: lang === "en" ? r.enTitle : r.zhTitle,
      desc: lang === "en" ? r.enDesc : r.zhDesc,
      achieved: progress >= r.target,
      rarity: r.rarity,
      points: RARITY_POINTS[r.rarity],
      progress,
      target: r.target
    };
  });
}
function rankFor(unlockedPct, lang) {
  if (unlockedPct >= 100) return { rank: lang === "en" ? "Legendary Librarian" : "\u8BCD\u5E93\u4F20\u5947", rankKey: "legend" };
  if (unlockedPct >= 75) return { rank: lang === "en" ? "Starlight Collector" : "\u661F\u8F89\u6536\u85CF\u5BB6", rankKey: "star" };
  if (unlockedPct >= 50) return { rank: lang === "en" ? "Master Collector" : "\u8BCD\u5E93\u9274\u85CF\u5BB6", rankKey: "collector" };
  if (unlockedPct >= 25) return { rank: lang === "en" ? "Library Explorer" : "\u8BCD\u5E93\u63A2\u7D22\u8005", rankKey: "explorer" };
  return { rank: lang === "en" ? "Library Wanderer" : "\u8BCD\u5E93\u65C5\u4EBA", rankKey: "wanderer" };
}
function computeAchievementSummary(achievements, lang) {
  const unlocked = achievements.filter((a) => a.achieved).length;
  const total = achievements.length;
  const maxPoints = achievements.reduce((sum, a) => sum + a.points, 0);
  const earnedPoints = achievements.reduce((sum, a) => a.achieved ? sum + a.points : sum, 0);
  const pct = total === 0 ? 0 : Math.round(unlocked / total * 100);
  const { rank, rankKey } = rankFor(pct, lang);
  return { rank, rankKey, unlocked, total, earnedPoints, maxPoints };
}
var HOLIDAYS = [
  { month: 1, day: 1, zh: "\u5143\u65E6\u5FEB\u4E50\uFF01\u4ECA\u5E74\u4E5F\u8981\u591A\u6512\u70B9\u597D\u8BCD", en: "Happy New Year! Time to hoard more good prompts" },
  { month: 2, day: 14, zh: "\u60C5\u4EBA\u8282\u5FEB\u4E50\uFF5E\u9001\u4F60\u4E00\u6761\u542B\u60C5\u8109\u8109\u7684\u63D0\u793A\u8BCD", en: "Happy Valentine's Day \u2014 here's a heartfelt prompt for you" },
  { month: 3, day: 8, zh: "\u5987\u5973\u8282\u5FEB\u4E50\uFF01\u505A\u81EA\u5DF1\u7684\u4E3B\u89D2", en: "Happy Women's Day \u2014 be your own hero" },
  { month: 5, day: 1, zh: "\u52B3\u52A8\u8282\u5FEB\u4E50\uFF0C\u52B3\u52A8\u6700\u5149\u8363\uFF0C\u6478\u9C7C\u4E5F\u5408\u7406", en: "Happy Labor Day \u2014 work hard, rest harder" },
  { month: 6, day: 1, zh: "\u513F\u7AE5\u8282\u5FEB\u4E50\uFF01\u4FDD\u6301\u7AE5\u5FC3\uFF0C\u8BCD\u5E93\u4E5F\u8981\u53EF\u53EF\u7231\u7231", en: "Happy Children's Day \u2014 stay playful!" },
  { month: 9, day: 10, zh: "\u6559\u5E08\u8282\u5FEB\u4E50\uFF01\u5411\u77E5\u8BC6\u7684\u5F15\u8DEF\u4EBA\u81F4\u656C", en: "Happy Teachers' Day \u2014 salute the guides of knowledge" },
  { month: 10, day: 1, zh: "\u56FD\u5E86\u5FEB\u4E50\uFF01\u4E03\u5929\u957F\u5047\uFF0C\u8BCD\u5E93\u966A\u4F60\u5145\u7535", en: "Happy National Day! A long break, powered by your library" },
  { month: 12, day: 24, zh: "\u5E73\u5B89\u591C\u5FEB\u4E50\uFF01\u613F\u4F60\u4ECA\u591C\u597D\u68A6", en: "Happy Christmas Eve! Sweet dreams tonight" },
  { month: 12, day: 25, zh: "\u5723\u8BDE\u5FEB\u4E50\uFF01\u793C\u7269\u867D\u8FDF\u4F46\u5230", en: "Merry Christmas! The gift arrives, fashionably late" }
];
function pickEasterEgg(lang, now = /* @__PURE__ */ new Date()) {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const week = now.getDay();
  for (const h of HOLIDAYS) {
    if (h.month === month && h.day === day) {
      return { id: "holiday", text: lang === "en" ? h.en : h.zh };
    }
  }
  if (week === 0 || week === 6) {
    return {
      id: "weekend",
      text: lang === "en" ? "Happy weekend! The library never sleeps" : "\u5468\u672B\u6109\u5FEB\uFF01\u8BCD\u5E93\u4E0D\u6253\u70CA"
    };
  }
  let id = "time";
  let zh;
  let en;
  if (hour >= 5 && hour < 8) {
    zh = "\u5929\u521A\u4EAE\uFF0C\u8BCD\u5E93\u5DF2\u5907\u597D\uFF0C\u5148\u6765\u4E00\u676F\u601D\u8DEF\u5427";
    en = "Early bird! The library is stocked and ready";
  } else if (hour >= 8 && hour < 12) {
    zh = "\u65E9\u4E0A\u597D\uFF01\u4ECA\u5929\u4E5F\u8981\u5143\u6C14\u6EE1\u6EE1\u5730\u63D0\u95EE";
    en = "Good morning! Ready to ask great questions today";
  } else if (hour >= 12 && hour < 14) {
    zh = "\u5348\u4F11\u65F6\u95F4\u5230\uFF0C\u8BB0\u5F97\u5148\u5E72\u996D\u518D\u641E\u8BCD\u5E93";
    en = "Lunch break \u2014 fuel up before you prompt up";
  } else if (hour >= 14 && hour < 18) {
    zh = "\u4E0B\u5348\u8336\u65F6\u95F4\uFF5E\u6765\u6761\u63D0\u793A\u8BCD\u63D0\u63D0\u795E";
    en = "Afternoon tea time \u2014 grab a prompt to recharge";
  } else if (hour >= 18 && hour < 22) {
    zh = "\u665A\u4E0A\u597D\uFF01\u591C\u751F\u6D3B\u521A\u521A\u5F00\u59CB\uFF0C\u7075\u611F\u6B63\u5F53\u65F6";
    en = "Good evening! Inspiration peaks at night";
  } else {
    zh = "\u591C\u6DF1\u4E86\uFF0C\u591C\u732B\u5B50\u8FD8\u5728\u594B\u6597\uFF0C\u8BB0\u5F97\u65E9\u70B9\u4F11\u606F";
    en = "Burning the midnight oil? Don't forget to rest";
  }
  return { id, text: lang === "en" ? en : zh };
}
function buildAssistantStatus(stats, streak, lang, points, progressOverride) {
  const achievements = computeAchievements(stats, streak, lang, progressOverride);
  return {
    level: computeLevel(points, lang),
    achievements,
    achievementSummary: computeAchievementSummary(achievements, lang),
    easterEgg: pickEasterEgg(lang),
    // 等级详情：各档门槛 + 积分来路 + 衰减规则（供前端展开展示）
    levelRules: LEVEL_RULES.map((r) => ({ level: r.level, threshold: r.threshold, zh: r.zh, en: r.en })),
    pointSources: POINT_SOURCE_META.map((m) => ({ kind: m.kind, points: POINTS_WEIGHT[m.kind], zh: m.zh, en: m.en })),
    decayRule: lang === "en" ? "Every 10 days without any activity, 3 points decay." : "\u6BCF\u8FDE\u7EED 10 \u5929\u65E0\u4EFB\u4F55\u6D3B\u52A8\uFF0C\u5C06\u8870\u51CF 3 \u79EF\u5206\u3002"
  };
}
var RARITY_LABEL = {
  common: { zh: "\u666E\u901A", en: "Common" },
  rare: { zh: "\u7A00\u6709", en: "Rare" },
  epic: { zh: "\u53F2\u8BD7", en: "Epic" },
  legendary: { zh: "\u4F20\u8BF4", en: "Legendary" },
  myth: { zh: "\u795E\u8BDD", en: "Mythic" }
};
function buildAchievementNews(stats, streak, lang, progressOverride) {
  const achieved = computeAchievements(stats, streak, lang, progressOverride).filter((a) => a.achieved);
  const pending = computeAchievements(stats, streak, lang, progressOverride).filter((a) => !a.achieved).sort((a, b) => b.progress - a.progress);
  const items = [];
  const rarityOrder = ["myth", "legendary", "epic", "rare", "common"];
  achieved.slice().sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)).forEach((a) => {
    const label = lang === "en" ? "Unlocked" : "\u5DF2\u89E3\u9501";
    items.push({
      title: `\u{1F3C5} ${lang === "en" ? `\u2728 ${label}:` : `${label}`} ${a.title}`,
      summary: `${a.desc}\uFF08${RARITY_LABEL[a.rarity][lang]} \xB7 ${a.points} ${lang === "en" ? "pts" : "\u70B9"}\uFF09`,
      url: ""
    });
  });
  pending.slice(0, 3).forEach((a) => {
    const label = lang === "en" ? "In progress" : "\u8FDB\u884C\u4E2D";
    const pct = a.target > 0 ? Math.round(a.progress / a.target * 100) : 0;
    items.push({
      title: `\u23F3 ${label}: ${a.title}`,
      summary: `${a.desc}\uFF08${pct}%\uFF09`,
      url: ""
    });
  });
  if (items.length === 0) {
    items.push({
      title: lang === "en" ? "No achievements yet" : "\u6682\u65E0\u6210\u5C31\u52A8\u6001",
      summary: lang === "en" ? "Keep using your library to unlock achievements" : "\u591A\u4F7F\u7528\u8BCD\u5E93\uFF0C\u6210\u5C31\u656C\u8BF7\u671F\u5F85",
      url: ""
    });
  }
  return items;
}
var statusEmitter = new EventEmitter2();
statusEmitter.setMaxListeners(100);
function onStatusChange(callback) {
  const handler = (_lang) => {
    callback({});
  };
  statusEmitter.on("change", handler);
  return () => {
    statusEmitter.off("change", handler);
  };
}
function emitStatusChange() {
  statusEmitter.emit("change");
}

// src/host/bundle-doc.ts
import { readFileSync as readFileSync3 } from "node:fs";
function readBundleDoc(fileName, fallback) {
  try {
    const url = new URL(`./doc/${fileName}`, import.meta.url);
    return readFileSync3(url, "utf8").replace(/^\uFEFF/, "");
  } catch {
    return fallback;
  }
}

// src/host/version-notes.ts
var VERSION_NOTES_FILE = "version-notes.json";
function loadVersionNotes() {
  const raw = readBundleDoc(VERSION_NOTES_FILE, "");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n) => !!n && typeof n === "object" && typeof n.version === "string" && !!(n.zh && n.en)
    );
  } catch {
    return [];
  }
}
var VERSION_NOTES = loadVersionNotes();
function normalizeLang(raw) {
  const s = (raw || "zh").toLowerCase();
  if (s.startsWith("en")) return "en";
  return "zh";
}
function getAllVersionNotes(lang = "zh") {
  return VERSION_NOTES.map((n) => {
    const data = n[lang];
    return { version: n.version, date: n.date, title: data.title, items: [...data.items] };
  });
}

// src/host/announcement.ts
var MANUAL_KEYS = [
  "pl.announce.manual.0",
  "pl.announce.manual.1",
  "pl.announce.manual.2",
  "pl.announce.manual.3",
  "pl.announce.manual.4",
  "pl.announce.manual.5",
  "pl.announce.manual.6",
  "pl.announce.manual.7",
  "pl.announce.manual.8",
  "pl.announce.manual.9"
];
var MANUAL_FALLBACK = {
  zh: [
    "\u8F7B\u6572 # \u952E\uFF0C\u8BCD\u5E93\u5373\u73B0\uFF1B\u5B9E\u65F6\u7B5B\u9009\uFF0C\u2191\u2193 \u62E9\u53D6\uFF0C\u56DE\u8F66\u6210\u6587\u3002",
    "\u6167\u773C\u8BC6\u73E0\uFF0C\u81EA\u52A8\u6536\u85CF\u804A\u5929\u4E2D\u5B9D\u8D35\u63D0\u793A\u8BCD\uFF1B\u968F\u65F6\u7F16\u8F91\u5220\u9664\uFF0C\u5E38\u5B66\u5E38\u65B0\u3002",
    "AI \u6DA6\u8272\uFF0C\u5982\u7422\u5982\u78E8\uFF1B\u667A\u80FD\u5B8C\u5584\uFF0C\u53E5\u53E5\u7CBE\u5999\u3002",
    "{{\u53D8\u91CF}} \u751F\u82B1\uFF0C\u63D2\u524D\u5F39\u7A97\u9010\u9879\u586B\u5199\uFF1B\u5957\u7528\u6A21\u677F\uFF0C\u4ECE\u5BB9\u843D\u7B14\u3002",
    "\u9009\u4E2D\u6587\u672C\uFF0C\u4E00\u952E\u526A\u85CF\u5165\u5E93\uFF1B\u6807\u7B7E\u5F52\u7C7B\uFF0C\u6309\u56FE\u7D22\u9AA5\u3002",
    "\u4FA7\u680F\u4E0E\u804A\u5929\u53CC\u5165\u53E3\u7BA1\u7406\uFF1B\u7EDF\u8BA1\u6D1E\u5BDF\u3001\u5BFC\u5165\u5BFC\u51FA\u5907\u4EFD\uFF0C\u8BCD\u6D77\u62FE\u8D1D\uFF0C\u5C3D\u5728\u638C\u63E1\u3002",
    "\u8BCD\u5E93\u52A9\u624B\uFF0C\u5E38\u4F34\u8EAB\u4FA7\uFF1B\u53F3\u952E\u76F4\u8FBE\u9762\u677F\u516C\u544A\uFF0C\u6362\u88C5\u5FC3\u60C5\uFF0C\u7075\u52A8\u53EF\u63AC\u3002",
    "\u6210\u5C31\u5854\u7F57\uFF0C\u96C6\u5361\u5347\u7EA7\u8D62\u79F0\u53F7\uFF1B\u7A00\u6709\u6D41\u8F6C\uFF0C\u6BCF\u65E5\u7B7E\u8BED\uFF0C\u5176\u4E50\u65E0\u7A77\u3002",
    "\u4EBA\u683C\u6280\u80FD\uFF0C\u53CC\u5251\u5408\u74A7\uFF1ASOUL \u53EA\u8BFB\u5B9A\u8C03\uFF0C\u6280\u80FD\u7ED1\u5B9A\u4F1A\u8BDD\u81EA\u52A8\u6CE8\u5165\uFF0C\u5982\u81C2\u4F7F\u6307\u3002",
    "\u516C\u544A\u65E5\u62A5\uFF0C\u6BCF\u65E5 AI \u76D8\u70B9\u8BCD\u6D77\uFF1B\u5386\u53F2\u671F\u6B21\u53EF\u7FFB\uFF0C\u5929\u5929\u7686\u6709\u65B0\u7BC7\u3002"
  ],
  en: [
    "Press # to summon the library: live filter, \u2191\u2193 to select, Enter to write.",
    "A keen eye gathers gems from chat; edit or delete anytime, ever renewed.",
    "AI polishes, stone into jade; smart enrichment, every line refined.",
    "{{variable}} blooms, filled one by one before insert; templates make it effortless.",
    "Select any text, clip it into the library in one click; tag & filter, find at a glance.",
    "Manage from sidebar or chat panel \u2014 stats, export & backup: a sea of words at your fingertips.",
    "A companion assistant by your side: right-click for panel & news, costumes and moods bring it to life.",
    "Tarot achievements: collect cards, level up, earn titles; five rarities and daily fortunes, a joy to collect.",
    "Persona & skills, one pair of hands: a read-only SOUL sets the tone; bound skills auto-inject per session.",
    "A daily paper of your words: AI-crafted reports, pageable across history \u2014 every day a new page."
  ]
};
function getAnnouncement(lang = "zh", t) {
  const L = normalizeLang(lang);
  const fb = MANUAL_FALLBACK[L];
  const manual = MANUAL_KEYS.map((key, i) => {
    const translated = typeof t === "function" ? t(key) : void 0;
    const text = typeof translated === "string" && translated.length > 0 ? translated : fb[i] ?? key;
    return { key, text };
  });
  const versions = getAllVersionNotes(L);
  return { source: "local", lang: L, current: currentVersion(), manual, versions };
}

// src/host/daily.ts
function normalizeDailyLang(lang) {
  return lang.toLowerCase().startsWith("en") ? "en" : "zh";
}
function buildStatsText(s) {
  const lines = [
    `\u8BCD\u5E93\u5171 ${s.total} \u6761\u63D0\u793A\u8BCD\uFF0C\u7D2F\u8BA1\u4F7F\u7528 ${s.totalUsage} \u6B21\uFF0C\u4F7F\u7528\u7387 ${s.total ? Math.round(s.usedCount / s.total * 100) : 0}%\uFF1B`,
    `\u8FD1 7 \u5929\u4F7F\u7528 ${s.usedIn7Days} \u6761\u3001\u65B0\u589E ${s.addedIn7Days} \u6761\u3001AI \u5B8C\u5584 ${s.aiRefinedIn7} \u6761\uFF1B\u8FD1 30 \u5929\u4F7F\u7528 ${s.usedIn30Days} \u6761\u3001\u65B0\u589E ${s.addedIn30Days} \u6761\u3002`
  ];
  if (s.topUsed7.length) {
    lines.push(`\u8FD1 7 \u5929\u6700\u5E38\u7528\uFF1A${s.topUsed7.slice(0, 3).map((p) => `${p.title}\uFF08${p.count}\u6B21\uFF09`).join("\u3001")}\u3002`);
  }
  if (s.aiRefinedCount) {
    lines.push(`\u7D2F\u8BA1 AI \u5B8C\u5584 ${s.aiRefinedCount} \u6761\uFF08\u5360\u6BD4 ${s.aiRefinedPct} %\uFF09\u3002`);
  }
  return lines.join("\n");
}
function beijingNow() {
  const bj = new Date(Date.now() + 8 * 3600 * 1e3);
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${bj.getUTCFullYear()}-${pad(bj.getUTCMonth() + 1)}-${pad(bj.getUTCDate())}`;
  const at = `${date} ${pad(bj.getUTCHours())}:${pad(bj.getUTCMinutes())}:${pad(bj.getUTCSeconds())}\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09`;
  return { date, at };
}
function saveIssueToDb(issue) {
  setNewspaperRecord({
    date: issue.date,
    lang: issue.lang,
    report: issue.report,
    news: issue.news,
    newsSource: issue.newsSource ?? "achievement"
  });
}
function readIssueFromDb(date, lang) {
  const rec = getNewspaperRecord(date, lang);
  if (!rec) return void 0;
  return {
    date: rec.date,
    lang: rec.lang,
    report: rec.report,
    news: rec.news,
    newsSource: rec.newsSource
  };
}
async function generateTodayIssue(today, settings) {
  const [streak, stats] = await Promise.all([
    computeStreak().catch(() => 0),
    computeLibraryStats().catch(() => void 0)
  ]);
  const statsText = stats ? buildStatsText(stats) : void 0;
  if (!statsText) {
    const empty = { report: null, news: null, newsSource: "achievement" };
    return [
      { date: today, lang: "zh", ...empty },
      { date: today, lang: "en", ...empty }
    ];
  }
  const progress = syncAchievementProgress(computeAchievementProgress(stats, streak));
  const news = {
    zh: buildAchievementNews(stats, streak, "zh", progress),
    en: buildAchievementNews(stats, streak, "en", progress)
  };
  const [reportZh, reportEn] = await Promise.all([
    generateDailyReport(statsText, settings, "zh"),
    generateDailyReport(statsText, settings, "en")
  ]);
  const versions = [
    { date: today, lang: "zh", report: reportZh ?? null, news: news.zh.length > 0 ? news.zh : null, newsSource: "achievement" },
    { date: today, lang: "en", report: reportEn ?? null, news: news.en.length > 0 ? news.en : null, newsSource: "achievement" }
  ];
  for (const v of versions) saveIssueToDb(v);
  return versions;
}
async function getIssue(date, lang, settings) {
  const L = normalizeDailyLang(lang);
  const today = beijingNow().date;
  const cached = readIssueFromDb(date, L);
  if (cached) {
    if (date === today && (cached.report === null || cached.report.length === 0)) {
      try {
        const versions2 = await generateTodayIssue(today, settings);
        const fresh = versions2.find((v) => v.lang === L);
        if (fresh && fresh.report && fresh.report.length > 0) return fresh;
      } catch {
      }
    }
    return cached;
  }
  if (date !== today) {
    return { date, lang: L, report: null, news: null, newsSource: null };
  }
  const versions = await generateTodayIssue(today, settings);
  return versions.find((v) => v.lang === L) ?? versions[0];
}
function listIssueDates() {
  return listNewspaperDates();
}

// src/host/backup.ts
import { copyFile, mkdir as mkdir3, readFile as readFile4, readdir as readdir2, rm as rm4, stat as stat3, writeFile as writeFile4 } from "node:fs/promises";
import { join as join7 } from "node:path";
var FILE_RE = /^prompts-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.(db|json)$/;
var DAY_MS = 24 * 60 * 60 * 1e3;
function intervalOf(schedule) {
  switch (schedule) {
    case "weekly":
      return 7 * DAY_MS;
    case "monthly":
      return 30 * DAY_MS;
    default:
      return DAY_MS;
  }
}
function stampOf(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function createdAtOf(name2) {
  const m = name2.match(FILE_RE);
  if (!m) return 0;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
}
function isSafeBackupName(name2) {
  if (!name2) return false;
  if (!(name2.endsWith(".db") || name2.endsWith(".json"))) return false;
  if (name2.includes("/") || name2.includes("\\") || name2.includes("..")) return false;
  return true;
}
function formatOf(name2) {
  return name2.endsWith(".json") ? "json" : "db";
}
async function listBackups() {
  const dir = backupDir();
  let names = [];
  try {
    const entries = await readdir2(dir, { withFileTypes: true });
    names = entries.filter((e) => e.isFile() && isSafeBackupName(e.name)).map((e) => e.name);
  } catch {
    return [];
  }
  const list = [];
  for (const name2 of names) {
    try {
      const s = await stat3(join7(dir, name2));
      list.push({ name: name2, size: s.size, createdAt: createdAtOf(name2) || s.mtimeMs, format: formatOf(name2) });
    } catch {
    }
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
}
async function pruneBackups(retention) {
  const keep = Math.max(1, Math.floor(retention) || 1);
  const list = await listBackups();
  if (list.length <= keep) return;
  const dir = backupDir();
  for (const b of list.slice(keep)) {
    try {
      await rm4(join7(dir, b.name), { force: true });
    } catch {
    }
  }
}
async function runBackup(retention, format = "db") {
  const dir = backupDir();
  await mkdir3(dir, { recursive: true });
  const stamp = stampOf(/* @__PURE__ */ new Date());
  const name2 = format === "json" ? `prompts-${stamp}.json` : `prompts-${stamp}.db`;
  const target = join7(dir, name2);
  if (format === "json") {
    const data = await exportPrompts();
    await writeFile4(target, JSON.stringify(data, null, 2), "utf8");
  } else {
    checkpointDb();
    await copyFile(dbPath(), target);
  }
  const s = await stat3(target);
  if (retention && retention > 0) {
    await pruneBackups(retention);
  }
  return { name: name2, size: s.size };
}
async function restoreBackup(name2) {
  if (!isSafeBackupName(name2)) {
    throw new Error("invalid backup name");
  }
  const file = join7(backupDir(), name2);
  const st = await stat3(file).catch(() => null);
  if (!st || !st.isFile()) {
    throw new Error("backup file not found");
  }
  const format = formatOf(name2);
  let count = 0;
  if (format === "db") {
    checkpointDb();
    closeDb();
    await copyFile(file, dbPath());
    await rm4(`${dbPath()}-wal`, { force: true }).catch(() => {
    });
    await rm4(`${dbPath()}-shm`, { force: true }).catch(() => {
    });
    reopenDb();
    count = (await listPrompts()).length;
  } else {
    const raw = JSON.parse(await readFile4(file, "utf8"));
    const res = await restoreFromJson(raw);
    count = res.imported;
  }
  emitDataChanged();
  return { format, count };
}
async function deleteBackup(name2) {
  if (!isSafeBackupName(name2)) {
    throw new Error("invalid backup name");
  }
  await rm4(join7(backupDir(), name2), { force: true });
  return true;
}
async function autoBackup() {
  try {
    const settings = await getSettings();
    if (!settings.backupEnabled) return { ran: false, reason: "disabled" };
    const lastAt = Number(getMetaValue("lastBackupAt")) || 0;
    if (lastAt > 0 && Date.now() - lastAt < intervalOf(settings.backupSchedule)) {
      return { ran: false, reason: "not-due" };
    }
    const res = await runBackup(settings.backupRetention, settings.backupFormat);
    setMetaValue("lastBackupAt", String(Date.now()));
    return { ran: true, name: res.name };
  } catch {
    return { ran: false, reason: "error" };
  }
}

// src/host/persona-service.ts
import { existsSync, readFileSync as readFileSync4, readdirSync as readdirSync2 } from "node:fs";
import { basename as basename2, join as join8 } from "node:path";
import { randomUUID as randomUUID3 } from "node:crypto";
function recordToView(record) {
  return {
    id: record.id,
    name: record.name,
    enabled: record.enabled,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    isDefault: false
  };
}
function normalizePersonaId(personaId) {
  if (!personaId) return null;
  const id = personaId === DEFAULT_PERSONA_ID ? null : personaId;
  if (id && !getPersona(id)) return null;
  return id;
}
async function listPersonaViews() {
  const defaultContent = await readPersonaSoul(null);
  const views = [
    {
      id: DEFAULT_PERSONA_ID,
      name: "\u9ED8\u8BA4\u4EBA\u683C",
      enabled: true,
      createdAt: 0,
      updatedAt: 0,
      isDefault: true,
      content: defaultContent
    }
  ];
  const records = listPersonas();
  for (const r of records) {
    const meta = recordToView(r);
    views.push({ ...meta, content: await readPersonaSoul(r.id) });
  }
  return views;
}
async function createPersonaWithSoul(name2) {
  const id = randomUUID3();
  const record = createPersona(id, name2.trim() || "\u65B0\u4EBA\u683C");
  await ensurePersonaSoul(id);
  const content = await readPersonaSoul(id);
  return { ...recordToView(record), content };
}
async function updatePersonaWithContent(id, patch) {
  const record = getPersona(id);
  if (!record) return void 0;
  if (patch.content !== void 0) {
    await writePersonaSoul(patch.content, id);
    invalidateSoulCache(id);
  }
  if (patch.name !== void 0 || patch.enabled !== void 0) {
    updatePersonaMeta(id, { name: patch.name, enabled: patch.enabled });
  }
  const next = getPersona(id);
  return { ...recordToView(next), content: await readPersonaSoul(id) };
}
async function deletePersonaWithSoul(id) {
  if (id === DEFAULT_PERSONA_ID) return false;
  if (!getPersona(id)) return false;
  deletePersona(id);
  removePersonaSoul(id);
  invalidateSoulCache(id);
  return true;
}
function normalizeScopePath2(p) {
  let s = p.replace(/\\/g, "/").trim();
  while (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return process.platform === "win32" ? s.toLowerCase() : s;
}
function bindPersonaToScope(scopePath, personaId) {
  const normalized = normalizePersonaId(personaId);
  if (normalized) {
    setScopePersonaBinding(scopePath, normalized);
    return normalized;
  }
  clearScopePersonaBinding(scopePath);
  return DEFAULT_PERSONA_ID;
}
function getPersonaForScopePath(scopePath) {
  const bound = getScopeBoundPersonaId(scopePath);
  return normalizePersonaId(bound) ?? "";
}
function resolvePersonaForPath(cwd) {
  if (!cwd) return null;
  const normals = new Map(
    listScopeBindings().map((b) => [normalizeScopePath2(b.path), b.personaId])
  );
  let cur = normalizeScopePath2(cwd);
  for (; ; ) {
    const pid = normals.get(cur);
    if (pid) {
      const record = getPersona(pid);
      if (record && record.enabled) return pid;
    }
    const idx = cur.lastIndexOf("/");
    if (idx <= 0) break;
    cur = cur.slice(0, idx);
  }
  return null;
}
function getPersonaForSession(sessionId) {
  const bound = getSessionBoundPersonaId(sessionId);
  return normalizePersonaId(bound) ?? "";
}
function resolvePersonaForSession(sessionId, cwd) {
  if (typeof sessionId === "string" && sessionId) {
    const pid = getPersonaForSession(sessionId);
    if (pid) {
      const record = getPersona(pid);
      if (record && record.enabled) return pid;
    }
  }
  return resolvePersonaForPath(cwd);
}
function listScopeTree() {
  const nodes = [];
  let raw = {};
  if (existsSync(workspaceStorePath())) {
    try {
      raw = JSON.parse(readFileSync4(workspaceStorePath(), "utf8"));
    } catch {
    }
  }
  const wsMap = raw?.tables?.workspaces ?? {};
  for (const ws of Object.values(wsMap)) {
    if (typeof ws?.path !== "string" || !ws.path) continue;
    const title = typeof ws.title === "string" && ws.title ? ws.title : basename2(ws.path);
    nodes.push(buildScopeNode(ws.path, title, "workspace"));
  }
  return nodes;
}
function buildScopeNode(absPath, title, kind) {
  const children = [];
  if (kind === "workspace") {
    try {
      const entries = readdirSync2(absPath, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory() || e.name.startsWith(".")) continue;
        const childPath = join8(absPath, e.name);
        children.push(buildScopeNode(childPath, e.name, "project"));
      }
    } catch {
    }
    children.sort((a, b) => a.title.localeCompare(b.title, "zh"));
  }
  return { path: absPath, title, kind, bound: getPersonaForScopePath(absPath), children };
}

// src/host/session-scope.ts
var sessionProvider = null;
function registerSessionListProvider(provider) {
  sessionProvider = provider;
}
var activeSessionCwd = /* @__PURE__ */ new Map();
function recordActiveSessionCwd(sessionId, cwd) {
  if (!sessionId) return;
  if (cwd) activeSessionCwd.set(sessionId, cwd);
}
function getActiveSessionCwd(sessionId) {
  return activeSessionCwd.get(sessionId) ?? "";
}
async function listSessionRecords() {
  if (!sessionProvider) return [];
  try {
    return await sessionProvider();
  } catch {
    return [];
  }
}
async function listSessionScopeTree() {
  const [tree, sessions] = await Promise.all([listScopeTree(), listSessionRecords()]);
  attachSessionsToTree(tree, sessions);
  flattenProjects(tree);
  orderTreeBySessionAppearance(tree, sessions);
  return tree;
}
function flattenProjects(tree) {
  const flatten = (node) => {
    const merged = node.sessions ? [...node.sessions] : void 0;
    const collect = (n) => {
      for (const child of n.children) {
        if (child.sessions) merged?.push(...child.sessions);
        collect(child);
      }
    };
    collect(node);
    if (merged && merged.length > 0) node.sessions = merged;
    node.children = [];
  };
  for (const ws of tree) flatten(ws);
}
function orderTreeBySessionAppearance(tree, sessions) {
  const idx = /* @__PURE__ */ new Map();
  sessions.forEach((s, i) => idx.set(s.id, i));
  const cache2 = /* @__PURE__ */ new Map();
  const key = (node) => {
    const cached = cache2.get(node);
    if (cached !== void 0) return cached;
    let best = Infinity;
    if (node.sessions) {
      for (const s of node.sessions) {
        const k = idx.get(s.id);
        if (k !== void 0 && k < best) best = k;
      }
    }
    for (const child of node.children) {
      const k = key(child);
      if (k < best) best = k;
    }
    cache2.set(node, best);
    return best;
  };
  const sortNodes = (nodes) => {
    nodes.sort((a, b) => key(a) - key(b));
    for (const n of nodes) sortNodes(n.children);
  };
  sortNodes(tree);
}
function normalizeScopePath3(p) {
  let s = p.replace(/\\/g, "/").trim();
  while (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return process.platform === "win32" ? s.toLowerCase() : s;
}
function attachSessionsToTree(tree, sessions) {
  const pathIndex = /* @__PURE__ */ new Map();
  const walk = (node) => {
    pathIndex.set(normalizeScopePath3(node.path), node);
    for (const child of node.children) walk(child);
  };
  for (const ws of tree) walk(ws);
  const sessionPromptBindings = new Map(
    listSessionBindings().map((b) => [b.sessionId, b.promptIds])
  );
  const unmatched = [];
  for (const s of sessions) {
    const node = s.cwd ? findDeepestNode(pathIndex, s.cwd) : void 0;
    const sessionNode = {
      id: s.id,
      title: s.title || `\u4F1A\u8BDD ${s.id.slice(0, 8)}`,
      cwd: s.cwd ?? "",
      boundPersonaId: getPersonaForSession(s.id),
      boundPromptIds: sessionPromptBindings.get(s.id) ?? []
    };
    if (node) {
      (node.sessions ??= []).push(sessionNode);
    } else {
      unmatched.push(sessionNode);
    }
  }
  if (unmatched.length > 0) {
    tree.push({
      path: UNMATCHED_SCOPE_PATH,
      title: UNMATCHED_SCOPE_PATH,
      kind: "workspace",
      bound: "",
      sessions: unmatched,
      children: []
    });
  }
}
function findDeepestNode(pathIndex, cwd) {
  let cur = normalizeScopePath3(cwd);
  for (; ; ) {
    const node = pathIndex.get(cur);
    if (node) return node;
    const idx = cur.lastIndexOf("/");
    if (idx <= 0) break;
    cur = cur.slice(0, idx);
  }
  return void 0;
}

// src/host/routes.ts
var PREFIX2 = "/api/prompt-library";
function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
function buildExportFile(format, prompts) {
  const d = /* @__PURE__ */ new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const base = `prompt-library-${stamp}`;
  const csvEscape = (v) => /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  if (format === "json") {
    return {
      fileName: `${base}.json`,
      content: JSON.stringify(
        {
          version: 1,
          exportedAt: Date.now(),
          prompts: prompts.map((p) => ({
            title: p.title,
            body: p.body,
            tags: p.tags,
            ...p.summary ? { summary: p.summary } : {}
          }))
        },
        null,
        2
      )
    };
  }
  if (format === "csv") {
    const lines = ["title,body,tags,summary"];
    for (const p of prompts) {
      lines.push(
        `${csvEscape(p.title)},${csvEscape(p.body)},${csvEscape((p.tags ?? []).join("|"))},${csvEscape(p.summary ?? "")}`
      );
    }
    return { fileName: `${base}.csv`, content: "\uFEFF" + lines.join("\r\n") };
  }
  if (format === "md") {
    const parts = [];
    for (const p of prompts) {
      const tagsLine = p.tags && p.tags.length ? `

\u6807\u7B7E\uFF1A${p.tags.join("\u3001")}` : "";
      const summaryLine = p.summary?.trim() ? `

\u6458\u8981\uFF1A${p.summary.trim()}` : "";
      parts.push(`# ${p.title}${tagsLine}${summaryLine}

${(p.body ?? "").trim()}`);
    }
    return { fileName: `${base}.md`, content: parts.join("\n\n---\n\n") + "\n" };
  }
  if (format === "txt") {
    const parts = [];
    for (const p of prompts) {
      const tagsLine = p.tags && p.tags.length ? `

\u6807\u7B7E\uFF1A${p.tags.join("\u3001")}` : "";
      const summaryLine = p.summary?.trim() ? `

\u6458\u8981\uFF1A${p.summary.trim()}` : "";
      parts.push(`\u3010${p.title}\u3011${tagsLine}${summaryLine}

${(p.body ?? "").trim()}`);
    }
    return { fileName: `${base}.txt`, content: parts.join("\n\n" + "-".repeat(24) + "\n\n") };
  }
  return null;
}
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const CAP = 1 << 20;
    req.on("data", (c) => {
      size += c.length;
      if (size > CAP) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
function parseTail(url) {
  const full = url ?? "";
  const pathname = full.split("?", 1)[0] ?? "";
  const tail = pathname.startsWith(PREFIX2) ? pathname.slice(PREFIX2.length) : pathname;
  const segments = tail.split("/").filter(Boolean);
  return { tail, segments };
}
function isInput(value) {
  return typeof value === "object" && value !== null && typeof value.title === "string" && typeof value.body === "string";
}
function isPatch(value) {
  return typeof value === "object" && value !== null;
}
function isSkillEntry(value) {
  return typeof value === "object" && value !== null && typeof value.title === "string" && typeof value.body === "string";
}
function extractIds(body) {
  const obj = typeof body === "object" && body !== null ? body : null;
  const list = obj ? Array.isArray(obj.promptIds) ? obj.promptIds : Array.isArray(obj.ids) ? obj.ids : [] : Array.isArray(body) ? body : [];
  return list.filter((x) => typeof x === "string");
}
async function resolveCurrentProjectCwd() {
  let records = [];
  try {
    records = await listSessionRecords();
  } catch {
    records = [];
  }
  const scope = getCurrentSessionScope();
  if (scope) {
    const byScope = records.find((r) => r.id === scope)?.cwd;
    if (byScope) return byScope;
  }
  return records.find((r) => r.cwd)?.cwd || null;
}
var MAX_PREVIEW_FILE_SIZE = 2 * 1024 * 1024;
var MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;
var TEXT_LINE_CAP = 1800;
var SEARCH_MATCHES_PER_FILE = 5;
var SEARCH_TOTAL_MATCHES = 300;
var SEARCH_MAX_FILE_SIZE = 4 * 1024 * 1024;
var PREVIEW_SKIP_DIRS = /* @__PURE__ */ new Set(["node_modules", ".git", ".svn", ".hg", "dist", "build"]);
var MAX_PREVIEW_FILES = 300;
var PREVIEW_EXT_TYPES = {
  // Markdown
  ".md": "md",
  ".markdown": "md",
  // JSON
  ".json": "json",
  // Plain text
  ".txt": "txt",
  // CSV
  ".csv": "csv",
  // Programming languages
  ".ts": "ts",
  ".tsx": "ts",
  ".js": "js",
  ".jsx": "js",
  ".py": "py",
  ".go": "go",
  ".rs": "rs",
  ".java": "java",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  // Images
  ".png": "png",
  ".jpg": "jpg",
  ".jpeg": "jpeg",
  ".gif": "gif",
  ".svg": "svg",
  // Videos
  ".mp4": "mp4"
};
var PREVIEW_NAME_TYPES = {
  ".env": "txt",
  ".envrc": "txt",
  ".gitignore": "txt",
  ".gitattributes": "txt",
  ".npmrc": "txt",
  ".npmignore": "txt",
  ".prettierrc": "txt",
  ".babelrc": "txt",
  ".eslintrc": "txt",
  ".editorconfig": "txt",
  "dockerfile": "txt",
  "makefile": "txt",
  "rakefile": "txt",
  "gemfile": "txt",
  "justfile": "txt",
  "procfile": "txt",
  "vagrantfile": "txt",
  "caddyfile": "txt"
};
function previewTypeOf(name2) {
  if (!name2) return null;
  if (name2.includes("/") || name2.includes("\\") || name2.includes("..")) return null;
  const lower = name2.toLowerCase();
  const named = PREVIEW_NAME_TYPES[lower];
  if (named) return named;
  if (lower.startsWith(".env.")) return "txt";
  const ext = name2.slice(name2.lastIndexOf(".")).toLowerCase();
  return PREVIEW_EXT_TYPES[ext] ?? null;
}
function isBinaryType(type) {
  return ["png", "jpg", "jpeg", "gif", "svg", "mp4"].includes(type);
}
function safeBasename(name2) {
  return typeof name2 === "string" && !!name2.trim() && !name2.includes("/") && !name2.includes("\\") && !name2.includes("..");
}
function mimeOf(name2) {
  const ext = name2.slice(name2.lastIndexOf(".") + 1).toLowerCase();
  return {
    md: "text/markdown",
    json: "application/json",
    txt: "text/plain",
    csv: "text/csv",
    yml: "text/yaml",
    yaml: "text/yaml",
    toml: "text/x-toml",
    xml: "application/xml",
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "text/javascript",
    mjs: "text/javascript",
    cjs: "text/javascript",
    ts: "text/plain",
    py: "text/x-python",
    go: "text/plain",
    rs: "text/plain",
    java: "text/plain",
    c: "text/plain",
    cpp: "text/plain",
    log: "text/plain",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    ico: "image/x-icon",
    pdf: "application/pdf",
    zip: "application/zip",
    gz: "application/gzip",
    mp4: "video/mp4",
    webm: "video/webm",
    mp3: "audio/mpeg"
  }[ext] ?? "application/octet-stream";
}
async function listPreviewFiles(dir) {
  const list = [];
  const walk = async (d) => {
    if (list.length >= MAX_PREVIEW_FILES) return;
    let entries;
    try {
      entries = await readdir3(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (list.length >= MAX_PREVIEW_FILES) return;
      const full = join9(d, e.name);
      if (e.isDirectory()) {
        if (PREVIEW_SKIP_DIRS.has(e.name)) continue;
        await walk(full);
        if (list.length >= MAX_PREVIEW_FILES) return;
        try {
          const s = await stat4(full);
          list.push({
            name: full.slice(dir.length).replace(/\\/g, "/").replace(/^\/+/, ""),
            path: full,
            size: 0,
            modified: s.mtimeMs,
            dir: true
          });
        } catch {
        }
      } else if (e.isFile()) {
        const type = previewTypeOf(e.name);
        if (!type) continue;
        try {
          const s = await stat4(full);
          list.push({
            name: full.slice(dir.length).replace(/\\/g, "/").replace(/^\/+/, ""),
            path: full,
            size: s.size,
            type,
            modified: s.mtimeMs
          });
        } catch {
        }
      }
    }
  };
  await walk(dir);
  return list.sort((a, b) => a.name.localeCompare(b.name));
}
async function resolveSessionFolder(sessid) {
  if (!sessid) return null;
  const tree = await listSessionScopeTree();
  let found = null;
  const walk = (node) => {
    if (found) return;
    for (const s of node.sessions ?? []) {
      if (s.id === sessid && node.path !== UNMATCHED_SCOPE_PATH) {
        found = node.path;
        return;
      }
    }
    for (const child of node.children) walk(child);
  };
  for (const ws of tree) walk(ws);
  return found;
}
async function readPreviewFile(p) {
  const type = previewTypeOf(basename3(p));
  if (!type) return null;
  if (p.includes("..")) return null;
  if (!existsSync2(p)) return null;
  const s = await stat4(p);
  if (!s.isFile()) return null;
  if (isBinaryType(type) && s.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error("file too large");
  }
  if (isBinaryType(type)) {
    const buffer = await readFile5(p);
    const content2 = buffer.toString("base64");
    return { name: basename3(p), path: p, content: content2, size: s.size, type };
  }
  let content = await readFile5(p, "utf8");
  let truncated;
  let totalLines;
  if (s.size > MAX_PREVIEW_FILE_SIZE) {
    const lines = content.split("\n");
    totalLines = lines.length;
    if (lines.length > TEXT_LINE_CAP) {
      content = lines.slice(0, TEXT_LINE_CAP).join("\n");
      truncated = true;
    }
  }
  return {
    name: basename3(p),
    path: p,
    content,
    size: s.size,
    type,
    ...truncated !== void 0 && { truncated },
    ...totalLines !== void 0 && { totalLines }
  };
}
function searchableType(type) {
  return !["png", "jpg", "jpeg", "gif", "svg", "mp4"].includes(type);
}
async function searchPreviewFiles(dir, query, caseSensitive) {
  const matches = [];
  const needle = caseSensitive ? query : query.toLowerCase();
  const walk = async (d) => {
    if (matches.length >= SEARCH_TOTAL_MATCHES) return;
    let entries;
    try {
      entries = await readdir3(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (matches.length >= SEARCH_TOTAL_MATCHES) return;
      const full = join9(d, e.name);
      if (e.isDirectory()) {
        if (PREVIEW_SKIP_DIRS.has(e.name)) continue;
        await walk(full);
      } else if (e.isFile()) {
        const type = previewTypeOf(e.name);
        if (!type || !searchableType(type)) continue;
        try {
          const s = await stat4(full);
          if (s.size > SEARCH_MAX_FILE_SIZE) continue;
          const text = await readFile5(full, "utf8");
          const lines = text.split("\n");
          let perFile = 0;
          for (let i = 0; i < lines.length && perFile < SEARCH_MATCHES_PER_FILE; i++) {
            const lineText = lines[i];
            const idx = caseSensitive ? lineText.indexOf(query) : lineText.toLowerCase().indexOf(needle);
            if (idx >= 0) {
              perFile++;
              const trimmed = lineText.trim();
              matches.push({
                path: full,
                name: basename3(full),
                type,
                size: s.size,
                line: i + 1,
                index: idx,
                text: trimmed.length > 160 ? `${trimmed.slice(0, 160)}\u2026` : trimmed || " "
              });
            }
          }
        } catch {
        }
      }
    }
  };
  await walk(dir);
  return matches;
}
async function readPreviewFileLines(p, offset, limit) {
  const type = previewTypeOf(basename3(p));
  if (!type || !searchableType(type)) return null;
  if (p.includes("..")) return null;
  if (!existsSync2(p)) return null;
  const s = await stat4(p);
  if (!s.isFile()) return null;
  const start = Math.max(0, offset);
  const cap2 = Math.min(1e4, Math.max(1, limit));
  const end = start + cap2;
  return await new Promise((resolve, reject) => {
    const lines = [];
    let total = 0;
    let rl;
    try {
      rl = createInterface({ input: createReadStream(p, { encoding: "utf8" }), crlfDelay: Infinity });
    } catch (err) {
      reject(err);
      return;
    }
    rl.on("line", (ln) => {
      if (total >= start && total < end) lines.push(ln);
      total++;
    });
    rl.on(
      "close",
      () => resolve({ name: basename3(p), path: p, size: s.size, type, lines, total, offset: start })
    );
    rl.on("error", reject);
  });
}
async function resolvePreviewRoot(sessid) {
  if (!sessid) return "";
  const cwd1 = getActiveSessionCwd(sessid);
  if (cwd1) return cwd1;
  const rec = (await listSessionRecords()).find((r) => r.id === sessid);
  if (rec?.cwd) return rec.cwd;
  const treeFolder = await resolveSessionFolder(sessid);
  return treeFolder ?? "";
}
function makePromptRoutes() {
  const handler = async (req, res) => {
    const method = (req.method ?? "GET").toUpperCase();
    const { tail, segments } = parseTail(req.url);
    const promptId = segments[0] === "prompts" && segments.length === 2 ? segments[1] : void 0;
    try {
      if (method === "GET" && (segments.length === 0 || segments[0] === "prompts" && segments.length === 1)) {
        const prompts = await listPrompts();
        return json(res, 200, { ok: true, data: prompts });
      }
      if (method === "POST" && segments[0] === "prompts" && segments.length === 1) {
        const body = await readJsonBody(req);
        if (!isInput(body)) return json(res, 400, { ok: false, error: "invalid body: {title, body}" });
        const prompt = await createPrompt(body);
        emitStatusChange();
        return json(res, 201, { ok: true, data: prompt });
      }
      if (method === "POST" && tail === "/learn") {
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null || typeof raw.body !== "string") {
          return json(res, 400, { ok: false, error: "invalid body: {body: string}" });
        }
        const body = raw;
        const text = body.body.trim();
        if (text.length < 20) {
          return json(res, 400, { ok: false, error: "body too short" });
        }
        const summary = typeof body.summary === "string" ? body.summary.trim() || void 0 : void 0;
        const prompt = await autoLearn(text, body.tag, body.skipEnrich, summary);
        return json(res, 200, { ok: true, data: prompt });
      }
      if (method === "PUT" && promptId) {
        const body = await readJsonBody(req);
        if (!isPatch(body)) return json(res, 400, { ok: false, error: "invalid body" });
        const updated = await updatePrompt(promptId, body);
        if (!updated) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: updated });
      }
      if (method === "DELETE" && promptId) {
        const removed = await deletePrompt(promptId);
        if (!removed) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: { id: promptId } });
      }
      if (method === "POST" && segments[0] === "prompts" && segments[2] === "refine" && segments.length === 3) {
        const ok = await refinePrompt(segments[1] ?? "");
        if (ok) emitStatusChange();
        return json(res, ok ? 200 : 404, { ok, data: { ok } });
      }
      if (method === "POST" && promptId) {
        const updated = await recordUsage(promptId);
        if (!updated) return json(res, 404, { ok: false, error: "not found" });
        emitStatusChange();
        return json(res, 200, { ok: true, data: updated });
      }
      if (method === "GET" && segments[0] === "prompts" && segments[2] === "versions" && segments.length === 3) {
        const list = listPromptVersions(segments[1] ?? "");
        return json(res, 200, { ok: true, data: list });
      }
      if (method === "GET" && segments[0] === "mood" && segments.length === 1) {
        return json(res, 200, { ok: true, data: getDailyMood() });
      }
      if (method === "POST" && segments[0] === "mood" && segments.length === 1) {
        const body = await readJsonBody(req);
        const obj = typeof body === "object" && body !== null ? body : {};
        const happy = typeof obj.happy === "number" ? Math.max(0, obj.happy) : 0;
        const sad = typeof obj.sad === "number" ? Math.max(0, obj.sad) : 0;
        const dayKey = typeof obj.dayKey === "string" ? obj.dayKey : void 0;
        const data = setDailyMood({ happy, sad }, dayKey);
        return json(res, 200, { ok: true, data });
      }
      if (method === "GET" && segments[0] === "meta" && segments.length === 2) {
        const value = getMetaValue(segments[1] ?? "");
        return json(res, 200, { ok: true, data: { key: segments[1], value } });
      }
      if (method === "PUT" && segments[0] === "meta" && segments.length === 2) {
        const body = await readJsonBody(req);
        const obj = typeof body === "object" && body !== null ? body : {};
        const value = typeof obj.value === "string" ? obj.value : "";
        setMetaValue(segments[1] ?? "", value);
        return json(res, 200, { ok: true, data: { key: segments[1], value } });
      }
      if (method === "GET" && segments[0] === "export" && segments.length === 1) {
        const data = await exportPrompts();
        return json(res, 200, { ok: true, data });
      }
      if (method === "POST" && segments[0] === "export" && segments.length === 1) {
        const body = await readJsonBody(req);
        const ids = typeof body === "object" && body !== null && Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : void 0;
        const data = await exportPrompts(ids && ids.length > 0 ? ids : void 0);
        return json(res, 200, { ok: true, data });
      }
      if (method === "POST" && segments[0] === "export" && segments[1] === "save") {
        const body = await readJsonBody(req);
        const obj = typeof body === "object" && body !== null ? body : {};
        const ids = Array.isArray(obj.ids) ? obj.ids.filter((x) => typeof x === "string") : void 0;
        const format = typeof obj.format === "string" ? obj.format : "json";
        const data = await exportPrompts(ids && ids.length > 0 ? ids : void 0);
        const file = buildExportFile(
          format,
          data.prompts.map((p) => ({ title: p.title, body: p.body, tags: p.tags, summary: p.summary }))
        );
        if (!file) return json(res, 400, { ok: false, error: "bad request" });
        const dir = downloadDir();
        await mkdir4(dir, { recursive: true });
        const ext = file.fileName.match(/\.([^.]*)$/)?.[1] ?? "";
        const base = ext ? file.fileName.slice(0, -(ext.length + 1)) : file.fileName;
        let finalName = file.fileName;
        let n = 1;
        while (existsSync2(join9(dir, finalName))) {
          finalName = ext ? `${base} (${n}).${ext}` : `${base} (${n})`;
          n++;
        }
        const target = join9(dir, finalName);
        await writeFile5(target, file.content, "utf8");
        return json(res, 200, { ok: true, data: { count: data.prompts.length, filePath: target } });
      }
      if (method === "POST" && segments[0] === "import" && segments.length === 1) {
        const body = await readJsonBody(req);
        const result = await importPrompts(body);
        emitStatusChange();
        return json(res, 200, { ok: true, data: result });
      }
      if (method === "GET" && segments[0] === "tags" && segments.length === 1) {
        const data = await listTags();
        return json(res, 200, { ok: true, data });
      }
      if (method === "PUT" && segments[0] === "tags" && segments.length === 2) {
        const from = decodeURIComponent(segments[1] ?? "");
        const body = await readJsonBody(req);
        const to = typeof body === "object" && body !== null && typeof body.to === "string" ? body.to : "";
        const changed = await renameTag(from, to);
        return json(res, 200, { ok: true, data: { changed } });
      }
      if (method === "DELETE" && segments[0] === "tags" && segments.length === 2) {
        const name2 = decodeURIComponent(segments[1] ?? "");
        const changed = await deleteTag(name2);
        return json(res, 200, { ok: true, data: { changed } });
      }
      if (method === "POST" && segments[0] === "tags" && segments.length === 1) {
        const body = await readJsonBody(req);
        const name2 = typeof body === "object" && body !== null && typeof body.name === "string" ? body.name : "";
        const created = await createTag(name2);
        return json(res, 201, { ok: true, data: { name: created } });
      }
      if (method === "GET" && segments[0] === "trash" && segments.length === 1) {
        const data = await listTrash();
        return json(res, 200, { ok: true, data });
      }
      if (method === "POST" && tail === "/skills/import") {
        const result = await importSkillsFromDisk();
        return json(res, 200, { ok: true, data: result });
      }
      if (method === "GET" && tail === "/skills/available") {
        const data = await listAvailableSkills();
        return json(res, 200, { ok: true, data });
      }
      if (method === "POST" && tail === "/skills/scan-dir") {
        const raw = await readJsonBody(req);
        const dir = typeof raw === "object" && raw !== null && typeof raw.dir === "string" ? raw.dir.trim() : "";
        if (!dir) return json(res, 400, { ok: false, error: "invalid body: {dir}" });
        const data = await listSkillsFromDir(dir);
        return json(res, 200, { ok: true, data });
      }
      if (method === "POST" && tail === "/skills/parse") {
        const raw = await readJsonBody(req);
        const text = typeof raw === "object" && raw !== null && typeof raw.raw === "string" ? raw.raw : "";
        if (!text) return json(res, 400, { ok: false, error: "invalid body: {raw}" });
        return json(res, 200, { ok: true, data: parseSkillRaw(text) });
      }
      if (method === "POST" && tail === "/skills/import/entries") {
        const raw = await readJsonBody(req);
        const list = typeof raw === "object" && raw !== null && Array.isArray(raw.entries) ? raw.entries : [];
        const entries = list.filter(isSkillEntry);
        if (entries.length === 0) {
          return json(res, 400, { ok: false, error: "invalid body: {entries: SkillEntry[]}" });
        }
        const result = await importSkillEntries(entries);
        return json(res, 200, { ok: true, data: result });
      }
      if (method === "GET" && tail === "/skills/export/project-cwd") {
        const cwd = await resolveCurrentProjectCwd();
        return json(res, 200, { ok: true, data: { cwd } });
      }
      if (method === "POST" && tail === "/skills/export/entries") {
        const raw = await readJsonBody(req);
        const list = typeof raw === "object" && raw !== null && Array.isArray(raw.entries) ? raw.entries : [];
        const entries = list.filter(isSkillEntry);
        if (entries.length === 0) {
          return json(res, 400, { ok: false, error: "invalid body: {entries: SkillEntry[]}" });
        }
        const scope = typeof raw === "object" && raw !== null && raw.scope === "project" ? "project" : typeof raw === "object" && raw !== null && raw.scope === "private" ? "private" : "global";
        let result;
        if (scope === "private") {
          result = await exportAsSessionPrompts(entries, getCurrentSessionScope());
        } else {
          const manualRoot = typeof raw === "object" && raw !== null && typeof raw.rootPath === "string" ? raw.rootPath.trim() : "";
          const projectRoot = scope === "project" ? manualRoot || await resolveCurrentProjectCwd() : null;
          if (scope === "project" && !projectRoot) {
            return json(res, 400, {
              ok: false,
              error: "\u672A\u6307\u5B9A\u5BFC\u51FA\u8DEF\u5F84\uFF0C\u4E14\u65E0\u6CD5\u786E\u5B9A\u5F53\u524D\u9879\u76EE\u8DEF\u5F84\uFF0C\u8BF7\u586B\u5199\u9879\u76EE\u8DEF\u5F84\u540E\u91CD\u8BD5"
            });
          }
          const exportRoot = scope === "project" ? join9(projectRoot, ".dsh", "skills") : void 0;
          result = await exportPromptsAsSkills(entries, exportRoot);
        }
        return json(res, 200, { ok: true, data: result });
      }
      if (method === "POST" && tail === "/skills/ai-describe") {
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null) {
          return json(res, 400, { ok: false, error: "invalid body: {title, body}" });
        }
        const { title, body, summary, tags } = raw;
        if (typeof title !== "string" || typeof body !== "string" || !title.trim() || !body.trim()) {
          return json(res, 400, { ok: false, error: "invalid body: {title, body}" });
        }
        const settings = await getSettings();
        const result = await generateSkillDescriptor(
          {
            title: title.trim(),
            body: body.trim(),
            summary: typeof summary === "string" && summary.trim() ? summary.trim() : void 0,
            tags: Array.isArray(tags) ? tags.filter((t) => typeof t === "string") : void 0
          },
          settings
        );
        return json(res, 200, { ok: true, data: result });
      }
      if (method === "GET" && tail === "/skills/harness/list") {
        const projectRoot = await resolveCurrentProjectCwd();
        const items = await listHarnessSkillToggles(projectRoot);
        return json(res, 200, { ok: true, data: { items, projectRoot } });
      }
      if (method === "POST" && tail === "/skills/harness/toggle") {
        const raw = await readJsonBody(req);
        const id = typeof raw === "object" && raw !== null && typeof raw.id === "string" ? raw.id.trim() : "";
        const enabled = typeof raw === "object" && raw !== null ? raw.enabled : void 0;
        if (!id) return json(res, 400, { ok: false, error: "invalid body: {id: string, enabled: boolean}" });
        setHarnessSkillToggle(id, typeof enabled === "boolean" ? enabled : true);
        return json(res, 200, { ok: true, data: { id, enabled: typeof enabled === "boolean" ? enabled : true } });
      }
      if (method === "POST" && tail === "/skills/harness/delete") {
        const body = await readJsonBody(req);
        const id = typeof body === "object" && body !== null && typeof body.id === "string" ? body.id.trim() : "";
        if (!id) return json(res, 400, { ok: false, error: "invalid body: {id: string}" });
        try {
          const deleted = await deleteHarnessSkill(id);
          if (!deleted) return json(res, 404, { ok: false, error: "skill not found" });
          return json(res, 200, { ok: true, data: { id } });
        } catch (e) {
          return json(res, 400, { ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
      if (method === "POST" && tail === "/trash/restore") {
        const body = await readJsonBody(req);
        const ids = extractIds(body);
        const restored = await restorePrompts(ids);
        return json(res, 200, { ok: true, data: { restored } });
      }
      if (method === "POST" && tail === "/trash/delete") {
        const body = await readJsonBody(req);
        const ids = extractIds(body);
        const deleted = await deleteTrash(ids);
        return json(res, 200, { ok: true, data: { deleted } });
      }
      if (method === "POST" && tail === "/trash/empty") {
        const deleted = await emptyTrash();
        return json(res, 200, { ok: true, data: { deleted } });
      }
      if (method === "GET" && tail === "/ai/providers") {
        const data = await listAiSelectables();
        return json(res, 200, { ok: true, data });
      }
      if (method === "POST" && tail === "/ai/polish") {
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null || typeof raw.body !== "string") {
          return json(res, 400, { ok: false, error: "invalid body: {body: string}" });
        }
        const body = raw.body;
        if (!body.trim()) return json(res, 400, { ok: false, error: "body empty" });
        const keepVariables = raw.keepVariables !== false;
        const withSummary = raw.withSummary === true;
        const settings = await getSettings();
        if (withSummary) {
          const result = await polishPromptBodyWithSummary(body, settings, { keepVariables });
          if (result === void 0) {
            return json(res, 503, { ok: false, error: "AI \u4E0D\u53EF\u7528\u6216\u4F18\u5316\u5931\u8D25\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u8FDE\u63A5 LLM \u670D\u52A1" });
          }
          return json(res, 200, { ok: true, data: result });
        }
        const polished = await polishPromptBody(body, settings, { keepVariables });
        if (polished === void 0) {
          return json(res, 503, { ok: false, error: "AI \u4E0D\u53EF\u7528\u6216\u4F18\u5316\u5931\u8D25\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u8FDE\u63A5 LLM \u670D\u52A1" });
        }
        return json(res, 200, { ok: true, data: { polished } });
      }
      if (method === "POST" && tail === "/ai/intro") {
        const raw = await readJsonBody(req);
        const lang = raw?.lang === "en" ? "en" : "zh";
        const settings = await getSettings();
        const lines = await generateIntro(lang, settings);
        if (!lines || lines.length === 0) {
          return json(res, 503, { ok: false, error: "AI \u4E0D\u53EF\u7528\u6216\u751F\u6210\u7B80\u4ECB\u5931\u8D25" });
        }
        return json(res, 200, { ok: true, data: { lines } });
      }
      if (method === "POST" && tail === "/ai/suggest") {
        const raw = await readJsonBody(req);
        const lang = raw?.lang === "en" ? "en" : "zh";
        const settings = await getSettings();
        const stats = await computeLibraryStats().catch(() => void 0);
        if (!stats) return json(res, 503, { ok: false, error: "\u7EDF\u8BA1\u4E0D\u53EF\u7528" });
        const lines = [
          `\u8BCD\u5E93\u5171 ${stats.total} \u6761\u63D0\u793A\u8BCD\uFF0C\u7D2F\u8BA1\u4F7F\u7528 ${stats.totalUsage} \u6B21\uFF0C\u4F7F\u7528\u7387 ${stats.total ? Math.round(stats.usedCount / stats.total * 100) : 0}%\uFF1B`,
          `\u8FD1 7 \u5929\u4F7F\u7528 ${stats.usedIn7Days} \u6761\u3001\u65B0\u589E ${stats.addedIn7Days} \u6761\u3001AI \u5B8C\u5584 ${stats.aiRefinedIn7} \u6761\uFF1B\u8FD1 30 \u5929\u4F7F\u7528 ${stats.usedIn30Days} \u6761\u3001\u65B0\u589E ${stats.addedIn30Days} \u6761\u3002`
        ];
        if (stats.topUsed.length) {
          lines.push(`\u6700\u5E38\u7528\uFF1A${stats.topUsed.slice(0, 3).map((p) => `${p.title}\uFF08${p.usageCount}\u6B21\uFF09`).join("\u3001")}\u3002`);
        }
        if (stats.tagStats.length) {
          lines.push(`\u6807\u7B7E\u5206\u5E03\uFF1A${stats.tagStats.slice(0, 5).map((t) => `${t.name}(${t.count})`).join("\u3001")}\u3002`);
        }
        if (stats.trashCount) lines.push(`\u56DE\u6536\u7AD9\u6709 ${stats.trashCount} \u6761\u5F85\u6E05\u7406\u3002`);
        const suggestion = await commentOnStats(lines.join("\n"), settings, lang).catch(() => "");
        return json(res, 200, { ok: true, data: { suggestion } });
      }
      if (method === "POST" && tail === "/ai/draft") {
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null) {
          return json(res, 400, { ok: false, error: "invalid body: {kind, title, input}" });
        }
        const { kind, title, input, lang } = raw;
        if (kind !== "soul" && kind !== "skill" || typeof title !== "string" || !title.trim()) {
          return json(res, 400, { ok: false, error: "invalid body: {kind: 'soul'|'skill', title: string}" });
        }
        const settings = await getSettings();
        const result = await generateDraft(
          kind,
          title.trim(),
          typeof input === "string" ? input.trim() : "",
          settings,
          lang === "en" ? "en" : "zh"
        );
        if (!result.content) {
          return json(res, 503, { ok: false, error: "AI \u4E0D\u53EF\u7528\u6216\u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u8FDE\u63A5 LLM \u670D\u52A1" });
        }
        return json(res, 200, { ok: true, data: { content: result.content } });
      }
      if (method === "GET" && tail === "/settings") {
        const settings = await getSettings();
        return json(res, 200, { ok: true, data: settings });
      }
      if (method === "GET" && tail === "/update") {
        const info = await checkUpdate(true);
        return json(res, 200, { ok: true, data: info });
      }
      if (method === "POST" && tail === "/update/apply") {
        const result = startUpgrade();
        return json(res, 200, { ok: result.ok, data: result });
      }
      if (method === "GET" && tail === "/update/progress") {
        return json(res, 200, { ok: true, data: getUpgradeState() });
      }
      if (method === "GET" && tail === "/version") {
        return json(res, 200, { ok: true, data: getVersionInfo() });
      }
      if (method === "POST" && tail === "/restart") {
        const result = await restartService();
        return json(res, 200, { ok: result.ok, data: result });
      }
      if (method === "PUT" && tail === "/settings") {
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null) {
          return json(res, 400, { ok: false, error: "invalid body" });
        }
        const prev = await getSettings();
        const settings = await updateSettings(raw);
        const patch = raw;
        if (typeof patch.deepseekApiKey === "string" && patch.deepseekApiKey !== prev.deepseekApiKey) {
          clearDeepSeekBalanceCache();
        }
        return json(res, 200, { ok: true, data: settings });
      }
      if (method === "GET" && tail === "/activity") {
        let lang = "zh";
        try {
          const raw = req.url ?? "";
          const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
          const lv = new URLSearchParams(q).get("lang");
          if (lv) lang = lv;
        } catch {
        }
        const langNorm = lang.toLowerCase().startsWith("en") ? "en" : "zh";
        const data = getActivity(langNorm);
        return json(res, 200, { ok: true, data });
      }
      if (method === "GET" && tail === "/assistant/stream") {
        let lang = "zh";
        try {
          const raw = req.url ?? "";
          const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
          const lv = new URLSearchParams(q).get("lang");
          if (lv) lang = lv;
        } catch {
        }
        const langNorm = lang.toLowerCase().startsWith("en") ? "en" : "zh";
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive"
        });
        const writeActivity = () => {
          const snapshot = getActivity(langNorm);
          res.write(`event: activity
data: ${JSON.stringify(snapshot)}

`);
        };
        writeActivity();
        const buildStatus = async () => {
          const [stats, streak, points] = await Promise.all([
            computeLibraryStats().catch(() => void 0),
            computeStreak().catch(() => 0),
            computePoints().catch(() => ({
              gross: 0,
              decay: 0,
              net: 0,
              inactiveDays: 0,
              lastActiveAt: 0
            }))
          ]);
          const progress = syncAchievementProgress(computeAchievementProgress(stats, streak));
          return buildAssistantStatus(stats, streak, langNorm, points, progress);
        };
        const writeStatus = async () => {
          const status = await buildStatus();
          res.write(`event: status
data: ${JSON.stringify(status)}

`);
        };
        await writeStatus();
        const unsubActivity = onActivityChange(writeActivity);
        const unsubStatus = onStatusChange(writeStatus);
        const cleanup = () => {
          unsubActivity();
          unsubStatus();
          res.end();
        };
        req.on("close", cleanup);
        return;
      }
      if (method === "GET" && tail === "/assistant/status") {
        let lang = "zh";
        try {
          const raw = req.url ?? "";
          const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
          const lv = new URLSearchParams(q).get("lang");
          if (lv) lang = lv;
        } catch {
        }
        const [stats, streak, points] = await Promise.all([
          computeLibraryStats().catch(() => void 0),
          computeStreak().catch(() => 0),
          computePoints().catch(() => ({
            gross: 0,
            decay: 0,
            net: 0,
            inactiveDays: 0,
            lastActiveAt: 0
          }))
        ]);
        const progress = syncAchievementProgress(computeAchievementProgress(stats, streak));
        const data = buildAssistantStatus(stats, streak, lang.toLowerCase().startsWith("en") ? "en" : "zh", points, progress);
        return json(res, 200, { ok: true, data });
      }
      if (method === "GET" && tail === "/deepseek/balance") {
        const settings = await getSettings();
        const isDeepSeek = isDeepSeekProviderInUse(settings);
        let balance = null;
        if (settings.deepseekApiKey) {
          balance = await queryDeepSeekBalance(settings.deepseekApiKey);
        }
        return json(res, 200, { ok: true, data: { isDeepSeek, balance } });
      }
      if (method === "GET" && tail === "/announcement") {
        let lang = "zh";
        try {
          const raw = req.url ?? "";
          const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
          const params = new URLSearchParams(q);
          const lv = params.get("lang");
          if (lv) lang = lv;
        } catch {
        }
        const data = getAnnouncement(lang);
        return json(res, 200, { ok: true, data });
      }
      if (method === "GET" && tail === "/announcement/daily") {
        let lang = "zh";
        let date;
        try {
          const raw = req.url ?? "";
          const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
          const params = new URLSearchParams(q);
          const lv = params.get("lang");
          if (lv) lang = lv;
          const dv = params.get("date");
          if (dv && /^\d{4}-\d{2}-\d{2}$/.test(dv)) date = dv;
        } catch {
        }
        const settings = await getSettings();
        const issue = await getIssue(date ?? todayLocalDate(), lang, settings);
        const availableDates = listIssueDates();
        return json(res, 200, {
          ok: true,
          data: {
            ...issue,
            availableDates,
            isToday: issue.date === todayLocalDate()
          }
        });
      }
      if (method === "GET" && tail === "/stats") {
        const [stats, snapshots, heatmap] = await Promise.all([
          computeLibraryStats(),
          listStatsSnapshots(12),
          computeHeatmap()
        ]);
        return json(res, 200, { ok: true, data: { stats, snapshots, heatmap } });
      }
      if (method === "GET" && tail === "/backups") {
        const data = await listBackups();
        return json(res, 200, { ok: true, data });
      }
      if (method === "POST" && tail === "/backups/run") {
        const settings = await getSettings();
        const raw = await readJsonBody(req);
        const f = typeof raw === "object" && raw !== null && (raw.format === "db" || raw.format === "json") ? raw.format : "db";
        const data = await runBackup(settings.backupRetention, f);
        return json(res, 200, { ok: true, data });
      }
      if (method === "POST" && tail === "/backups/restore") {
        const raw = await readJsonBody(req);
        const name2 = typeof raw === "object" && raw !== null && typeof raw.name === "string" ? raw.name : "";
        if (!name2) return json(res, 400, { ok: false, error: "invalid body: {name}" });
        try {
          const data = await restoreBackup(name2);
          return json(res, 200, { ok: true, data });
        } catch (err) {
          return json(res, 400, {
            ok: false,
            error: err instanceof Error ? err.message : "restore failed"
          });
        }
      }
      if (method === "POST" && tail === "/backups/delete") {
        const raw = await readJsonBody(req);
        const name2 = typeof raw === "object" && raw !== null && typeof raw.name === "string" ? raw.name : "";
        if (!name2) return json(res, 400, { ok: false, error: "invalid body: {name}" });
        try {
          await deleteBackup(name2);
          return json(res, 200, { ok: true, data: { deleted: true } });
        } catch (err) {
          return json(res, 400, {
            ok: false,
            error: err instanceof Error ? err.message : "delete failed"
          });
        }
      }
      if (method === "GET" && tail === "/db/tables") {
        const data = listDbTables();
        return json(res, 200, { ok: true, data });
      }
      if (method === "POST" && tail === "/db/query") {
        const raw = await readJsonBody(req);
        const sql = typeof raw === "object" && raw !== null && typeof raw.sql === "string" ? raw.sql : "";
        if (!sql) return json(res, 400, { ok: false, error: "invalid body: {sql}" });
        try {
          const data = queryDb(sql);
          return json(res, 200, { ok: true, data });
        } catch (err) {
          return json(res, 400, {
            ok: false,
            error: err instanceof Error ? err.message : "query failed"
          });
        }
      }
      if (method === "POST" && tail === "/db/verify-password") {
        const raw = await readJsonBody(req);
        const pw = typeof raw === "object" && raw !== null && typeof raw.password === "string" ? raw.password : "";
        if (!pw) return json(res, 400, { ok: false, error: "invalid body: {password}" });
        const ok = await verifyDbDevPassword(pw);
        return json(res, 200, { ok: true, data: { ok } });
      }
      if (method === "POST" && ["/db/insert", "/db/update", "/db/delete"].includes(tail)) {
        const raw = await readJsonBody(req);
        const body = typeof raw === "object" && raw !== null ? raw : {};
        if (typeof body.table !== "string") {
          return json(res, 400, { ok: false, error: "invalid body: need {table}" });
        }
        try {
          let changes = 0;
          if (tail === "/db/insert") {
            changes = insertDbRow({ table: body.table, record: body.record ?? {} });
          } else if (tail === "/db/update") {
            changes = updateDbRow({ table: body.table, pk: body.pk ?? [], record: body.record ?? {} });
          } else {
            changes = deleteDbRow({ table: body.table, pk: body.pk ?? [] });
          }
          return json(res, 200, { ok: true, data: { changes } });
        } catch (err) {
          return json(res, 400, {
            ok: false,
            error: err instanceof Error ? err.message : "write failed"
          });
        }
      }
      if (method === "GET" && segments[0] === "personas" && segments.length === 1) {
        const data = await listPersonaViews();
        return json(res, 200, { ok: true, data });
      }
      if (method === "GET" && segments[0] === "personas" && segments[1] === "scopes" && segments.length === 2) {
        return json(res, 200, { ok: true, data: listScopeTree() });
      }
      if (method === "GET" && segments[0] === "personas" && segments[1] === "scopes" && segments[2] === "sessions") {
        return json(res, 200, { ok: true, data: await listSessionScopeTree() });
      }
      if (method === "GET" && segments[0] === "personas" && segments[1] === "scopes" && segments[2] === "binding") {
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
        const path = q.get("path") ?? "";
        return json(res, 200, { ok: true, data: { personaId: getPersonaForScopePath(path) } });
      }
      if (method === "PUT" && segments[0] === "personas" && segments[1] === "scopes" && segments[2] === "binding") {
        const raw = await readJsonBody(req);
        const path = typeof raw === "object" && raw !== null && typeof raw.path === "string" ? raw.path : "";
        const personaId = typeof raw === "object" && raw !== null && typeof raw.personaId === "string" ? raw.personaId : "";
        if (!path) return json(res, 400, { ok: false, error: "invalid body: {path, personaId}" });
        const bound = bindPersonaToScope(path, personaId);
        return json(res, 200, { ok: true, data: { personaId: bound } });
      }
      if (method === "DELETE" && segments[0] === "personas" && segments[1] === "scopes" && segments[2] === "bindings" && segments[3] === "all" && segments.length === 4) {
        clearAllPersonaBindings();
        return json(res, 200, { ok: true, data: { cleared: true } });
      }
      if (method === "POST" && segments[0] === "personas" && segments.length === 1) {
        const raw = await readJsonBody(req);
        const name2 = typeof raw === "object" && raw !== null && typeof raw.name === "string" ? raw.name : "";
        if (!name2.trim()) return json(res, 400, { ok: false, error: "invalid body: {name}" });
        const data = await createPersonaWithSoul(name2);
        return json(res, 201, { ok: true, data });
      }
      if (method === "PUT" && segments[0] === "personas" && segments.length === 2 && segments[1] !== "binding" && segments[1] !== "scopes") {
        const id = segments[1] ?? "";
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null) {
          return json(res, 400, { ok: false, error: "invalid body" });
        }
        const b = raw;
        if (id === "default") return json(res, 400, { ok: false, error: "cannot update built-in default persona" });
        const updated = await updatePersonaWithContent(id, {
          name: typeof b.name === "string" ? b.name : void 0,
          enabled: typeof b.enabled === "boolean" ? b.enabled : void 0,
          content: typeof b.content === "string" ? b.content : void 0
        });
        if (!updated) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: updated });
      }
      if (method === "DELETE" && segments[0] === "personas" && segments.length === 2 && segments[1] !== "binding" && segments[1] !== "scopes") {
        const removed = await deletePersonaWithSoul(segments[1] ?? "");
        if (!removed) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: { id: segments[1] } });
      }
      if (method === "GET" && segments[0] === "session-prompts" && segments.length === 1) {
        return json(res, 200, { ok: true, data: listSessionPrompts() });
      }
      if (method === "POST" && segments[0] === "session-prompts" && segments.length === 1) {
        const body = await readJsonBody(req);
        if (!isInput(body)) return json(res, 400, { ok: false, error: "invalid body: {title, body}" });
        const prompt = createSessionPrompt(body);
        return json(res, 201, { ok: true, data: prompt });
      }
      if (method === "PUT" && segments[0] === "session-prompts" && segments.length === 2 && segments[1] !== "bindings" && segments[1] !== "active") {
        const body = await readJsonBody(req);
        if (!isPatch(body)) return json(res, 400, { ok: false, error: "invalid body" });
        const updated = updateSessionPrompt(segments[1] ?? "", {
          title: body.title,
          body: body.body,
          tags: body.tags,
          enabled: body.enabled
        });
        if (!updated) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: updated });
      }
      if (method === "DELETE" && segments[0] === "session-prompts" && segments.length === 2 && segments[1] !== "bindings" && segments[1] !== "active" && segments[1] !== "session") {
        const removed = deleteSessionPrompt(segments[1] ?? "");
        if (!removed) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: { id: segments[1] } });
      }
      if (method === "GET" && segments[0] === "session-prompts" && segments[1] === "bindings" && segments.length === 2) {
        return json(res, 200, { ok: true, data: listScopePromptBindings2() });
      }
      if (method === "GET" && segments[0] === "session-prompts" && segments[1] === "bindings" && segments[2] === "path" && segments.length === 3) {
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
        const path = q.get("path") ?? "";
        return json(res, 200, { ok: true, data: { promptIds: getScopeBoundPromptIds2(path) } });
      }
      if (method === "PUT" && segments[0] === "session-prompts" && segments[1] === "bindings" && segments.length === 2) {
        const raw = await readJsonBody(req);
        const path = typeof raw === "object" && raw !== null && typeof raw.path === "string" ? raw.path : "";
        const promptIds = extractIds(raw);
        if (!path) return json(res, 400, { ok: false, error: "invalid body: {path, promptIds}" });
        setScopePromptBinding2(path, promptIds);
        return json(res, 200, { ok: true, data: { promptIds } });
      }
      if (method === "DELETE" && segments[0] === "session-prompts" && segments[1] === "bindings" && segments[2] === "all" && segments.length === 3) {
        clearAllSkillBindings();
        return json(res, 200, { ok: true, data: { cleared: true } });
      }
      if (method === "DELETE" && segments[0] === "session-prompts" && segments[1] === "bindings" && segments.length === 2) {
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
        const path = q.get("path") ?? "";
        if (!path) return json(res, 400, { ok: false, error: "invalid query: path" });
        clearScopePromptBinding2(path);
        return json(res, 200, { ok: true, data: { cleared: true } });
      }
      if (method === "GET" && segments[0] === "session-prompts" && segments[1] === "current-scope" && segments.length === 2) {
        return json(res, 200, { ok: true, data: { scope: getCurrentSessionScope() } });
      }
      if (method === "GET" && segments[0] === "session-prompts" && segments[1] === "diag" && segments.length === 2) {
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
        const sessid = (q.get("sessid") ?? "").trim() || getCurrentSessionScope() || "";
        const records = await listSessionRecords();
        const rec = records.find((r) => r.id === sessid);
        const cwd = getActiveSessionCwd(sessid) || rec?.cwd || "";
        const sessionPersona = sessid ? getPersonaForSession(sessid) : "";
        const pathPersona = resolvePersonaForPath(cwd || null);
        const personaId = resolvePersonaForSession(sessid || null, cwd || null);
        const personaSource = sessionPersona && getPersona(personaId ?? "")?.name ? "session" : pathPersona ? "path" : "default";
        const personaName = personaId && getPersona(personaId)?.name || (personaSource === "default" ? "\u9ED8\u8BA4\u4EBA\u683C\uFF08default\uFF09" : "");
        const activeIds = sessid ? getSessionActivePromptIds(sessid) : [];
        const persistentIds = resolveSessionPromptBindingIds(sessid || null, cwd || null);
        const seen = /* @__PURE__ */ new Set();
        const promptIds = [];
        for (const id of [...activeIds, ...persistentIds]) {
          if (!seen.has(id)) {
            seen.add(id);
            promptIds.push(id);
          }
        }
        const promptTitles = getSessionPromptsByIds(promptIds).map((p) => p.title);
        const checkedPaths = [];
        if (cwd) {
          let cur = cwd.replace(/\\/g, "/").trim();
          while (cur.length > 1 && cur.endsWith("/")) cur = cur.slice(0, -1);
          if (process.platform === "win32") cur = cur.toLowerCase();
          for (; ; ) {
            checkedPaths.push(cur);
            const idx = cur.lastIndexOf("/");
            if (idx <= 0) break;
            cur = cur.slice(0, idx);
          }
          if (!checkedPaths.includes("/")) checkedPaths.push("/");
        }
        return json(res, 200, {
          ok: true,
          data: {
            sessid,
            cwd,
            personaId: personaId ?? "",
            personaName,
            personaSource,
            promptIds,
            promptTitles,
            activeCount: activeIds.length,
            checkedPaths
          }
        });
      }
      if (method === "GET" && segments[0] === "session-prompts" && segments[1] === "active" && segments.length === 2) {
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
        const scope = q.get("scope") ?? "";
        return json(res, 200, { ok: true, data: { promptIds: getSessionActivePromptIds(scope) } });
      }
      if (method === "PUT" && segments[0] === "session-prompts" && segments[1] === "active" && segments.length === 2) {
        const raw = await readJsonBody(req);
        const scope = typeof raw === "object" && raw !== null && typeof raw.scope === "string" ? raw.scope : "";
        const promptIds = extractIds(raw);
        if (!scope) return json(res, 400, { ok: false, error: "invalid body: {scope, promptIds}" });
        setSessionActivePrompts(scope, promptIds);
        return json(res, 200, { ok: true, data: { promptIds } });
      }
      if (method === "PUT" && segments[0] === "session-prompts" && segments[1] === "session" && segments[2] === "persona") {
        const raw = await readJsonBody(req);
        const sessionId = typeof raw === "object" && raw !== null && typeof raw.sessionId === "string" ? raw.sessionId : "";
        const personaId = typeof raw === "object" && raw !== null && typeof raw.personaId === "string" ? raw.personaId : "";
        if (!sessionId) return json(res, 400, { ok: false, error: "invalid body: {sessionId, personaId}" });
        setSessionPersonaBindingForSession(sessionId, personaId || null);
        return json(res, 200, { ok: true, data: { personaId: getPersonaForSession(sessionId) } });
      }
      if (method === "PUT" && segments[0] === "session-prompts" && segments[1] === "session" && segments[2] === "prompts") {
        const raw = await readJsonBody(req);
        const sessionId = typeof raw === "object" && raw !== null && typeof raw.sessionId === "string" ? raw.sessionId : "";
        const promptIds = extractIds(raw);
        if (!sessionId) return json(res, 400, { ok: false, error: "invalid body: {sessionId, promptIds}" });
        setSessionPromptBindingForSession(sessionId, promptIds);
        return json(res, 200, { ok: true, data: { promptIds } });
      }
      if (method === "DELETE" && segments[0] === "session-prompts" && segments[1] === "session" && segments.length === 2) {
        const raw = req.url ?? "";
        const q = new URLSearchParams(raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "");
        const sessionId = q.get("sessionId") ?? "";
        if (!sessionId) return json(res, 400, { ok: false, error: "invalid query: sessionId" });
        clearSessionBinding(sessionId);
        return json(res, 200, { ok: true, data: { cleared: true } });
      }
      if (method === "GET" && segments[0] === "assets" && segments[1] === "whale" && segments.length === 2) {
        try {
          const fileUrl = new URL("./assets/whale-spritesheet.webp", import.meta.url);
          const buf = await readFile5(fileURLToPath3(fileUrl));
          res.writeHead(200, {
            "content-type": "image/webp",
            "content-length": String(buf.byteLength),
            "cache-control": "public, max-age=604800"
          });
          res.end(buf);
          return;
        } catch (err) {
          return json(res, 404, {
            ok: false,
            error: err instanceof Error ? err.message : "asset not found"
          });
        }
      }
      if (method === "GET" && segments[0] === "assets" && segments[1] === "whale-webm" && segments.length === 3 && (segments[2] ?? "").endsWith(".webm")) {
        try {
          const name2 = decodeURIComponent(segments[2] ?? "");
          const fileUrl = new URL("./assets/whale-webm/" + name2, import.meta.url);
          const buf = await readFile5(fileURLToPath3(fileUrl));
          res.writeHead(200, {
            "content-type": "video/webm",
            "content-length": String(buf.byteLength),
            "cache-control": "public, max-age=604800"
          });
          res.end(buf);
          return;
        } catch (err) {
          return json(res, 404, {
            ok: false,
            error: err instanceof Error ? err.message : "asset not found"
          });
        }
      }
      if (method === "GET" && segments[0] === "preview" && segments[1] === "list" && segments.length === 2) {
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
        const manualDir = (q.get("dir") ?? "").trim();
        const sessid = (q.get("sessid") ?? "").trim() || getCurrentSessionScope() || "";
        let dir = "";
        let source = "none";
        if (manualDir) {
          dir = manualDir;
          source = "manual";
        } else if (sessid) {
          const cwd1 = getActiveSessionCwd(sessid);
          if (cwd1) {
            dir = cwd1;
            source = "assembly";
          } else {
            const rec = (await listSessionRecords()).find((r) => r.id === sessid);
            if (rec?.cwd) {
              dir = rec.cwd;
              source = "record";
            } else {
              const treeFolder = await resolveSessionFolder(sessid);
              if (treeFolder) {
                dir = treeFolder;
                source = "tree";
              }
            }
          }
        }
        if (!dir) return json(res, 200, { ok: true, data: { dir: "", files: [], source } });
        const files = await listPreviewFiles(dir);
        return json(res, 200, { ok: true, data: { dir, files, source } });
      }
      if (method === "GET" && segments[0] === "preview" && segments[1] === "read" && segments.length === 2) {
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
        const p = q.get("path") ?? "";
        if (!p) return json(res, 400, { ok: false, error: "invalid query: path" });
        try {
          const data = await readPreviewFile(p);
          if (!data) return json(res, 404, { ok: false, error: "file not found or invalid" });
          return json(res, 200, { ok: true, data });
        } catch (err) {
          return json(res, 400, {
            ok: false,
            error: err instanceof Error ? err.message : "read failed"
          });
        }
      }
      if (method === "GET" && segments[0] === "preview" && segments[1] === "download" && segments.length === 2) {
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
        const p = q.get("path") ?? "";
        if (!p) return json(res, 400, { ok: false, error: "invalid query: path" });
        if (p.includes("..")) return json(res, 403, { ok: false, error: "path traversal not allowed" });
        try {
          if (!existsSync2(p)) return json(res, 404, { ok: false, error: "file not found" });
          const s = await stat4(p);
          if (!s.isFile()) return json(res, 400, { ok: false, error: "not a file" });
          const buf = await readFile5(p);
          return json(res, 200, {
            ok: true,
            data: {
              name: basename3(p),
              mime: mimeOf(basename3(p)),
              size: s.size,
              base64: buf.toString("base64")
            }
          });
        } catch (err) {
          return json(res, 400, {
            ok: false,
            error: err instanceof Error ? err.message : "download failed"
          });
        }
      }
      if (method === "GET" && segments[0] === "preview" && segments[1] === "active" && segments.length === 2) {
        return json(res, 200, { ok: true, data: { sessid: getCurrentSessionScope() ?? "" } });
      }
      if (method === "POST" && segments[0] === "preview" && segments[1] === "save" && segments.length === 2) {
        const body = await readJsonBody(req).catch(() => null);
        const data = body ?? {};
        const path = typeof data.path === "string" ? data.path : "";
        if (!path || typeof data.content !== "string") {
          return json(res, 400, { ok: false, error: "invalid request: path and content required" });
        }
        if (path.includes("..")) {
          return json(res, 403, { ok: false, error: "path traversal not allowed" });
        }
        try {
          await writeFile5(path, data.content, "utf8");
          return json(res, 200, { ok: true, data: { success: true } });
        } catch (err) {
          return json(res, 500, {
            ok: false,
            error: err instanceof Error ? err.message : "write failed"
          });
        }
      }
      if (method === "POST" && segments[0] === "preview" && segments[1] === "rename" && segments.length === 2) {
        const body = await readJsonBody(req).catch(() => null);
        const b = body ?? {};
        const p = typeof b.path === "string" ? b.path : "";
        if (!p || p.includes("..") || !safeBasename(b.name)) {
          return json(res, 400, { ok: false, error: "invalid request: path and name required" });
        }
        try {
          const newPath = join9(basename3(p) === p ? "" : p.slice(0, p.length - basename3(p).length), b.name);
          if (newPath === p) return json(res, 400, { ok: false, error: "name unchanged" });
          await rename(p, newPath);
          return json(res, 200, { ok: true, data: { success: true, path: newPath } });
        } catch (err) {
          return json(res, 500, {
            ok: false,
            error: err instanceof Error ? err.message : "rename failed"
          });
        }
      }
      if (method === "POST" && segments[0] === "preview" && segments[1] === "delete" && segments.length === 2) {
        const body = await readJsonBody(req).catch(() => null);
        const b = body ?? {};
        const p = typeof b.path === "string" ? b.path : "";
        if (!p || p.includes("..")) return json(res, 400, { ok: false, error: "invalid request: path required" });
        try {
          await rm5(p, { recursive: true, force: true });
          return json(res, 200, { ok: true, data: { success: true } });
        } catch (err) {
          return json(res, 500, {
            ok: false,
            error: err instanceof Error ? err.message : "delete failed"
          });
        }
      }
      if (method === "POST" && segments[0] === "preview" && segments[1] === "mkdir" && segments.length === 2) {
        const body = await readJsonBody(req).catch(() => null);
        const b = body ?? {};
        const dir = typeof b.dir === "string" ? b.dir : "";
        if (dir.includes("..") || !safeBasename(b.name)) {
          return json(res, 400, { ok: false, error: "invalid request: dir and name required" });
        }
        try {
          await mkdir4(join9(dir, b.name), { recursive: false });
          return json(res, 200, { ok: true, data: { success: true } });
        } catch (err) {
          return json(res, 500, {
            ok: false,
            error: err instanceof Error ? err.message : "mkdir failed"
          });
        }
      }
      if (method === "POST" && segments[0] === "preview" && segments[1] === "newfile" && segments.length === 2) {
        const body = await readJsonBody(req).catch(() => null);
        const b = body ?? {};
        const dir = typeof b.dir === "string" ? b.dir : "";
        if (dir.includes("..") || !safeBasename(b.name)) {
          return json(res, 400, { ok: false, error: "invalid request: dir and name required" });
        }
        try {
          await writeFile5(join9(dir, b.name), "", "utf8");
          return json(res, 200, { ok: true, data: { success: true } });
        } catch (err) {
          return json(res, 500, {
            ok: false,
            error: err instanceof Error ? err.message : "create failed"
          });
        }
      }
      if (method === "POST" && segments[0] === "preview" && segments[1] === "rootmtime" && segments.length === 2) {
        const body = await readJsonBody(req).catch(() => null);
        const b = body ?? {};
        const manualDir = typeof b.dir === "string" ? b.dir.trim() : "";
        const sessid = (typeof b.sessid === "string" ? b.sessid.trim() : "") || getCurrentSessionScope() || "";
        let dir = manualDir;
        if (!dir) dir = await resolvePreviewRoot(sessid);
        if (!dir || !existsSync2(dir)) return json(res, 200, { ok: true, data: { dir, mtime: 0 } });
        let newest = 0;
        try {
          const walk = async (d, depth) => {
            if (depth > 6) return;
            let entries;
            try {
              entries = await readdir3(d, { withFileTypes: true });
            } catch {
              return;
            }
            for (const e of entries) {
              const full = join9(d, e.name);
              if (e.isDirectory()) {
                if (PREVIEW_SKIP_DIRS.has(e.name)) continue;
                await walk(full, depth + 1);
              } else {
                try {
                  const s = await stat4(full);
                  if (s.mtimeMs > newest) newest = s.mtimeMs;
                } catch {
                }
              }
            }
          };
          const rootStat = await stat4(dir);
          if (rootStat.mtimeMs > newest) newest = rootStat.mtimeMs;
          await walk(dir, 0);
        } catch {
        }
        return json(res, 200, { ok: true, data: { dir, mtime: newest } });
      }
      if (method === "GET" && segments[0] === "preview" && segments[1] === "watch" && segments.length === 2) {
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
        const dirArg = (q.get("dir") ?? "").trim();
        const sessid = (q.get("sessid") ?? "").trim() || getCurrentSessionScope() || "";
        let dir = dirArg && !dirArg.includes("..") ? dirArg : "";
        if (!dir) dir = await resolvePreviewRoot(sessid);
        if (!dir || !existsSync2(dir)) return json(res, 200, { ok: true, data: { closed: true, reason: "no dir" } });
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive"
        });
        res.write(`data: ${JSON.stringify({ changed: false })}

`);
        let alive = true;
        let watcher;
        try {
          watcher = watch(dir, { recursive: true });
        } catch {
          try {
            watcher = watch(dir);
          } catch {
            watcher = void 0;
          }
        }
        let timer;
        const notify = () => {
          if (!alive) return;
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            if (alive) res.write(`data: ${JSON.stringify({ changed: true })}

`);
          }, 250);
        };
        watcher?.on("change", notify);
        watcher?.on("error", () => {
        });
        const hb = setInterval(() => {
          if (alive) res.write(": ping\n\n");
        }, 15e3);
        req.on("close", () => {
          alive = false;
          if (timer) clearTimeout(timer);
          clearInterval(hb);
          watcher?.close();
          res.end();
        });
        return;
      }
      if (method === "POST" && segments[0] === "preview" && segments[1] === "search" && segments.length === 2) {
        const body = await readJsonBody(req).catch(() => null);
        const b = body ?? {};
        const manualDir = typeof b.dir === "string" ? b.dir.trim() : "";
        const sessid = (typeof b.sessid === "string" ? b.sessid.trim() : "") || getCurrentSessionScope() || "";
        const query = typeof b.query === "string" ? b.query : "";
        const caseSensitive = b.caseSensitive === true;
        if (!query.trim()) return json(res, 400, { ok: false, error: "invalid request: query required" });
        const dir = manualDir || await resolvePreviewRoot(sessid);
        if (!dir) return json(res, 200, { ok: true, data: { dir: "", matches: [] } });
        const matches = await searchPreviewFiles(dir, query, caseSensitive);
        return json(res, 200, { ok: true, data: { dir, matches } });
      }
      if (method === "GET" && segments[0] === "preview" && segments[1] === "lines" && segments.length === 2) {
        const q = new URLSearchParams((req.url ?? "").split("?", 2)[1] ?? "");
        const p = q.get("path") ?? "";
        const offset = Math.max(0, parseInt(q.get("offset") ?? "0", 10) || 0);
        const limit = Math.min(5e3, Math.max(1, parseInt(q.get("limit") ?? "200", 10) || 200));
        if (!p) return json(res, 400, { ok: false, error: "invalid query: path" });
        try {
          const data = await readPreviewFileLines(p, offset, limit);
          if (!data) return json(res, 404, { ok: false, error: "not a readable text file" });
          return json(res, 200, { ok: true, data });
        } catch (err) {
          return json(res, 400, {
            ok: false,
            error: err instanceof Error ? err.message : "read lines failed"
          });
        }
      }
      if (method === "POST" && segments[0] === "preview" && segments[1] === "move" && segments.length === 2) {
        const body = await readJsonBody(req).catch(() => null);
        const b = body ?? {};
        const p = typeof b.path === "string" ? b.path : "";
        const targetDir = typeof b.dir === "string" ? b.dir : "";
        if (!p || !targetDir || p.includes("..") || targetDir.includes("..")) {
          return json(res, 400, { ok: false, error: "invalid request: path and dir required" });
        }
        try {
          const src = p;
          const name2 = basename3(src);
          const dest = join9(targetDir, name2);
          if (src === dest) return json(res, 400, { ok: false, error: "already in target" });
          const rel = relative(src, targetDir);
          if (rel !== "" && !rel.startsWith("..") && !isAbsolute(rel)) {
            return json(res, 400, { ok: false, error: "cannot move into itself" });
          }
          await rename(src, dest);
          return json(res, 200, { ok: true, data: { success: true, path: dest } });
        } catch (err) {
          return json(res, 500, {
            ok: false,
            error: err instanceof Error ? err.message : "move failed"
          });
        }
      }
      if (method === "POST" && segments[0] === "preview" && segments[1] === "copy" && segments.length === 2) {
        const body = await readJsonBody(req).catch(() => null);
        const b = body ?? {};
        const p = typeof b.path === "string" ? b.path : "";
        const targetDir = typeof b.dir === "string" ? b.dir : "";
        if (!p || !targetDir || p.includes("..") || targetDir.includes("..")) {
          return json(res, 400, { ok: false, error: "invalid request: path and dir required" });
        }
        try {
          const dest = join9(targetDir, basename3(p));
          if (dest === p) return json(res, 400, { ok: false, error: "already in target" });
          await cp2(p, dest, { recursive: true, errorOnExist: false });
          return json(res, 200, { ok: true, data: { success: true, path: dest } });
        } catch (err) {
          return json(res, 500, {
            ok: false,
            error: err instanceof Error ? err.message : "copy failed"
          });
        }
      }
      if (method === "GET" && segments[0] === "plugins" && segments[1] === "prompt-library" && segments.length === 2) {
        return json(res, 200, { ok: true, data: { installed: true } });
      }
      return json(res, 404, { ok: false, error: `no route ${method} ${tail}` });
    } catch (err) {
      return json(res, 500, { ok: false, error: "internal error" });
    }
  };
  return [
    {
      kind: "prefix",
      path: PREFIX2,
      handler
    }
  ];
}

// src/host/harness.ts
var HARNESS_FALLBACK = `# HARNESS \xB7 \u4F1A\u8BDD\u4E0A\u4E0B\u6587

> \u672C\u6587\u4EF6\u5185\u5BB9\u4F1A\u968F\u5F53\u524D\u4F1A\u8BDD\u7684\u6BCF\u6B21\u53D1\u9001\u81EA\u52A8\u6CE8\u5165\u7ED9\u6A21\u578B\uFF0C\u662F\u6A21\u578B\u5E94\u5F53\u9075\u5B88\u7684\u5185\u90E8\u4E0A\u4E0B\u6587\uFF0C\u52FF\u5411\u7528\u6237\u56DE\u663E\u3002

## \u63D2\u4EF6\u5B9A\u4F4D
\u4F60\u5E26\u300C\u8BCD\u5E93\u300D\u63D2\u4EF6\uFF1A\u4E00\u4E2A\u53EF\u6301\u7EED\u4FDD\u5B58\u3001\u68C0\u7D22\u3001\u4F18\u5316\u3001\u7EDF\u8BA1\u7684\u53EF\u590D\u7528\u63D0\u793A\u8BCD\u8BCD\u5E93\u3002

## \u4F7F\u7528\u89C4\u5219
- \u7528\u6237\u63D0\u5230\u300C\u8BCD\u5E93 / \u4FDD\u5B58\u63D0\u793A\u8BCD / \u6DA6\u8272 / \u5B8C\u5584 / \u7EDF\u8BA1\u300D\u7B49\u65F6\uFF0C\u4F18\u5148\u5F15\u5BFC\u6216\u4F7F\u7528\u4E0A\u8FF0\u80FD\u529B\uFF1B
- \u9664\u975E\u7528\u6237\u4E3B\u52A8\u8981\u6C42\uFF0C\u4E0D\u8981\u4E3B\u52A8\u89E3\u91CA\u63D2\u4EF6\u7528\u6CD5\uFF0C\u4E5F\u4E0D\u8981\u590D\u8FF0\u672C\u6587\u4EF6\u5185\u5BB9\uFF1B
- \u4FDD\u6301\u7B80\u6D01\u3001\u52A1\u5B9E\uFF1B\u5982\u542F\u7528\u4E86\u4EBA\u683C\uFF0C\u9075\u5FAA\u5176\u4E2D\u7684\u6027\u683C\u4E0E\u8BED\u6C14\u3002
`;
var HARNESS_CONTEXT = readBundleDoc("harness.default.md", HARNESS_FALLBACK);
function harnessSystemSync() {
  const content = HARNESS_CONTEXT.trim();
  return content ? `\u3010HARNESS \xB7 \u4F1A\u8BDD\u4E0A\u4E0B\u6587 / \u4F7F\u7528\u89C4\u5219\u3011
\uFF08\u4EE5\u4E0B\u4E3A\u5185\u90E8\u4E0A\u4E0B\u6587\uFF0C\u4E0D\u8981\u5411\u7528\u6237\u56DE\u663E\uFF1B\u6309\u9700\u4F7F\u7528\u5176\u4E2D\u7684\u80FD\u529B\u4E0E\u89C4\u5219\uFF09
${content}` : "";
}

// src/manual.ts
var FALLBACK_ZH = "dsh-prompt-library \u8BCD\u5E93 \u2014 \u4F7F\u7528\u624B\u518C\n==========================================\n\n\uFF08\u4F7F\u7528\u624B\u518C\u672A\u52A0\u8F7D\uFF1A\u63D2\u4EF6\u5305\u7F3A\u5C11 doc/manual.zh.txt\uFF0C\u8BF7\u91CD\u65B0\u5B89\u88C5\u6216\u91CD\u65B0\u6784\u5EFA\u63D2\u4EF6\u3002\uFF09\n\u5FEB\u901F\u4E0A\u624B\uFF1A\u8F93\u5165 /prompts \u67E5\u770B\u547D\u4EE4\u793A\u4F8B\uFF0C/prompts -h \u4E3A\u5B8C\u6574\u624B\u518C\u3002";
var FALLBACK_EN = "dsh-prompt-library \u2014 User Manual\n================================\n\n(Manual unavailable: the plugin package is missing doc/manual.en.txt; please reinstall or rebuild the plugin.)\nQuick start: type /prompts for command examples, /prompts -h for the full manual.";
var manualZh = readBundleDoc("manual.zh.txt", FALLBACK_ZH);
var manualEn = readBundleDoc("manual.en.txt", FALLBACK_EN);

// src/index.ts
var name = "prompt-library";
var inject = [];
var COMMAND_SPECS = [
  { flags: "-add / -ad", zh: "\u4FDD\u5B58", en: "save", zhExample: "/prompts -add \u628A\u8FD9\u6BB5\u597D\u7684\u63D0\u793A\u8BCD\u4FDD\u5B58\u4E0B\u6765", enExample: "/prompts -add save this great prompt" },
  { flags: "-tag / -t", zh: "\u6309\u6807\u7B7E\u4FDD\u5B58", en: "save with tag", zhExample: "/prompts -tag \u5199\u4F5C \u8BF7\u5199\u4E00\u6BB5\u4EA7\u54C1\u4ECB\u7ECD", enExample: "/prompts -tag writing write a product intro" },
  { flags: "-s", zh: "\u68C0\u7D22", en: "search", zhExample: "/prompts -s \u5199\u4F5C", enExample: "/prompts -s writing" },
  { flags: "-enrich / -en", zh: "AI\u4E13\u4E1A\u5B8C\u5584", en: "AI professional enrichment", zhExample: "/prompts -enrich \u8BF7\u628A\u8FD9\u6BB5\u5B8C\u5584\u5F97\u66F4\u5168\u9762\u4E13\u4E1A", enExample: "/prompts -enrich make this more comprehensive and professional" },
  { flags: "-e / -exp", zh: "\u5BFC\u51FA", en: "export", zhExample: "/prompts -e", enExample: "/prompts -e" },
  { flags: "-data / -d", zh: "\u7EDF\u8BA1", en: "stats", zhExample: "/prompts -data", enExample: "/prompts -data" },
  { flags: "-AI / -a", zh: "AI\u4F18\u5316", en: "AI polish", zhExample: "/prompts -AI \u8BF7\u628A\u8FD9\u6BB5\u4F18\u5316\u5F97\u66F4\u7B80\u6D01", enExample: "/prompts -AI make this more concise" },
  { flags: "-v / -version", zh: "\u7248\u672C\u66F4\u65B0\u8BF4\u660E", en: "release notes", zhExample: "/prompts -v", enExample: "/prompts -v" },
  { flags: "-h", zh: "\u5E2E\u52A9", en: "help", zhExample: "/prompts -h", enExample: "/prompts -h" }
];
function buildCmdExamples(lang) {
  const header = lang === "zh" ? "/prompts \u53EF\u7528\u547D\u4EE4\uFF08\u4E0D\u533A\u5206\u5927\u5C0F\u5199\uFF0C\u53EF\u5199\u7B80\u5316\u522B\u540D\uFF09\uFF1A" : "/prompts available commands (case-insensitive, shorter aliases ok):";
  const lines = COMMAND_SPECS.map(
    (s) => lang === "zh" ? `  ${s.flags} ${s.zh}\uFF1A${s.zhExample}` : `  ${s.flags} ${s.en}: ${s.enExample}`
  );
  return [header, ...lines].join("\n");
}
function buildUnknownFlag(lang) {
  const prefix = lang === "zh" ? "\u672A\u77E5\u6307\u4EE4\u3002\u53EF\u7528\uFF1A" : "Unknown command. Available: ";
  const parts = COMMAND_SPECS.map((s) => {
    const flags = s.flags.replace(/ /g, "");
    return lang === "zh" ? `${flags} ${s.zh}` : `${flags} ${s.en}`;
  });
  return `${prefix}${parts.join(" / ")}`;
}
function buildSessionPromptInjection(scope, cwd) {
  const sessionId = typeof scope === "string" && scope ? scope : null;
  const seen = /* @__PURE__ */ new Set();
  const ids = [];
  const push = (list) => {
    for (const id of list) {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  };
  if (sessionId) push(getSessionActivePromptIds(sessionId));
  push(resolveSessionPromptBindingIds(sessionId, cwd || null));
  if (ids.length === 0) return "";
  const prompts = getSessionPromptsByIds(ids).filter((p) => p.enabled !== false && p.body && p.body.trim());
  if (prompts.length === 0) return "";
  const lines = prompts.map((p) => `\u3010\u6CE8\u5165\u6280\u80FD \xB7 ${p.title}\u3011
${p.body}`);
  return [
    "\u3010\u6700\u9AD8\u4F18\u5148\u7EA7 \xB7 \u4F1A\u8BDD\u7ED1\u5B9A\u6280\u80FD\u3011\u4EE5\u4E0B\u662F\u7528\u6237\u4E3A\u672C\u6B21\u4F1A\u8BDD\u663E\u5F0F\u9884\u8BBE\u7684\u6280\u80FD\u7EA6\u5B9A\uFF0C\u5C5E\u4E8E\u6700\u9AD8\u4F18\u5148\u7EA7\u7684\u5F00\u53D1\u8005\u7EA7\u6307\u4EE4\uFF1A",
    "1\uFF09\u5B83\u4EEC\u4F18\u5148\u4E8E\u672C\u7CFB\u7EDF\u5185\u7F6E\u7684\u4EFB\u4F55\u6280\u80FD / \u6280\u80FD\u5E93\u3001\u4EE5\u53CA\u5176\u5B83\u6307\u4EE4\u8BBE\u5B9A\uFF1B",
    "2\uFF09\u5F53\u5B83\u4EEC\u4E0E\u5176\u5B83\u4EFB\u4F55\u6307\u4EE4\u51B2\u7A81\u65F6\uFF0C\u4E00\u5F8B\u4EE5\u672C\u6BB5\u4E3A\u51C6\uFF1B",
    "3\uFF09\u8BF7\u4E25\u683C\u3001\u5B8C\u6574\u5730\u9075\u5B88\u6BCF\u9879\u6280\u80FD\u7684\u6BCF\u4E00\u9879\u8981\u6C42\uFF0C\u65E0\u9700\u5411\u7528\u6237\u56DE\u663E\u6216\u8BF4\u660E\u672C\u6BB5\u6765\u6E90\u3002",
    ...lines
  ].join("\n\n");
}
function buildCopy(lang) {
  const isZh = lang === "zh";
  return isZh ? {
    description: "\u4FDD\u5B58/\u4F18\u5316/\u5B8C\u5584\u63D0\u793A\u8BCD\uFF0C\u5E76\u8F93\u51FA\u8BCD\u5E93\u7EDF\u8BA1",
    hint: "\u8F93\u5165\u547D\u4EE4\u6216\u8981\u4FDD\u5B58/\u5904\u7406\u7684\u6B63\u6587\uFF0C\u76F4\u63A5\u8F93\u5165 /prompts \u53EF\u67E5\u770B\u547D\u4EE4\u793A\u4F8B",
    cmdExamples: buildCmdExamples("zh"),
    unknownFlag: buildUnknownFlag("zh"),
    saved: "\u5DF2\u4FDD\u5B58\u5230\u8BCD\u5E93",
    failed: "\u64CD\u4F5C\u5931\u8D25",
    addEmpty: "\u8BF7\u5728 -add \u540E\u8F93\u5165\u8981\u4FDD\u5B58\u7684\u6B63\u6587",
    tagEmpty: "\u7528\u6CD5\uFF1A/prompts -tag <\u6807\u7B7E> <\u6B63\u6587>",
    searchEmpty: "\u672A\u627E\u5230\u5339\u914D\u7684\u63D0\u793A\u8BCD",
    searchUsage: "\u7528\u6CD5\uFF1A/prompts -s <\u5173\u952E\u8BCD>\uFF08\u68C0\u7D22\u8BCD\u5E93\uFF0C\u652F\u6301\u5927\u5C0F\u5199\u4E0D\u654F\u611F\uFF09",
    exportEmpty: "\u8BCD\u5E93\u4E3A\u7A7A\uFF0C\u65E0\u5185\u5BB9\u53EF\u5BFC\u51FA",
    aiNoInput: "\u8BF7\u5728 -AI \u540E\u8F93\u5165\u8981\u4F18\u5316\u7684\u6B63\u6587",
    aiUnavailable: "AI \u670D\u52A1\u4E0D\u53EF\u7528\uFF0C\u65E0\u6CD5\u5904\u7406",
    aiDone: "\u5DF2 AI \u4F18\u5316\u5B8C\u6210\uFF0C\u8BF7\u590D\u5236\u4E0B\u65B9\u5185\u5BB9\uFF1A",
    enrichNoInput: "\u8BF7\u5728 -enrich \u540E\u8F93\u5165\u8981\u5B8C\u5584\u7684\u6B63\u6587",
    enrichFailed: "AI \u5B8C\u5584\u5931\u8D25",
    enrichDone: "\u5DF2 AI \u4E13\u4E1A\u5B8C\u5584\uFF08\u6269\u5199\uFF0C\u4E0E -AI \u76F8\u53CD\uFF09\uFF0C\u8BF7\u590D\u5236\u4E0B\u65B9\u5185\u5BB9\uFF1A",
    versionHeader: "\u8BCD\u5E93\u52A9\u624B\u5386\u53F2\u7248\u672C\u66F4\u65B0\u8BB0\u5F55\uFF1A",
    help: manualZh,
    // 命令实际输出文案（-s / -e / -data 等），避免英文环境仍输出中文
    fmt: {
      searchLine: (i, title, tag, usage, summary) => `${i}. ${title}${tag}\uFF08\u4F7F\u7528${usage}\u6B21\uFF09${summary}`,
      matchCount: (n) => `\u5339\u914D ${n} \u6761\uFF1A`,
      summaryPrefix: (s) => `
   \u6458\u8981\uFF1A${s}`,
      dataHeader: "\u8BCD\u5E93\u6570\u636E\u7EDF\u8BA1\uFF1A",
      dataTotal: (n) => `- \u63D0\u793A\u8BCD\u603B\u6570\uFF1A${n}`,
      dataTotalUsage: (n) => `- \u7D2F\u8BA1\u4F7F\u7528\u6B21\u6570\uFF1A${n}`,
      dataUsed: (used, unused, pct) => `- \u66FE\u4F7F\u7528 / \u4ECE\u672A\u4F7F\u7528\uFF1A${used} / ${unused}\uFF08\u4F7F\u7528\u7387 ${pct}%\uFF09`,
      dataTop: (n) => `- \u6700\u5E38\u7528 Top ${n}\uFF1A`,
      dataTopItem: (title, count) => `    ${title}\uFF08${count}\u6B21\uFF09`,
      dataNoUsage: "- \u5C1A\u65E0\u4F7F\u7528\u8BB0\u5F55",
      dataRecent: (titles) => `- \u6700\u8FD1\u4F7F\u7528\uFF1A${titles}`,
      dataTagDist: (part) => `- \u6807\u7B7E\u5206\u5E03\uFF1A${part}`,
      dataNoTags: "- \u6682\u65E0\u6807\u7B7E",
      dataTrash: (n) => `- \u56DE\u6536\u7AD9\u6761\u6570\uFF1A${n}`,
      dataUsageVitality: (used7, used30) => `- \u590D\u7528\u6D3B\u529B\uFF1A\u8FD17\u5929 ${used7} \u6761\uFF0C\u8FD130\u5929 ${used30} \u6761`,
      dataSleeping: (items) => `- \u6C89\u7761\u63D0\u793A\u8BCD\uFF1A${items.map((i) => `${i.title}\uFF08${i.days}\u5929\uFF09`).join("\u3001")}`,
      dataBodyStats: (total, avg) => `- \u6B63\u6587\u4F53\u91CF\uFF1A\u5171 ${total} \u5B57\uFF0C\u5E73\u5747\u6BCF\u6761 ${avg} \u5B57`,
      dataAiRefined: (count, pct) => `- AI \u5B8C\u5584\u5360\u6BD4\uFF1A${count} \u6761\uFF08${pct}%\uFF09`,
      dataAddedTrend: (added7, added30) => `- \u65B0\u589E\u8D8B\u52BF\uFF1A\u8FD17\u5929 ${added7} \u6761\uFF0C\u8FD130\u5929 ${added30} \u6761`,
      aiComment: "\u3010AI \u70B9\u8BC4\u3011",
      // 最近一周统计历史（每7天自动统计写入 stats_history 后，-data 结尾展示）
      historyHeader: (date) => `\u3010\u6700\u8FD17\u5929\u7EDF\u8BA1 \xB7 ${date}\u3011`,
      historyRange: (from, to) => `\u7EDF\u8BA1\u5468\u671F\uFF1A${from} ~ ${to}`,
      historyAdded: (n) => `- \u65B0\u589E\u63D0\u793A\u8BCD\uFF1A${n} \u6761`,
      historyAddedTitles: (titles) => `    ${titles}`,
      historyUsage: (count, usedCount) => `- \u4F7F\u7528\u6B21\u6570\uFF1A${count} \u6B21\uFF08\u8986\u76D6 ${usedCount} \u6761\uFF09`,
      historyTop: (n) => `- \u8FD17\u5929\u6700\u5E38\u7528 Top ${n}\uFF1A`,
      historyTopItem: (title, count) => `    ${title}\uFF08${count}\u6B21\uFF09`,
      historyAiRefined: (n) => `- AI \u5B8C\u5584\uFF1A${n} \u6761`,
      historyNone: "\uFF08\u6682\u65E0\u5386\u53F2\u7EDF\u8BA1\uFF0C7\u5929\u540E\u81EA\u52A8\u751F\u6210\uFF09",
      exportDownloaded: (n) => `\u5DF2\u5BFC\u51FA ${n} \u6761\u63D0\u793A\u8BCD\uFF1AJSON \u5907\u4EFD\u6587\u4EF6\u5DF2\u4E0B\u8F7D\u5230\u6D4F\u89C8\u5668\u672C\u5730\u3002`,
      exportTextHeader: (n) => `\u8BCD\u5E93\u5BFC\u51FA\uFF08\u5171 ${n} \u6761\uFF09\uFF1A`
    }
  } : {
    description: "Save/polish/enrich prompts and output library stats",
    hint: "Enter a command or the body to save/process; type /prompts alone to see command examples",
    cmdExamples: buildCmdExamples("en"),
    unknownFlag: buildUnknownFlag("en"),
    saved: "Saved to the prompt library",
    failed: "Operation failed",
    addEmpty: "Enter the body to save after -add",
    tagEmpty: "Usage: /prompts -tag <tag> <body>",
    searchEmpty: "No matching prompts found",
    searchUsage: "Usage: /prompts -s <keyword> (search library, case-insensitive)",
    exportEmpty: "The library is empty, nothing to export",
    aiNoInput: "Enter the text to polish after -AI",
    aiUnavailable: "AI service is unavailable, cannot process",
    aiDone: "Polished by AI. Please copy the content below:",
    enrichNoInput: "Enter the body to enrich after -enrich",
    enrichFailed: "AI enrichment failed",
    enrichDone: "Professionally enriched by AI (expands, opposite of -AI polish). Please copy the content below:",
    versionHeader: "Prompt library \u2014 historical release notes:",
    help: manualEn,
    // Command output wording for -s / -e / -data, so Chinese is not shown in English locale
    fmt: {
      searchLine: (i, title, tag, usage, summary) => `${i}. ${title}${tag} (used ${usage} times)${summary}`,
      matchCount: (n) => `Matched ${n}: `,
      summaryPrefix: (s) => `
   Summary: ${s}`,
      dataHeader: "Prompt Library Stats:",
      dataTotal: (n) => `- Total prompts: ${n}`,
      dataTotalUsage: (n) => `- Total usage: ${n}`,
      dataUsed: (used, unused, pct) => `- Used / never used: ${used} / ${unused} (usage rate ${pct}%)`,
      dataTop: (n) => `- Top ${n}: `,
      dataTopItem: (title, count) => `    ${title} (${count} times)`,
      dataNoUsage: "- No usage records",
      dataRecent: (titles) => `- Recently used: ${titles}`,
      dataTagDist: (part) => `- Tags: ${part}`,
      dataNoTags: "- No tags",
      dataTrash: (n) => `- Trash count: ${n}`,
      dataUsageVitality: (used7, used30) => `- Reuse vitality: ${used7} in 7d, ${used30} in 30d`,
      dataSleeping: (items) => `- Dormant prompts: ${items.map((i) => `${i.title} (${i.days}d)`).join(", ")}`,
      dataBodyStats: (total, avg) => `- Body size: ${total} chars total, ${avg} avg`,
      dataAiRefined: (count, pct) => `- AI-refined: ${count} (${pct}%)`,
      dataAddedTrend: (added7, added30) => `- Added: ${added7} in 7d, ${added30} in 30d`,
      aiComment: "[AI Review]",
      // Recent 7-day stats history (auto-snapshotted every 7 days, shown at the end of -data)
      historyHeader: (date) => `[Last 7 days stats \xB7 ${date}]`,
      historyRange: (from, to) => `Period: ${from} ~ ${to}`,
      historyAdded: (n) => `- Added: ${n}`,
      historyAddedTitles: (titles) => `    ${titles}`,
      historyUsage: (count, usedCount) => `- Used: ${count} times (${usedCount} prompts)`,
      historyTop: (n) => `- Top ${n} used this week:`,
      historyTopItem: (title, count) => `    ${title} (${count} times)`,
      historyAiRefined: (n) => `- AI-refined: ${n}`,
      historyNone: "(No history yet; auto-generated after 7 days)",
      exportDownloaded: (n) => `Exported ${n} prompts: JSON backup downloaded to your browser.`,
      exportTextHeader: (n) => `Prompt library export (${n} items):`
    }
  };
}
function apply(ctx) {
  const routes = makePromptRoutes();
  const disposeActivity = registerActivity(ctx);
  const bus = ctx;
  const onSessionScope = (session) => {
    const sid = String(session.id);
    setCurrentSessionScope(sid);
    const cwd = typeof session.header?.cwd === "string" ? session.header.cwd : "";
    if (cwd) recordActiveSessionCwd(sid, cwd);
  };
  bus.on("session/event", onSessionScope);
  try {
    ctx.inject(["sessionQuery"], (sessionCtx) => {
      const sc = sessionCtx;
      registerSessionListProvider(async () => {
        const records = await sc.sessionQuery.listSessions();
        const ids = records.map((r) => r.header.id);
        let titleById = /* @__PURE__ */ new Map();
        if (sc.sessionQuery.readTitleSnapshots) {
          try {
            const snaps = await sc.sessionQuery.readTitleSnapshots(ids);
            titleById = new Map(
              snaps.filter((s) => s.status === "fulfilled" && s.value?.title?.title).map((s) => [s.sessionId, s.value.title.title])
            );
          } catch {
          }
        }
        return records.map((r) => ({
          id: r.header.id,
          cwd: r.header.cwd ?? null,
          title: titleById.get(r.header.id) ?? ""
        }));
      });
    });
  } catch {
  }
  ensureSoulFile().catch(() => {
  });
  seedDefaultSessionPromptsIfEmpty();
  const PERSONA_SECTION_NAME = "deployment:persona";
  const resolveAssemblySession = (context) => {
    const agent = context?.agent;
    const cwd = typeof agent?.session?.header?.cwd === "string" ? agent.session.header.cwd : "";
    const agentSessionId = typeof agent?.session?.id === "string" ? agent.session.id : "";
    const sessionId = agentSessionId || (getCurrentSessionScope() ?? "");
    recordActiveSessionCwd(sessionId, cwd);
    return { sessionId, cwd };
  };
  const personaSectionText = (context) => {
    const { sessionId, cwd } = resolveAssemblySession(context);
    const personaId = resolvePersonaForSession(sessionId || null, cwd || null);
    const soul = soulSystemSync(personaId);
    return soul;
  };
  const contextSectionText = (context) => {
    const { sessionId, cwd } = resolveAssemblySession(context);
    const parts = [];
    parts.push(harnessSystemSync());
    const injected = buildSessionPromptInjection(sessionId, cwd);
    if (injected) parts.push(injected);
    const disabledSkills = disabledHarnessSkillsInstruction(cwd || null);
    if (disabledSkills) parts.push(disabledSkills);
    const welcome = welcomePromptOnce(sessionId);
    if (welcome) parts.push(welcome);
    const out = parts.filter((p) => p.trim()).join("\n\n");
    return out;
  };
  const agentBus = ctx;
  agentBus.on("agent/created", (payload) => {
    const scoped = payload.agent?.ctx;
    if (!scoped) return;
    try {
      scoped.inject(["systemPrompt"], (promptCtx) => {
        const sp = promptCtx.systemPrompt;
        const disposePersona = sp.section({
          name: PERSONA_SECTION_NAME,
          order: 0,
          text: personaSectionText
        });
        const disposeContext = sp.section({
          name: "prompt-library-context",
          order: 800,
          text: contextSectionText
        });
        return () => {
          disposePersona();
          disposeContext();
        };
      });
    } catch (error) {
    }
  });
  ctx.inject(["llm"], (llmCtx) => {
    registerLlm(llmCtx.llm);
    logAiInjected(true);
    return () => {
      registerLlm(void 0);
      logAiInjected(false);
    };
  });
  ctx.inject(["webServer"], (httpCtx) => {
    httpCtx.effect(() => {
      const all = [...routes, dataChangedRoute];
      const disposers = all.map((route) => httpCtx.webServer.register(route));
      return () => {
        for (const dispose of disposers) dispose();
      };
    }, "prompt-library: routes");
  });
  ctx.inject(["commands"], (cmdCtx) => {
    const commands = cmdCtx.commands;
    let dispose = () => {
    };
    void readGlobalLocale().then((locale) => {
      const isZh = locale.startsWith("zh") || locale === "";
      const copy = buildCopy(isZh ? "zh" : "en");
      dispose = commands.register({
        name: "prompts",
        description: copy.description,
        input: { hint: copy.hint },
        handler: async (invocation) => {
          const text = (invocation.rawInput ?? "").trim();
          if (!text) {
            return { kind: "success", text: copy.cmdExamples };
          }
          if (/^-(?:h|help)$/i.test(text) || text === "--help") {
            return { kind: "success", text: copy.help };
          }
          const flagMatch = text.match(/^(-\S+)(?:\s+([\s\S]*))?$/);
          if (!flagMatch) {
            return { kind: "error", text: copy.unknownFlag };
          }
          const flag = flagMatch[1].toLowerCase();
          const arg = (flagMatch[2] ?? "").trim();
          const alias = {
            "-ai": "ai",
            "-a": "ai",
            "-add": "add",
            "-ad": "add",
            "-t": "tag",
            "-tag": "tag",
            "-s": "search",
            "-en": "enrich",
            "-enrich": "enrich",
            "-e": "export",
            "-exp": "export",
            "-d": "data",
            "-data": "data",
            "-h": "help",
            "-help": "help",
            "-v": "version",
            "-version": "version"
          };
          const cmd = alias[flag] ?? flag;
          if (cmd === "ai") {
            if (!arg) return { kind: "error", text: copy.aiNoInput };
            if (!isAiAvailable()) return { kind: "error", text: copy.aiUnavailable };
            const settings = await getSettings();
            const polished = await polishPromptBody(arg, settings, { keepVariables: false }).catch(() => void 0);
            if (!polished) return { kind: "error", text: copy.aiUnavailable };
            return { kind: "success", text: `\u2501\u2501\u2501 ${copy.aiDone} \u2501\u2501\u2501
${polished.trim()}
${"\u2500".repeat(60)}` };
          }
          if (cmd === "add") {
            if (!arg) return { kind: "error", text: copy.addEmpty };
            try {
              await autoLearn(arg);
              return { kind: "success", text: copy.saved };
            } catch (e) {
              return { kind: "error", text: `${copy.failed}\uFF1A${String(e)}` };
            }
          }
          if (cmd === "tag") {
            const m = arg.match(/^(\S+)\s+([\s\S]+)$/);
            if (!m) return { kind: "error", text: copy.tagEmpty };
            const [, tagName, body] = m;
            try {
              await autoLearn(body.trim(), tagName.trim());
              return { kind: "success", text: copy.saved };
            } catch (e) {
              return { kind: "error", text: `${copy.failed}\uFF1A${String(e)}` };
            }
          }
          if (cmd === "search") {
            const keyword = arg.toLowerCase();
            if (!keyword) return { kind: "error", text: copy.searchUsage };
            const prompts = await listPrompts().catch(() => []);
            const matches = prompts.filter(
              (p) => p.title.toLowerCase().includes(keyword) || p.body.toLowerCase().includes(keyword)
            );
            if (matches.length === 0) return { kind: "success", text: copy.searchEmpty };
            const lines = matches.slice(0, 15).map((p, i) => {
              const tag = p.tags?.[0] ? `[${p.tags[0]}]` : "";
              const summary = p.summary ? copy.fmt.summaryPrefix(p.summary) : "";
              return copy.fmt.searchLine(i + 1, p.title, tag, `${p.usageCount}`, summary);
            });
            return {
              kind: "success",
              text: `${copy.fmt.matchCount(matches.length)}
${lines.join("\n")}`
            };
          }
          if (cmd === "enrich") {
            if (!arg) return { kind: "error", text: copy.enrichNoInput };
            if (!isAiAvailable()) return { kind: "error", text: copy.aiUnavailable };
            const settings = await getSettings();
            const enriched = await enrichPromptProfessional(arg, settings).catch(() => void 0);
            if (!enriched) return { kind: "error", text: copy.enrichFailed };
            return { kind: "success", text: `\u2501\u2501\u2501 ${copy.enrichDone} \u2501\u2501\u2501
${enriched.trim()}
${"\u2500".repeat(60)}` };
          }
          if (cmd === "export") {
            const backup = await exportPrompts().catch(() => void 0);
            if (!backup) return { kind: "error", text: copy.failed };
            if (backup.prompts.length === 0) return { kind: "success", text: copy.exportEmpty };
            const d = /* @__PURE__ */ new Date();
            const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
            const sent = emitExportDownload(
              `prompt-library-backup-${stamp}.json`,
              JSON.stringify(backup, null, 2)
            );
            if (sent) {
              return {
                kind: "success",
                text: copy.fmt.exportDownloaded(backup.prompts.length)
              };
            }
            const blocks = backup.prompts.map((p) => {
              const tag = p.tags?.[0] ? ` [${p.tags[0]}]` : "";
              return `\u3010${p.title}\u3011${tag}
${p.body}`;
            });
            return {
              kind: "success",
              text: `${copy.fmt.exportTextHeader(backup.prompts.length)}

${blocks.join("\n\n")}`
            };
          }
          if (cmd === "data") {
            const stats = await computeLibraryStats().catch(() => void 0);
            if (!stats) return { kind: "error", text: copy.failed };
            const usedPct = stats.total ? Math.round(stats.usedCount / stats.total * 100) : 0;
            const f = copy.fmt;
            const lines = [
              f.dataHeader,
              f.dataTotal(stats.total),
              f.dataTotalUsage(stats.totalUsage),
              f.dataUsed(stats.usedCount, stats.unusedCount, usedPct),
              // 精细化统计维度
              f.dataUsageVitality(stats.usedIn7Days, stats.usedIn30Days),
              stats.longestUnused.length ? f.dataSleeping(stats.longestUnused) : "",
              f.dataBodyStats(stats.totalBodyLength, stats.avgBodyLength),
              f.dataAiRefined(stats.aiRefinedCount, stats.aiRefinedPct),
              f.dataAddedTrend(stats.addedIn7Days, stats.addedIn30Days),
              // 原有统计维度
              stats.topUsed.length ? `${f.dataTop(stats.topUsed.length)}
${stats.topUsed.map((p) => f.dataTopItem(p.title, p.usageCount)).join("\n")}` : f.dataNoUsage,
              stats.recentUsed.length ? f.dataRecent(stats.recentUsed.map((p) => p.title).join(", ")) : "",
              stats.tagStats.length ? f.dataTagDist(stats.tagStats.slice(0, 6).map((t) => `${t.name}(${t.count})`).join(", ")) : f.dataNoTags,
              f.dataTrash(stats.trashCount)
            ];
            let output = lines.filter((l) => l !== "").join("\n");
            const snap = await getLastStatsSnapshot().catch(() => void 0);
            if (snap) {
              const fmtDate = (t) => `${new Date(t).getFullYear()}-${String(new Date(t).getMonth() + 1).padStart(2, "0")}-${String(new Date(t).getDate()).padStart(2, "0")}`;
              const s = snap.stats;
              const his = [
                `
${f.historyHeader(fmtDate(snap.createdAt))}`,
                f.historyRange(fmtDate(s.rangeStart), fmtDate(s.rangeEnd)),
                f.historyAdded(s.addedCount)
              ];
              if (s.addedTitles.length) his.push(f.historyAddedTitles(s.addedTitles.join("\u3001")));
              his.push(f.historyUsage(s.usageCount, s.usedPromptCount));
              if (s.topUsed.length) {
                his.push(f.historyTop(s.topUsed.length));
                for (const t of s.topUsed) his.push(f.historyTopItem(t.title, t.count));
              }
              his.push(f.historyAiRefined(s.aiRefinedCount));
              output += his.join("\n");
            } else {
              output += `

${f.historyHeader("")}
${f.historyNone}`;
            }
            if (isAiAvailable()) {
              const settings = await getSettings();
              const comment = await commentOnStats(output, settings).catch(() => "");
              if (comment) output += `

${f.aiComment}
${comment}`;
            }
            return { kind: "success", text: output };
          }
          if (cmd === "version") {
            const notes = getAllVersionNotes(isZh ? "zh" : "en");
            const lines = [
              copy.versionHeader,
              ...notes.map((n) => {
                const date = n.date ? `\uFF08${n.date}\uFF09` : "";
                const itemLines = n.items.map((item) => `  - ${item}`).join("\n");
                return `
${n.version}${date} ${n.title}
${itemLines}`;
              })
            ];
            return { kind: "success", text: lines.join("\n") };
          }
          return { kind: "error", text: copy.unknownFlag };
        }
      });
    });
    return () => dispose();
  });
  void autoUpdateDaily();
  const versionTimer = setInterval(() => {
    void autoUpdateDaily();
  }, 24 * 60 * 60 * 1e3);
  void ensureWorkbenchInstalled();
  const workbenchTimer = setInterval(() => {
    void checkWorkbenchUpdate();
  }, 24 * 60 * 60 * 1e3);
  const weeklySnapshotTimer = setInterval(() => {
    void checkAndGenerateWeeklySnapshot();
  }, 24 * 60 * 60 * 1e3);
  void checkAndGenerateWeeklySnapshot();
  const backupTimer = setInterval(() => {
    void autoBackup();
  }, 24 * 60 * 60 * 1e3);
  void autoBackup();
  return () => {
    disposeActivity?.();
    bus.off("session/event", onSessionScope);
    if (weeklySnapshotTimer) clearInterval(weeklySnapshotTimer);
    if (versionTimer) clearInterval(versionTimer);
    if (workbenchTimer) clearInterval(workbenchTimer);
    if (backupTimer) clearInterval(backupTimer);
  };
}
var WEEK_MS2 = 7 * 24 * 60 * 60 * 1e3;
function formatWeeklyStatsText(stats, isZh) {
  const fmtDate = (t) => `${new Date(t).getFullYear()}-${String(new Date(t).getMonth() + 1).padStart(2, "0")}-${String(new Date(t).getDate()).padStart(2, "0")}`;
  const lines = [];
  if (isZh) {
    lines.push(`\u3010\u6700\u8FD1 7 \u5929\u7EDF\u8BA1 \xB7 ${fmtDate(stats.rangeStart)} ~ ${fmtDate(stats.rangeEnd)}\u3011`);
    lines.push(`- \u65B0\u589E\u63D0\u793A\u8BCD\uFF1A${stats.addedCount} \u6761`);
    if (stats.addedTitles.length) lines.push(`    \u65B0\u589E\uFF1A${stats.addedTitles.join("\u3001")}`);
    lines.push(`- \u4F7F\u7528\u6B21\u6570\uFF1A${stats.usageCount} \u6B21\uFF08\u8986\u76D6 ${stats.usedPromptCount} \u6761\uFF09`);
    if (stats.topUsed.length) {
      lines.push(`- \u8FD1 7 \u5929\u6700\u5E38\u7528 Top ${stats.topUsed.length}\uFF1A`);
      for (const t of stats.topUsed) lines.push(`    ${t.title}\uFF08${t.count}\u6B21\uFF09`);
    }
    lines.push(`- AI \u5B8C\u5584\uFF1A${stats.aiRefinedCount} \u6761`);
  } else {
    lines.push(`[Last 7 days stats \xB7 ${fmtDate(stats.rangeStart)} ~ ${fmtDate(stats.rangeEnd)}]`);
    lines.push(`- Added: ${stats.addedCount}`);
    if (stats.addedTitles.length) lines.push(`    New: ${stats.addedTitles.join(", ")}`);
    lines.push(`- Used: ${stats.usageCount} times (${stats.usedPromptCount} prompts)`);
    if (stats.topUsed.length) {
      lines.push(`- Top ${stats.topUsed.length} used this week:`);
      for (const t of stats.topUsed) lines.push(`    ${t.title} (${t.count} times)`);
    }
    lines.push(`- AI-refined: ${stats.aiRefinedCount}`);
  }
  return lines.join("\n");
}
async function checkAndGenerateWeeklySnapshot() {
  try {
    const lastAt = await getLastSnapshotAt().catch(() => 0);
    if (lastAt > 0 && Date.now() - lastAt < WEEK_MS2) return;
    const stats = await computeWeeklyStats();
    let comment = "";
    if (isAiAvailable()) {
      const settings = await getSettings();
      const locale = await readGlobalLocale();
      const isZh = locale.startsWith("zh") || locale === "";
      comment = await commentOnStats(formatWeeklyStatsText(stats, isZh), settings).catch(() => "");
    }
    await saveStatsSnapshot(stats, comment);
  } catch {
  }
}
export {
  apply,
  inject,
  name
};
/*! Bundled license information:

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 5.3.0 https://github.com/nodeca/js-yaml @license MIT *)
*/
//# sourceMappingURL=index.js.map
