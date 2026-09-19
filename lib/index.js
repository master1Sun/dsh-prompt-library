// src/host/routes.ts
import { existsSync as existsSync2, statSync } from "node:fs";
import { mkdir as mkdir2, readdir as readdir2, stat as stat2, writeFile as writeFile3 } from "node:fs/promises";
import { homedir as homedir2 } from "node:os";
import { isAbsolute, join as join5, resolve } from "node:path";

// src/host/ai.ts
import { BlockAssembler, createUserMessage } from "@deepseek-ai/dsh-llm";

// src/host/store.ts
import { readFile, rm, writeFile } from "node:fs/promises";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

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

// src/types.ts
var TITLE_MAX_LEN = 25;
function clampTitle(title) {
  return title.slice(0, TITLE_MAX_LEN);
}
var UNMATCHED_SCOPE_PATH = "__pl_unmatched__";
var DEFAULT_SETTINGS = {
  panelWidth: 360,
  // 右侧面板宽度（px）
  panelHeight: 500,
  // 右侧面板高度（px）
  maxPromptCount: 100,
  // 提示词最大存储数量（超出时按使用次数/更新时间淘汰）
  aiProvider: "",
  // AI 调用使用的 provider（留空自动发现）
  aiModel: "",
  // AI 调用使用的模型 id（留空自动发现）
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
  dataManagementEnabled: true
  // 数据管理：卡片菜单/词库菜单展示「数据管理」入口
};

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
function dbPath() {
  return join(dataDir(), "db", "prompts.db");
}
function workspaceStorePath() {
  return join(dshHome(), "storages", "workspace.json");
}
function systemSettingsPath() {
  return join(dshHome(), "settings.yaml");
}
var SETTINGS_NAMESPACE = "prompt-library";
function logDir() {
  return join(dataDir(), "log");
}
function soulPath() {
  return join(dataDir(), "character", "SOUL.md");
}
function sessionPromptPath(id) {
  return join(dataDir(), "session-prompts", `${id}.md`);
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
  migrateLegacyJsonIfNeeded().catch(() => {
  });
  try {
    migrateMdContentToDb();
  } catch {
  }
  return next;
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
    "\xB7 \u6253\u5F00\u5DE6\u4FA7\u83DC\u5355\u7684\u300C\u6570\u636E\u7BA1\u7406\u300D\u6D4F\u89C8\u3001\u7F16\u8F91\u3001\u68C0\u7D22\u6574\u5E93\uFF1B",
    "\xB7 \u5728\u804A\u5929\u8F93\u5165\u6846\u65C1\u7528\u300CAI \u4F18\u5316 / AI \u5B8C\u5584\u300D\u6309\u94AE\u52A0\u5DE5\u9009\u4E2D\u6587\u672C\uFF1B",
    "\xB7 \u5728\u300C\u5BFC\u5165\u5BFC\u51FA\u300D\u91CC\u5907\u4EFD\u6216\u6062\u590D\u6574\u4E2A\u8BCD\u5E93\u3002",
    "",
    "\u4E5F\u53EF\u4EE5\u76F4\u63A5\u7F16\u8F91\u8FD9\u6761\u63D0\u793A\u8BCD\uFF0C\u66FF\u6362\u4E3A\u4F60\u81EA\u5DF1\u7684\u5185\u5BB9\uFF0C\u5E76\u5728\u8BBE\u7F6E\u91CC\u4E3A\u5B83\u6253\u4E0A\u6807\u7B7E\u3002"
  ].join("\n") : [
    "This is the first prompt you saved and your quick guide to the prompt library.",
    "",
    "Here is how to use this plugin:",
    '\xB7 Open "Data Management" in the left menu to browse, edit and search the whole library;',
    '\xB7 Use the "AI polish / AI enrich" buttons next to the chat input to process selected text;',
    '\xB7 Back up or restore the whole library from "Import / Export".',
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
  "\u8BF7\u5728\u672C\u6B21\u4F1A\u8BDD\u7684\u3010\u7B2C\u4E00\u6761\u56DE\u590D\u3011\u4E2D\u7528\u4E00\u53E5\u7B80\u6D01\u3001\u81EA\u7136\u3001\u53CB\u597D\u7684\u8BDD\u6B22\u8FCE\u7528\u6237\u5373\u53EF\u3002"
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
  for (const r of listSessionPromptRecords()) {
    if (r.body) continue;
    try {
      const content = stripBom(readFileSync(sessionPromptPath(r.id), "utf8")).trim();
      if (content) updateSessionPromptMeta(r.id, { body: content });
    } catch {
    }
  }
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
async function enforceMaxCount(maxCount) {
  const cur = getDb();
  const { total } = cur.prepare("SELECT COUNT(*) AS total FROM prompts").get();
  if (total <= maxCount) return;
  const toRemove = total - maxCount;
  const rows = cur.prepare("SELECT id, usageCount, updatedAt FROM prompts").all();
  const byLeastUsed = (a, b) => a.usageCount - b.usageCount || a.updatedAt - b.updatedAt;
  const candidates = [...rows.sort(byLeastUsed)];
  const rm3 = cur.prepare("DELETE FROM prompts WHERE id = ?");
  for (const { id } of candidates.slice(0, toRemove)) rm3.run(id);
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
    void getSettings().then((s) => enforceMaxCount(s.maxPromptCount));
    snapshotPromptVersion(prompt, "create");
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
    const rm3 = cur.prepare("DELETE FROM trash WHERE id = ?");
    let deleted = 0;
    cur.exec("BEGIN");
    try {
      for (const id of list) {
        deleted += Number(rm3.run(id).changes);
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
  "dataManagementEnabled"
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
var DEFAULT_SOUL_META_KEY = "pl:default-persona-soul";
function getDefaultPersonaSoul() {
  return getMetaValue(DEFAULT_SOUL_META_KEY);
}
function setDefaultPersonaSoul(content) {
  setMetaValue(DEFAULT_SOUL_META_KEY, content);
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

// src/host/ai.ts
import { appendFileSync, mkdirSync as mkdirSync2 } from "node:fs";
import { dirname as dirname2, join as join2 } from "node:path";

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
  return join2(logDir(), `ai-${localDate()}.log`);
}
function logAI(msg) {
  if (true) return;
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
  const text = assembler.blocks().filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
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
import { basename, dirname as dirname3, join as join3 } from "node:path";

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
  return join3(dshHome(), "skills");
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
    const skillFile = join3(dir, name2, "SKILL.md");
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
        await walk(join3(d, ent.name));
      } else if (ent.isFile() && /\.md$/i.test(ent.name)) {
        const base = ent.name.replace(/\.md$/i, "");
        try {
          const raw = await readFile2(join3(d, ent.name), "utf8");
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
      const dir = join3(dirRoot, name2);
      await mkdir(dir, { recursive: true });
      const fm = ["---", `name: ${name2}`];
      fm.push(foldDescription(description));
      fm.push("---");
      const md = [...fm, "", buildSkillBody(body), ""].join("\n");
      await writeFile2(join3(dir, "SKILL.md"), md, "utf8");
      if (entry.promptId) setSkillNameForPrompt(entry.promptId, name2);
      items.push({ title, name: name2 });
    } catch (e) {
      errors.push({ title, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return { exported: items.length, items, errors, root: dirRoot };
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
      raw = await readFile2(join3(root, name2, "SKILL.md"), "utf8");
    } catch {
      continue;
    }
    const parsed = parseSkillFile(raw);
    if (!parsed.body.trim()) continue;
    out.push({
      id: join3(root, name2),
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
    await pushEntries(join3(projectRoot, ".dsh", "skills"), "project");
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
  const target = join3(id);
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
  const projPrefix = cwd ? normalizeForInjection(join3(cwd, ".dsh", "skills")) + "/" : "";
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

// src/host/persona-service.ts
import { existsSync, readFileSync as readFileSync2, readdirSync } from "node:fs";
import { basename as basename2, join as join4 } from "node:path";
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
      raw = JSON.parse(readFileSync2(workspaceStorePath(), "utf8"));
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
      const entries = readdirSync(absPath, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory() || e.name.startsWith(".")) continue;
        const childPath = join4(absPath, e.name);
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
  const cache = /* @__PURE__ */ new Map();
  const key = (node) => {
    const cached = cache.get(node);
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
    cache.set(node, best);
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

// src/host/update.ts
import { readFileSync as readFileSync3 } from "node:fs";
function currentVersion() {
  try {
    const pkgPath = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync3(pkgPath, "utf8"));
    return typeof pkg.version === "string" && pkg.version ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}
function builtVersion() {
  return "0.15.1" ? "0.15.1" : "0.0.0";
}
function getVersionInfo() {
  return { server: builtVersion(), installed: currentVersion() };
}

// src/host/routes.ts
var PREFIX = "/api/prompt-library";
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
  return new Promise((resolve2, reject) => {
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
      if (!text) return resolve2({});
      try {
        resolve2(JSON.parse(text));
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
  const tail = pathname.startsWith(PREFIX) ? pathname.slice(PREFIX.length) : pathname;
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
var DIR_LIST_LIMIT = 500;
function rootOf(abs) {
  const m = /^([A-Za-z]:[\\/])/.exec(abs);
  if (m) return m[1];
  return "/";
}
function crumbsOf(abs) {
  const root = rootOf(abs);
  const sep = root === "/" ? "/" : "\\";
  const joinSeg = (base, part) => /[\\/]$/.test(base) ? `${base}${part}` : `${base}${sep}${part}`;
  const out = [{ name: root, path: root, hidden: false }];
  const rest = abs.slice(root.length).replace(/[\\/]+$/, "");
  if (!rest) return out;
  let cur = root;
  for (const part of rest.split(/[\\/]+/)) {
    if (!part) continue;
    cur = joinSeg(cur, part);
    out.push({ name: part, path: cur, hidden: part.startsWith(".") });
  }
  return out;
}
function resolveDirInput(input, home) {
  const raw = (input ?? "").trim();
  if (!raw) return home;
  return isAbsolute(raw) ? resolve(raw) : resolve(home, raw);
}
async function listFsDirectory(input) {
  const home = homedir2();
  const dir = resolveDirInput(input, home);
  const st = await stat2(dir);
  if (!st.isDirectory()) throw new Error(`not a directory: ${dir}`);
  const all = await readdir2(dir, { withFileTypes: true });
  const dirs = all.filter((d) => {
    if (d.isDirectory()) return true;
    if (d.isSymbolicLink()) {
      try {
        return statSync(join5(dir, d.name)).isDirectory();
      } catch {
        return false;
      }
    }
    return false;
  }).map((d) => ({
    name: d.name,
    path: join5(dir, d.name),
    hidden: d.name.startsWith(".")
  })).sort((a, b) => a.name.localeCompare(b.name, void 0, { numeric: true }));
  return {
    path: dir,
    home,
    crumbs: crumbsOf(dir),
    entries: dirs.slice(0, DIR_LIST_LIMIT),
    truncated: dirs.length > DIR_LIST_LIMIT
  };
}
async function createFsDirectory(parent, name2) {
  const home = homedir2();
  const base = resolveDirInput(parent, home);
  const clean = name2.trim().replace(/[\\/]+/g, "");
  if (!clean) throw new Error("invalid directory name");
  const target = join5(base, clean);
  await mkdir2(target, { recursive: false });
  return target;
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
        return json(res, 201, { ok: true, data: prompt });
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
      if (method === "POST" && promptId) {
        const updated = await recordUsage(promptId);
        if (!updated) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: updated });
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
        const requested = typeof obj.dir === "string" ? obj.dir.trim() : "";
        const dir = requested ? requested : downloadDir();
        const ext = file.fileName.match(/\.([^.]*)$/)?.[1] ?? "";
        const base = ext ? file.fileName.slice(0, -(ext.length + 1)) : file.fileName;
        let finalName = file.fileName;
        let n = 1;
        while (existsSync2(join5(dir, finalName))) {
          finalName = ext ? `${base} (${n}).${ext}` : `${base} (${n})`;
          n++;
        }
        const target = join5(dir, finalName);
        try {
          await mkdir2(dir, { recursive: true });
          await writeFile3(target, file.content, "utf8");
        } catch (e) {
          return json(res, 400, {
            ok: false,
            error: `write failed: ${e instanceof Error ? e.message : String(e)}`
          });
        }
        return json(res, 200, { ok: true, data: { count: data.prompts.length, filePath: target } });
      }
      if (method === "POST" && segments[0] === "import" && segments.length === 1) {
        const body = await readJsonBody(req);
        const result = await importPrompts(body);
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
      if (method === "GET" && tail === "/fs/list") {
        const path = new URL(req.url ?? "/", "http://localhost").searchParams.get("path") ?? "";
        try {
          return json(res, 200, { ok: true, data: await listFsDirectory(path || void 0) });
        } catch (e) {
          return json(res, 400, {
            ok: false,
            error: e instanceof Error ? e.message : String(e)
          });
        }
      }
      if (method === "POST" && tail === "/fs/mkdir") {
        const b = await readJsonBody(req);
        const parent = typeof b === "object" && b !== null && typeof b.path === "string" ? b.path : "";
        const name2 = typeof b === "object" && b !== null && typeof b.name === "string" ? b.name : "";
        if (!name2.trim()) return json(res, 400, { ok: false, error: "invalid body: {path, name}" });
        try {
          const data = await createFsDirectory(parent, name2);
          return json(res, 200, { ok: true, data: { path: data } });
        } catch (e) {
          return json(res, 400, {
            ok: false,
            error: e instanceof Error ? e.message : String(e)
          });
        }
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
        const scope = typeof raw === "object" && raw !== null && raw.scope === "project" ? "project" : "global";
        const manualRoot = typeof raw === "object" && raw !== null && typeof raw.rootPath === "string" ? raw.rootPath.trim() : "";
        const projectRoot = scope === "project" ? manualRoot || await resolveCurrentProjectCwd() : null;
        if (scope === "project" && !projectRoot) {
          return json(res, 400, {
            ok: false,
            error: "\u672A\u6307\u5B9A\u5BFC\u51FA\u8DEF\u5F84\uFF0C\u4E14\u65E0\u6CD5\u786E\u5B9A\u5F53\u524D\u9879\u76EE\u8DEF\u5F84\uFF0C\u8BF7\u586B\u5199\u9879\u76EE\u8DEF\u5F84\u540E\u91CD\u8BD5"
          });
        }
        const exportRoot = scope === "project" ? join5(projectRoot, ".dsh", "skills") : void 0;
        const result = await exportPromptsAsSkills(entries, exportRoot);
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
      if (method === "POST" && tail === "/ai/draft") {
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null) {
          return json(res, 400, { ok: false, error: "invalid body: {kind, title, input}" });
        }
        const { kind, title, input, lang } = raw;
        if (kind !== "skill" && kind !== "soul" || typeof title !== "string" || !title.trim()) {
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
      if (method === "GET" && tail === "/version") {
        return json(res, 200, { ok: true, data: getVersionInfo() });
      }
      if (method === "PUT" && tail === "/settings") {
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null) {
          return json(res, 400, { ok: false, error: "invalid body" });
        }
        const settings = await updateSettings(raw);
        return json(res, 200, { ok: true, data: settings });
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
        const personaSource = sessionPersona ? "session" : pathPersona ? "path" : "default";
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
      return json(res, 404, { ok: false, error: `no route ${method} ${tail}` });
    } catch (err) {
      return json(res, 500, { ok: false, error: "internal error" });
    }
  };
  return [
    {
      kind: "prefix",
      path: PREFIX,
      handler
    }
  ];
}

// src/host/ws.ts
import { createHash } from "node:crypto";
var WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
var MAX_PAYLOAD_BYTES = 16 * 1024 * 1024;
var DEFAULT_HEARTBEAT_MS = 15e3;
var OP_CONTINUATION = 0;
var OP_TEXT = 1;
var OP_BINARY = 2;
var OP_CLOSE = 8;
var OP_PING = 9;
var OP_PONG = 10;
function acceptKey(key) {
  return createHash("sha1").update(key + WS_GUID).digest("base64");
}
function unmask(payload, mask) {
  const out = Buffer.allocUnsafe(payload.length);
  for (let i = 0; i < payload.length; i += 1) {
    out[i] = payload[i] ^ mask[i % 4];
  }
  return out;
}
function encodeFrame(opcode, payload) {
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  header[0] = 128 | opcode;
  return Buffer.concat([header, payload]);
}
var EMPTY_PAYLOAD = Buffer.alloc(0);
function createWsRoute(options) {
  return {
    path: options.path,
    handler(req, socket, head) {
      const upgrade = String(req.headers.upgrade ?? "").toLowerCase();
      const key = req.headers["sec-websocket-key"];
      if (upgrade !== "websocket" || typeof key !== "string" || key === "") {
        socket.end("HTTP/1.1 400 Bad Request\r\nconnection: close\r\n\r\n");
        return;
      }
      socket.write(
        `HTTP/1.1 101 Switching Protocols\r
Upgrade: websocket\r
Connection: Upgrade\r
Sec-WebSocket-Accept: ${acceptKey(key)}\r
\r
`
      );
      let closed = false;
      const closeListeners = [];
      const messageListeners = [];
      let fragments = [];
      let fragmentOpcode = OP_TEXT;
      let lastSeenAt = Date.now();
      let pending = Buffer.alloc(0);
      const heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
      let heartbeat;
      const session = {
        get closed() {
          return closed;
        },
        req,
        send(text) {
          if (closed) return;
          try {
            socket.write(encodeFrame(OP_TEXT, Buffer.from(text, "utf8")));
          } catch {
            destroy();
          }
        },
        close() {
          if (closed) return;
          try {
            socket.write(encodeFrame(OP_CLOSE, Buffer.from([3, 232])));
          } catch {
          }
          socket.end();
        },
        onMessage(listener) {
          messageListeners.push(listener);
        },
        onClose(listener) {
          if (closed) {
            listener();
            return;
          }
          closeListeners.push(listener);
        }
      };
      function finish() {
        if (closed) return;
        closed = true;
        if (heartbeat !== void 0) {
          clearInterval(heartbeat);
          heartbeat = void 0;
        }
        options.onClose?.(session);
        for (const listener of closeListeners) listener();
        closeListeners.length = 0;
      }
      function destroy() {
        finish();
        try {
          socket.destroy();
        } catch {
        }
      }
      function deliver(opcode, payload) {
        if (opcode === OP_TEXT || opcode === OP_BINARY) {
          const text = payload.toString("utf8");
          options.onMessage?.(session, text);
          for (const listener of messageListeners) listener(text);
        }
      }
      function parse() {
        for (; ; ) {
          if (pending.length < 2) return;
          const b0 = pending[0];
          const b1 = pending[1];
          const fin = (b0 & 128) !== 0;
          const opcode = b0 & 15;
          const masked = (b1 & 128) !== 0;
          let length = b1 & 127;
          let offset = 2;
          if (length === 126) {
            if (pending.length < offset + 2) return;
            length = pending.readUInt16BE(offset);
            offset += 2;
          } else if (length === 127) {
            if (pending.length < offset + 8) return;
            const raw2 = pending.readBigUInt64BE(offset);
            if (raw2 > BigInt(MAX_PAYLOAD_BYTES)) {
              destroy();
              return;
            }
            length = Number(raw2);
            offset += 8;
          }
          if (length > MAX_PAYLOAD_BYTES) {
            destroy();
            return;
          }
          let mask;
          if (masked) {
            if (pending.length < offset + 4) return;
            mask = pending.subarray(offset, offset + 4);
            offset += 4;
          }
          if (pending.length < offset + length) return;
          const raw = pending.subarray(offset, offset + length);
          const payload = mask === void 0 ? Buffer.from(raw) : unmask(raw, mask);
          pending = Buffer.from(pending.subarray(offset + length));
          if (opcode === OP_CLOSE) {
            session.close();
            destroy();
            return;
          }
          if (opcode === OP_PING) {
            if (!closed) {
              try {
                socket.write(encodeFrame(OP_PONG, payload));
              } catch {
                destroy();
              }
            }
            continue;
          }
          if (opcode === OP_PONG) {
            lastSeenAt = Date.now();
            continue;
          }
          if (opcode === OP_CONTINUATION) {
            fragments.push(payload);
            if (fin) {
              const merged = Buffer.concat(fragments);
              fragments = [];
              deliver(fragmentOpcode, merged);
            }
            continue;
          }
          if (fin) {
            deliver(opcode, payload);
          } else {
            fragmentOpcode = opcode;
            fragments = [payload];
          }
        }
      }
      socket.on("data", (chunk) => {
        lastSeenAt = Date.now();
        pending = pending.length === 0 ? Buffer.from(chunk) : Buffer.concat([pending, chunk]);
        try {
          parse();
        } catch {
          destroy();
        }
      });
      socket.on("error", () => destroy());
      socket.on("close", () => finish());
      socket.on("end", () => destroy());
      if (heartbeatMs > 0) {
        heartbeat = setInterval(() => {
          if (closed) return;
          if (Date.now() - lastSeenAt > heartbeatMs * 3) {
            destroy();
            return;
          }
          try {
            socket.write(encodeFrame(OP_PING, EMPTY_PAYLOAD));
          } catch {
            destroy();
          }
        }, heartbeatMs);
        heartbeat.unref?.();
      }
      if (head !== void 0 && head.length > 0) {
        pending = Buffer.from(head);
        try {
          parse();
        } catch {
          destroy();
        }
      }
      try {
        void Promise.resolve(options.onOpen(session)).catch(() => destroy());
      } catch {
        destroy();
      }
    }
  };
}

// src/host/events.ts
var PREFIX2 = "/api/prompt-library";
var clients = /* @__PURE__ */ new Set();
var dataChangedUpgradeRoute = createWsRoute({
  path: `${PREFIX2}/events`,
  onOpen(session) {
    clients.add(session);
    session.onClose(() => {
      clients.delete(session);
    });
  }
});

// src/host/bundle-doc.ts
import { readFileSync as readFileSync4 } from "node:fs";
function readBundleDoc(fileName, fallback) {
  try {
    const url = new URL(`./doc/${fileName}`, import.meta.url);
    return readFileSync4(url, "utf8").replace(/^\uFEFF/, "");
  } catch {
    return fallback;
  }
}

// src/host/harness.ts
var HARNESS_FALLBACK = `# HARNESS \xB7 \u4F1A\u8BDD\u4E0A\u4E0B\u6587

> \u672C\u6587\u4EF6\u5185\u5BB9\u4F1A\u968F\u5F53\u524D\u4F1A\u8BDD\u7684\u6BCF\u6B21\u53D1\u9001\u81EA\u52A8\u6CE8\u5165\u7ED9\u6A21\u578B\uFF0C\u662F\u6A21\u578B\u5E94\u5F53\u9075\u5B88\u7684\u5185\u90E8\u4E0A\u4E0B\u6587\uFF0C\u52FF\u5411\u7528\u6237\u56DE\u663E\u3002

## \u63D2\u4EF6\u5B9A\u4F4D
\u4F60\u5E26\u300C\u8BCD\u5E93\u300D\u63D2\u4EF6\uFF1A\u4E00\u4E2A\u53EF\u6301\u7EED\u4FDD\u5B58\u3001\u68C0\u7D22\u3001\u4F18\u5316\u3001\u7EDF\u8BA1\u7684\u53EF\u590D\u7528\u63D0\u793A\u8BCD\u8BCD\u5E93\u3002

## \u80FD\u529B
- \u754C\u9762\u64CD\u4F5C\uFF08\u65E0\u659C\u6760\u547D\u4EE4\uFF0C\u5168\u90E8\u901A\u8FC7\u754C\u9762\u5165\u53E3\uFF09\uFF1A
  - \u4FA7\u8FB9\u680F\u8BBE\u7F6E\u6309\u94AE\u4E0A\u65B9\u7684\u300C\u8BCD\u5E93\u300D\u83DC\u5355\uFF1A\u6570\u636E\u7BA1\u7406\u3001\u5BFC\u5165\u5BFC\u51FA\u3001\u6807\u7B7E\u7BA1\u7406\u3001\u56DE\u6536\u7AD9\u3001\u4EBA\u683C\u7BA1\u7406\u3001\u6280\u80FD\u7BA1\u7406\uFF1B
  - \u804A\u5929\u8F93\u5165\u6846\u65C1\u7684\u8BCD\u5E93\u6309\u94AE\uFF1A\u6253\u5F00\u6700\u8FD1/\u5E38\u7528\u63D0\u793A\u8BCD\u5E76\u63D2\u5165\u5F53\u524D\u4F1A\u8BDD\uFF1B
  - \u8F93\u5165 # \u5524\u8D77\u8BCD\u5E93\u6D6E\u5C42\uFF1A\u5B9E\u65F6\u7B5B\u9009\u3001\u2191\u2193 \u9009\u62E9\u3001\u56DE\u8F66\u63D2\u5165\uFF1B
  - AI \u4F18\u5316\u6309\u94AE\uFF1A\u6DA6\u8272\u9009\u4E2D\u6587\u672C\u6216\u63D0\u793A\u8BCD\u6B63\u6587\u3002
- \u81EA\u52A8\u673A\u5236\uFF1A\u8F93\u5165\u6846\u4E3A\u7A7A\u65F6\u6309\u6700\u8FD1\u804A\u5929\u4E0A\u4E0B\u6587\u5728\u8F93\u5165\u6846\u4E0A\u65B9\u63A8\u8350\u63D0\u793A\u8BCD\uFF1B\u4EBA\u683C\uFF08SOUL\uFF09\u4E0E\u4F1A\u8BDD\u7EA7\u6280\u80FD\u6309\u5DE5\u4F5C\u533A/\u9879\u76EE\u7ED1\u5B9A\u81EA\u52A8\u6CE8\u5165\u3002

## \u4F7F\u7528\u89C4\u5219
- \u7528\u6237\u63D0\u5230\u300C\u8BCD\u5E93 / \u4FDD\u5B58\u63D0\u793A\u8BCD / \u6DA6\u8272 / \u68C0\u7D22\u300D\u7B49\u65F6\uFF0C\u4F18\u5148\u5F15\u5BFC\u4F7F\u7528\u4E0A\u8FF0\u754C\u9762\u5165\u53E3\uFF1B
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

// src/index.ts
var name = "prompt-library";
var inject = [];
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
function apply(ctx) {
  const routes = makePromptRoutes();
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
    return soulSystemSync(personaId);
  };
  const workspaceSectionText = (context) => {
    const { sessionId, cwd } = resolveAssemblySession(context);
    const parts = [];
    parts.push(harnessSystemSync());
    const injected = buildSessionPromptInjection(sessionId, cwd);
    if (injected) parts.push(injected);
    const disabledSkills = disabledHarnessSkillsInstruction(cwd || null);
    if (disabledSkills) parts.push(disabledSkills);
    const welcome = welcomePromptOnce(sessionId);
    if (welcome) parts.push(welcome);
    return parts.filter((p) => p.trim()).join("\n\n");
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
          text: workspaceSectionText
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
      const disposers = routes.map((route) => httpCtx.webServer.register(route));
      const server = httpCtx.webServer;
      if (typeof server.registerUpgrade === "function") {
        disposers.push(server.registerUpgrade(dataChangedUpgradeRoute));
      }
      return () => {
        for (const dispose of disposers) dispose();
      };
    }, "prompt-library: routes");
  });
  return () => {
    bus.off("session/event", onSessionScope);
  };
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
