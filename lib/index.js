// src/host/services/ai/ai.ts
import { BlockAssembler, createUserMessage } from "@deepseek-ai/dsh-llm";

// src/host/services/data/store.ts
import { readFile as readFile2, rm, writeFile as writeFile2 } from "node:fs/promises";
import { mkdirSync, readFileSync as readFileSync2 } from "node:fs";
import { dirname as dirname2 } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

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
var DEFAULT_SETTINGS = {
  autoLearnEnabled: false,
  autoLearnTag: "auto-learned",
  autoLearnMinLength: 60,
  autoLearnManualConfirm: false,
  panelWidth: 360,
  panelHeight: 500,
  assistantEnabled: true,
  rightPanelEnabled: true,
  showComposerButton: true,
  showAIPolishButton: true,
  tildaTriggerEnabled: true,
  maxPromptCount: 100,
  hoverDetailEnabled: false,
  selectionAddEnabled: false,
  aiEnrichEnabled: false,
  aiProvider: "",
  aiModel: "",
  personTipInterval: 10,
  // 10 秒
  personTipDuration: 20,
  // 20 秒
  applyCharacterToChat: false,
  autoUpdateEnabled: true,
  // 自动更新默认开启：发现新版本后台自动安装
  announcementEnabled: true
  // 公告默认开启：双击词库助手展示使用手册与版本通告
};

// src/host/services/sse/events.ts
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

// src/host/services/assistant/character.ts
import { readFileSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// src/host/utils/paths.ts
import { homedir } from "node:os";
import { join } from "node:path";
var DEFAULT_DSH_HOME = join(homedir(), ".dsh");
function dshHome() {
  return process.env.DSH_HOME || DEFAULT_DSH_HOME;
}
function dataDir() {
  return join(dshHome(), "prompt-library");
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
function systemSettingsPath() {
  return join(dshHome(), "settings.yaml");
}
var SETTINGS_NAMESPACE = "prompt-library";
function logDir() {
  return join(dataDir(), "log");
}
function characterDir() {
  return join(dataDir(), "character");
}
function soulPath() {
  return join(characterDir(), "SOUL.md");
}
function promptsDir() {
  return join(dataDir(), "prompts");
}
function harnessPath() {
  return join(promptsDir(), "HARNESS.md");
}

// src/host/utils/text.ts
function stripBom(text) {
  return text.charCodeAt(0) === 65279 ? text.slice(1) : text;
}

// src/host/services/assistant/character.ts
var DEFAULT_SOUL = `# SOUL \xB7 \u4EBA\u683C

\u6211\u662F\u300C\u8BCD\u5E93\u52A9\u624B\u300D\uFF0C\u4E13\u6CE8\u628A\u6563\u4E71\u8F93\u5165\u6574\u7406\u6210\u6E05\u6670\u3001\u901A\u7528\u3001\u53EF\u590D\u7528\u7684\u63D0\u793A\u8BCD\uFF0C\u8D8A\u7528\u8D8A\u61C2\u7528\u6237\u3002
\u8BED\u6C14\u81EA\u7136\u3001\u7B80\u6D01\u52A1\u5B9E\u3001\u8D34\u8FD1\u7528\u6237\u5199\u4F5C\u98CE\u683C\uFF1B\u4E0D\u5806\u780C\u7A7A\u8BDD\uFF0C\u4E0D\u6B6A\u66F2\u7528\u6237\u610F\u56FE\uFF0C\u4E0D\u5220\u51CF\u5FC5\u8981\u7EC6\u8282\uFF0C\u4E0D\u751F\u6210\u4E0E\u4EFB\u52A1\u65E0\u5173\u7684\u5185\u5BB9\u3002

## \u5DE5\u4F5C\u89C4\u8303
1. \u7406\u89E3\u539F\u610F\uFF1A\u8BFB\u61C2\u8F93\u5165\u7684\u6838\u5FC3\u610F\u56FE\u4E0E\u5173\u952E\u7EC6\u8282\u3002
2. \u4F18\u5316\u8868\u8FBE\uFF1A\u8BA9\u5185\u5BB9\u66F4\u6E05\u6670\u3001\u901A\u7528\u3001\u7ED3\u6784\u6E05\u6670\u3001\u53EF\u76F4\u63A5\u590D\u7528\u3002
3. \u53EA\u5904\u7406\u63D0\u793A\u8BCD\u5185\u5BB9\u672C\u8EAB\uFF0C\u4E0D\u6539\u52A8\u6807\u9898\u3001\u5206\u7C7B\u7B49\u65E0\u5173\u90E8\u5206\uFF1B\u76F8\u4F3C\u5185\u5BB9\u4F18\u5148\u590D\u7528\u65E2\u6709\u8BB0\u5FC6\u3002
`;
var characterChatInject = false;
function syncCharacterChatInto(enable) {
  characterChatInject = enable;
}
var grantedScopes = /* @__PURE__ */ new Set();
var seenScopes = /* @__PURE__ */ new Set();
var MAX_TRACKED_SCOPES = 200;
function trimScopeSet(set) {
  if (set.size > MAX_TRACKED_SCOPES) set.clear();
}
function shouldInjectChatCharacter(contextScope) {
  if (!characterChatInject) {
    if (contextScope != null) seenScopes.add(contextScope);
    trimScopeSet(seenScopes);
    return false;
  }
  if (contextScope == null) return true;
  if (grantedScopes.has(contextScope)) return true;
  if (seenScopes.has(contextScope)) return false;
  grantedScopes.add(contextScope);
  trimScopeSet(grantedScopes);
  return true;
}
async function ensureSoulFile() {
  const path = soulPath();
  try {
    await readFile(path, "utf8");
  } catch {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, stripBom(DEFAULT_SOUL), "utf8");
  }
}
async function readSoulDoc() {
  try {
    return stripBom(await readFile(soulPath(), "utf8")).trim();
  } catch {
    return "";
  }
}
function buildSoulBoundary(soul) {
  return soul.trim();
}
var soulCache = null;
function soulSystemSync() {
  let meta = null;
  try {
    const s = statSync(soulPath());
    meta = { mtimeMs: s.mtimeMs, size: s.size };
  } catch {
  }
  const cached = soulCache;
  if (cached && (meta !== null && cached.meta !== null && cached.meta.mtimeMs === meta.mtimeMs && cached.meta.size === meta.size || meta === null && cached.meta === null)) {
    return cached.content;
  }
  let content = "";
  try {
    content = stripBom(readFileSync(soulPath(), "utf8")).trim();
  } catch {
    void ensureSoulFile().catch(() => {
    });
  }
  soulCache = { meta, content };
  return content;
}

// src/host/services/data/store.ts
var db;
function getDb() {
  if (db) return db;
  const path = dbPath();
  mkdirSync(dirname2(path), { recursive: true });
  const next = new DatabaseSync(path);
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
    CREATE TABLE IF NOT EXISTS stats_history (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      stats     TEXT NOT NULL,
      comment   TEXT,
      createdAt INTEGER NOT NULL
    );
  `);
  syncTagsFromPrompts(next);
  seedDefaultPromptIfEmpty(next);
  db = next;
  migrateLegacyJsonIfNeeded().catch(() => {
  });
  return next;
}
function readUiLangSync() {
  try {
    const text = readFileSync2(systemSettingsPath(), "utf8");
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
    text = await readFile2(legacy, "utf8");
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
  const ids = cur.prepare(
    `SELECT id FROM prompts
       ORDER BY usageCount ASC, updatedAt ASC
       LIMIT ?`
  ).all(toRemove);
  const rm2 = cur.prepare("DELETE FROM prompts WHERE id = ?");
  for (const { id } of ids) rm2.run(id);
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
function createPrompt(input) {
  try {
    const now = Date.now();
    const tags = ensureTags(Array.isArray(input.tags) ? input.tags : []).slice(0, 1);
    const prompt = {
      id: randomUUID(),
      title: clampTitle(input.title.trim()),
      body: input.body,
      tags,
      updatedAt: now,
      createdAt: now,
      usageCount: 0,
      lastUsedAt: 0
    };
    const cur = getDb();
    cur.prepare(
      `INSERT INTO prompts
           (id, title, body, tags, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`
    ).run(prompt.id, prompt.title, prompt.body, tagsToJson(prompt.tags), now, 0, 0, now);
    void getSettings().then((s) => enforceMaxCount(s.maxPromptCount));
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
function autoLearn(body, tag, skipEnrich) {
  try {
    const normalized = body.trim().toLowerCase();
    const collisions = getDb().prepare("SELECT id FROM prompts WHERE lower(body) = ?").all(normalized);
    if (collisions.length > 0) {
      const row = getDb().prepare("SELECT * FROM prompts WHERE id = ?").get(collisions[0].id);
      const existing = rowToPrompt(row);
      return Promise.resolve(existing).then(async (prompt2) => {
        void continueEnrich(prompt2, !!skipEnrich);
        return prompt2;
      });
    }
    const title = buildTitle(body);
    const now = Date.now();
    const prompt = {
      id: randomUUID(),
      title,
      body: body.trim(),
      tags: ensureTags(tag ? [tag] : ["auto-learned"]).slice(0, 1),
      updatedAt: now,
      createdAt: now,
      usageCount: 0,
      lastUsedAt: 0,
      // 已在界面完成 AI 润色的正文视为已完善，跳过后台 AI 完善
      aiRefined: !!skipEnrich
    };
    getDb().prepare(
      `INSERT INTO prompts
           (id, title, body, tags, aiRefined, updatedAt, usageCount, lastUsedAt, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(prompt.id, prompt.title, prompt.body, tagsToJson(prompt.tags), prompt.aiRefined ? 1 : 0, now, 0, 0, now);
    void getSettings().then((s) => enforceMaxCount(s.maxPromptCount));
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
    const rm2 = cur.prepare("DELETE FROM trash WHERE id = ?");
    let deleted = 0;
    cur.exec("BEGIN");
    try {
      for (const id of list) {
        deleted += Number(rm2.run(id).changes);
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
function importPrompts(raw) {
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
    cur.exec("BEGIN");
    try {
      for (const rawItem of list) {
        if (typeof rawItem !== "object" || rawItem === null) {
          skipped++;
          continue;
        }
        const p = rawItem;
        const body = typeof p.body === "string" ? p.body : "";
        if (!body.trim()) {
          skipped++;
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
        const usageCount = typeof p.usageCount === "number" ? p.usageCount : 0;
        const lastUsedAt = typeof p.lastUsedAt === "number" ? p.lastUsedAt : 0;
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
      }
      cur.exec("COMMIT");
    } catch (e) {
      cur.exec("ROLLBACK");
      throw e;
    }
    return Promise.resolve({ imported, updated, skipped });
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
      aiRefinedIn7
    });
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
    text = await readFile2(systemSettingsPath(), "utf8");
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
async function writeSettingsRaw(settings) {
  let root = {};
  try {
    const text = await readFile2(systemSettingsPath(), "utf8");
    const parsed = load(stripBom(text));
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      root = parsed;
    }
  } catch {
  }
  root[SETTINGS_NAMESPACE] = settings;
  await writeFile2(systemSettingsPath(), dump(root, { indent: 2 }), "utf8");
}
async function readSettingsRaw() {
  const ns = await readSystemSettingsNamespace().catch(() => void 0);
  if (ns !== void 0) {
    const settings2 = { ...DEFAULT_SETTINGS, ...ns };
    syncCharacterChatInto(settings2.applyCharacterToChat ?? false);
    return settings2;
  }
  const settings = { ...DEFAULT_SETTINGS };
  try {
    await writeSettingsRaw(settings);
  } catch {
  }
  syncCharacterChatInto(settings.applyCharacterToChat ?? false);
  return settings;
}
function getSettings() {
  return readSettingsRaw();
}
async function readGlobalLocale() {
  try {
    const text = await readFile2(systemSettingsPath(), "utf8");
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
    syncCharacterChatInto(next.applyCharacterToChat ?? false);
    return next;
  });
}

// src/host/utils/refine.ts
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

// src/host/services/ai/ai.ts
import { appendFileSync, mkdirSync as mkdirSync2 } from "node:fs";
import { dirname as dirname3, join as join2 } from "node:path";
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
  try {
    const logPath = getDailyLogPath();
    mkdirSync2(dirname3(logPath), { recursive: true });
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
      introStart: (lang2) => `intro: start lang=${lang2}`,
      introDone: (n) => `intro: done lines=${n}`,
      introLine: (i, l) => `intro:   [${i}] ${l}`,
      skillStart: (title, n) => `skill: start title="${title}" body length=${n}`,
      skillParseFail: (t) => `skill: model output could not be parsed: ${t}`,
      skillDone: (name2, n) => `skill: done name="${name2}" description length=${n}`
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
    introStart: (lang2) => `intro: \u5F00\u59CB lang=${lang2}`,
    introDone: (n) => `intro: \u5B8C\u6210 \u884C\u6570=${n}`,
    introLine: (i, l) => `intro:   [${i}] ${l}`,
    skillStart: (title, n) => `skill: \u5F00\u59CB title="${title}" \u6B63\u6587\u957F\u5EA6=${n}`,
    skillParseFail: (t) => `skill: \u6A21\u578B\u8F93\u51FA\u65E0\u6CD5\u89E3\u6790\uFF1A${t}`,
    skillDone: (name2, n) => `skill: \u5B8C\u6210 name="${name2}" \u63CF\u8FF0\u957F\u5EA6=${n}`
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
  return text;
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
  return text;
}
async function commentOnStats(statsText, settings) {
  if (!llm) return "";
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return "";
  const system = [
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
function parseSkillJson(text) {
  const cleaned = text.replace(/```[a-z]*\n?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return void 0;
  let parsed;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return void 0;
  }
  if (typeof parsed !== "object" || parsed === null) return void 0;
  const obj = parsed;
  return {
    name: typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : void 0,
    description: typeof obj.description === "string" && obj.description.trim() ? obj.description.trim() : void 0,
    whenToUse: typeof obj.whenToUse === "string" && obj.whenToUse.trim() ? obj.whenToUse.trim() : void 0
  };
}
async function generateSkillDescriptor(prompt, settings) {
  logAI(aiLogCopy().skillStart(prompt.title, prompt.body.length));
  if (!llm) {
    logAI(aiLogCopy().enrichSkipNoLlm);
    return void 0;
  }
  const candidates = await resolveCandidates(llm, settings);
  if (candidates.length === 0) return void 0;
  const hasVars = /\{\{\s*[^{}]+\s*\}\}/.test(prompt.body);
  const system = [
    "\u4F60\u662F\u4E00\u540D DSH \u6280\u80FD\uFF08Skill\uFF09\u4F5C\u8005\u3002\u4F60\u4F1A\u628A\u4E00\u6BB5\u63D0\u793A\u8BCD\u5C01\u88C5\u6210\u53EF\u590D\u7528\u7684 DSH \u6280\u80FD\u5B9A\u4E49\u3002",
    "\u6280\u80FD\u5B9A\u4E49\u5C06\u88AB\u5199\u5165 ~/.dsh/skills/<name>/SKILL.md\uFF0Cfrontmatter \u5143\u6570\u636E\u8981\u6C42\uFF1A",
    "- name\uFF1A\u6280\u80FD\u76EE\u5F55\u540D\uFF0C\u540C\u65F6\u662F\u7528\u6237\u5728\u804A\u5929\u6846\u8F93\u5165 /<name> \u89E6\u53D1\u7684\u540D\u5B57\uFF0C\u5FC5\u987B\u662F\u7EAF\u5C0F\u5199 kebab-case \u82F1\u6587\uFF08\u53EA\u80FD\u542B\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u8FDE\u5B57\u7B26\uFF09\uFF0C\u957F\u5EA6\u4E0D\u8D85\u8FC7 40 \u5B57\u7B26\uFF1B",
    "- description\uFF1A\u4E00\u6BB5\u4E2D\u957F\u63CF\u8FF0\uFF0C\u8BF4\u660E\u8FD9\u4E2A\u6280\u80FD\u505A\u4EC0\u4E48\u3001\u80FD\u89E3\u51B3\u4EC0\u4E48\u95EE\u9898\uFF0C\u5E76\u5C3D\u91CF\u5217\u51FA\u89E6\u53D1\u573A\u666F\uFF08\u7528\u6237\u8BF4\u4EC0\u4E48\u8BDD\u65F6\u4F1A\u7528\u5230\u672C\u6280\u80FD\uFF09\uFF0C\u4F9B\u6A21\u578B\u81EA\u52A8\u5339\u914D\u548C\u804A\u5929\u6846\u8F93\u5165 / \u65F6\u5C55\u793A\uFF1B\u5982\u9700\u6362\u884C\u7528 \\n \u8F6C\u4E49\uFF1B",
    "- whenToUse\uFF1A\u4E00\u53E5\u8BDD\u8BF4\u660E\u9002\u5408\u5728\u4EC0\u4E48\u573A\u666F\u4F7F\u7528\uFF08\u53EF\u9009\uFF0C\u6CA1\u6709\u5219\u7701\u7565\uFF09\u3002",
    ...hasVars ? [
      "- \u6B63\u6587\u5305\u542B {{\u53D8\u91CF\u540D}} \u6A21\u677F\u53D8\u91CF\uFF0C\u4F7F\u7528\u65F6\u4F1A\u6309\u7528\u6237\u8BED\u4E49\u573A\u666F\u81EA\u52A8\u8865\u5168\uFF1A\u8BF7\u5728 description \u4E2D\u8BF4\u660E\u8FD9\u4E00\u300C\u5360\u4F4D\u7B26\u81EA\u52A8\u8865\u5168\u300D\u80FD\u529B\uFF1B"
    ] : [],
    "\u8BF7\u4E25\u683C\u8F93\u51FA\u4E00\u4E2A JSON \u5BF9\u8C61\uFF0C\u4E0D\u8981 Markdown \u4EE3\u7801\u5757\uFF0C\u4E0D\u8981\u4EFB\u4F55\u591A\u4F59\u6587\u5B57\uFF1A",
    '{ "name": "kebab-case\u82F1\u6587\u540D", "description": "\u6280\u80FD\u63CF\u8FF0\u542B\u89E6\u53D1\u573A\u666F", "whenToUse": "\u4F7F\u7528\u65F6\u673A" }'
  ].join("\n");
  const meta = [
    `\u6807\u9898\uFF1A${prompt.title}`,
    prompt.summary ? `\u6458\u8981\uFF1A${prompt.summary}` : "",
    prompt.tags?.length ? `\u6807\u7B7E\uFF1A${prompt.tags.join("\u3001")}` : "",
    "\u6B63\u6587\uFF1A",
    prompt.body
  ].filter(Boolean).join("\n");
  const text = await collectTextWithFallback(
    llm,
    candidates,
    await withSoulSystem(system),
    `\u4EE5\u4E0B\u662F\u63D0\u793A\u8BCD\uFF0C\u8BF7\u636E\u6B64\u751F\u6210\u6280\u80FD\u63CF\u8FF0\u7B26\uFF08name \u4E3A\u82F1\u6587 kebab-case\uFF09\uFF1A

${meta}`
  );
  if (!text) return void 0;
  const parsed = parseSkillJson(text);
  if (!parsed || !parsed.name || !parsed.description) {
    logAI(aiLogCopy().skillParseFail(text.slice(0, 300)));
    return void 0;
  }
  logAI(aiLogCopy().skillDone(parsed.name, parsed.description.length));
  return {
    name: parsed.name,
    description: parsed.description,
    whenToUse: parsed.whenToUse
  };
}

// src/host/services/ai/skills.ts
import { mkdir as mkdir2, writeFile as writeFile3 } from "node:fs/promises";
import { join as join3 } from "node:path";
function skillsRoot() {
  return join3(dshHome(), "skills");
}
function toKebab(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
function fallbackName(title, index) {
  const slug = toKebab(title || "");
  return slug || `prompt-skill-${index + 1}`;
}
function foldDescription(desc) {
  const trimmed = desc.trim();
  if (!trimmed) return 'description: ""';
  const lines = trimmed.split("\n").map((l) => `  ${l}`);
  return `description: >
${lines.join("\n")}`;
}
function extractVars(body) {
  const vars = [];
  const seen = /* @__PURE__ */ new Set();
  for (const m of body.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) {
    const v = m[1].trim();
    if (v && !seen.has(v)) {
      seen.add(v);
      vars.push(v);
    }
  }
  return vars;
}
function buildSkillBody(body) {
  const content = body.trim();
  const vars = extractVars(content);
  if (vars.length === 0) return content;
  const list = vars.map((v) => `{{${v}}}`).join("\u3001");
  const note = `

## \u6A21\u677F\u53D8\u91CF\u81EA\u52A8\u8865\u5168
\u6B63\u6587\u5305\u542B\u4EE5\u4E0B\u6A21\u677F\u53D8\u91CF\uFF1A${list}\u3002\u4F7F\u7528\u65F6\u8BF7\u4F9D\u636E\u7528\u6237\u7684\u5F53\u524D\u8BED\u4E49\u573A\u666F\uFF0C\u7ED3\u5408\u4E0A\u4E0B\u6587\u81EA\u52A8\u63A8\u65AD\u5E76\u8865\u5168\u6BCF\u4E2A {{\u53D8\u91CF\u540D}} \u7684\u5B9E\u9645\u5185\u5BB9\uFF0C\u76F4\u63A5\u7528\u8865\u5168\u540E\u7684\u7ED3\u679C\u6267\u884C\u672C\u6280\u80FD\u6D41\u7A0B\uFF1B\u9664\u975E\u53D8\u91CF\u8BED\u4E49\u786E\u5B9E\u4E0D\u660E\u786E\uFF0C\u5426\u5219\u4E0D\u8981\u8BE2\u95EE\u7528\u6237\uFF0C\u4E5F\u4E0D\u8981\u4FDD\u7559\u7A7A\u5360\u4F4D\u7B26\u3002`;
  return `${content}${note}`;
}
async function generateSkillsFromPrompts(ids) {
  if (ids.length === 0) return { generated: 0, items: [], errors: [], aiUnavailable: false };
  if (!isAiAvailable()) {
    return {
      generated: 0,
      items: [],
      errors: ids.map(() => ({ title: "", reason: "AI \u670D\u52A1\u4E0D\u53EF\u7528" })),
      aiUnavailable: true
    };
  }
  const all = await listPrompts();
  const targets = all.filter((p) => ids.includes(p.id));
  const settings = await getSettings();
  const items = [];
  const errors = [];
  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    const title = p.title || "(\u672A\u547D\u540D)";
    try {
      const desc = await generateSkillDescriptor(
        { title: p.title, body: p.body, summary: p.summary, tags: p.tags },
        settings
      );
      const linked = getSkillNameForPrompt(p.id);
      const name2 = linked ? linked : toKebab(desc?.name ?? "") || fallbackName(title, i);
      const description = desc?.description?.trim() || p.summary?.trim() || "";
      const whenToUse = desc?.whenToUse?.trim() || "";
      setSkillNameForPrompt(p.id, name2);
      const dir = join3(skillsRoot(), name2);
      await mkdir2(dir, { recursive: true });
      const fm = ["---", `name: ${name2}`];
      if (description) fm.push(foldDescription(description));
      else fm.push('description: ""');
      if (whenToUse) fm.push(`whenToUse: ${JSON.stringify(whenToUse)}`);
      fm.push("---");
      const md = [...fm, "", buildSkillBody(p.body), ""].join("\n");
      await writeFile3(join3(dir, "SKILL.md"), md, "utf8");
      items.push({ title, name: name2 });
    } catch (e) {
      errors.push({ title, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return { generated: items.length, items, errors, aiUnavailable: false };
}

// src/host/services/update/update.ts
import { get as httpsGet } from "node:https";
import { appendFileSync as appendFileSync2, mkdirSync as mkdirSync3, readFileSync as readFileSync3 } from "node:fs";
import { exec } from "node:child_process";
import { dirname as dirname4, join as join4 } from "node:path";
var REGISTRY_URL = "https://registry.npmjs.org/@sunjuntao%2fdsh-prompt-library/latest";
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
      silentErr: (msg) => `\u9759\u9ED8\u81EA\u52A8\u66F4\u65B0 \u5F02\u5E38 ${msg}`
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
    silentErr: (msg) => `Silent auto-update error ${msg}`
  };
}
function logVersion(msg) {
  try {
    const logPath = join4(logDir(), "version.log");
    mkdirSync3(dirname4(logPath), { recursive: true });
    appendFileSync2(logPath, `[${localTime2()}] ${msg}
`);
  } catch {
  }
}
function currentVersion() {
  try {
    const pkgPath = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync3(pkgPath, "utf8"));
    return typeof pkg.version === "string" && pkg.version ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
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
    const req = httpsGet(url, { headers }, (res) => {
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
  if (npm) {
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
async function upgradePlugin(target, gitRef = "") {
  const profile = process.env.DSH_PLUGIN_PROFILE || "web";
  const pkg = "@sunjuntao/dsh-prompt-library";
  let version = target;
  if (!version) {
    try {
      const info = await checkUpdate(true);
      if (info.hasUpdate && /^\d+\.\d+\.\d+/.test(info.latest)) {
        version = info.latest;
        gitRef = info.gitTag || "";
      }
    } catch {
    }
  }
  const targetStr = version && /^\d+\.\d+\.\d+/.test(version) ? `${pkg}@${version}` : pkg;
  const cmd = process.env.DSH_PLUGIN_UPGRADE_CMD || (gitRef ? `dsh plugin --profile ${profile} add github:${GITHUB_REPO}#${gitRef}` : `dsh plugin --profile ${profile} add ${targetStr}`);
  const vlog = buildVersionLogCopy(await readGlobalLocale());
  logVersion(vlog.upgradeStart(version || pkg, cmd));
  return new Promise((resolve) => {
    exec(cmd, { timeout: UPGRADE_TIMEOUT_MS }, (err, stdout, stderr) => {
      const output = (stdout + (stderr ? `
${stderr}` : "")).trim().slice(0, 1e3);
      if (err) {
        logVersion(vlog.upgradeFail(output || String(err)));
        resolve({ ok: false, output: output || String(err) });
        return;
      }
      cache = null;
      logVersion(vlog.upgradeOk);
      resolve({ ok: true, output });
    });
  });
}
var autoUpdating = false;
async function autoUpdateDaily() {
  if (autoUpdating) return;
  autoUpdating = true;
  try {
    if (!await isAutoUpdateEnabled()) {
      logVersion("\u81EA\u52A8\u66F4\u65B0 \u5DF2\u5173\u95ED\uFF0C\u8DF3\u8FC7");
      return;
    }
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
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logVersion(buildVersionLogCopy(await readGlobalLocale().catch(() => "")).silentErr(msg));
  } finally {
    autoUpdating = false;
  }
}

// src/host/services/assistant/activity.ts
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
  /** 消费一次投影出的阶段更新。 */
  onInput(input) {
    this.phase = input.phase;
    this.doneAt = input.phase === "done" ? this.now() : void 0;
    this.failedAt = input.phase === "failed" ? this.now() : void 0;
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
  /** 渲染当前决策：done/failed 的展示窗口到期后回落 idle。 */
  render() {
    const nowMs = this.now();
    const doneSettled = this.phase === "done" && this.doneAt !== void 0 && nowMs - this.doneAt >= this.config.celebrateMs;
    const failedSettled = this.phase === "failed" && this.failedAt !== void 0 && nowMs - this.failedAt >= this.config.failureMs;
    return {
      phase: doneSettled || failedSettled ? "idle" : this.phase,
      sessionActive: this.sessionActive
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
var displayMachine;
var displayActive = false;
function getActivity() {
  if (displayMachine === void 0) {
    return { phase: "idle", sessionActive: displayActive };
  }
  return displayActive ? displayMachine.render() : { phase: "idle", sessionActive: false };
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
    const next = projectEvent(event, proj);
    if (next === void 0) return;
    displayActive = true;
    displayMachine?.onInput(next);
    displayMachine?.onSessionActive();
  };
  const onDisposed = (session) => {
    perSession.delete(String(session.id));
    if (perSession.size === 0) {
      displayActive = false;
      displayMachine?.onSessionDisposed();
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

// src/host/services/update/version-notes.ts
var VERSION_NOTES = [
  {
    version: "0.8.12",
    date: "2026-08-25",
    zh: {
      title: "\u672C\u5730\u7248\u672C\u8BF4\u660E \xB7 \u8BBE\u7F6E\u7236\u5B50\u5C42\u7EA7 \xB7 \u7248\u6743\u4FE1\u606F",
      items: [
        "\u516C\u544A\u8BFB\u53D6\u8C03\u6574\uFF1A\u4F7F\u7528\u624B\u518C\u8D70\u672C\u5730 i18n \u591A\u8BED\u8A00\uFF0C\u7248\u672C\u8BF4\u660E\u6539\u7531\u5185\u7F6E VERSION_NOTES \u7BA1\u7406\uFF0C\u4E0D\u518D\u8BFB\u53D6\u7F51\u7EDC JSON\u3002",
        "\u7248\u672C\u8BF4\u660E\u5C55\u793A\u4F18\u5316\uFF1A\u516C\u544A\u4E2D\u4EC5\u5C55\u793A\u6700\u65B0\u4E00\u4E2A\u7248\u672C\uFF08\u5F53\u524D\u8FD0\u884C\u7248\u672C\uFF09\u7684\u6807\u9898 + \u66F4\u65B0\u8981\u70B9\uFF0C\u544A\u522B\u591A\u7248\u672C\u5806\u53E0\u3002",
        "\u8BBE\u7F6E\u9762\u677F\u7236\u5B50\u5C42\u7EA7\uFF1A\u81EA\u52A8\u5B66\u4E60\u3001\u8BCD\u5E93\u52A9\u624B\u4E24\u4E2A\u4E3B\u5F00\u5173\u4E0B\u5747\u6539\u4E3A\u7F29\u8FDB\u5C42\u7EA7+\u7F6E\u7070\u4E0D\u4E22\u503C\uFF0C\u5173\u95ED\u7236\u5F00\u5173\u53EA\u7981\u7528\u4E0D\u6539\u52FE\u9009\u72B6\u6001\u3002",
        "\u663E\u793A\u63A7\u5236\uFF1A\u65B0\u589E\u300C\u663E\u793A\u516C\u544A\u300D\u5F00\u5173\uFF0C\u9ED8\u8BA4\u5F00\u542F\uFF1B\u5173\u95ED\u8BCD\u5E93\u52A9\u624B\u65F6\u516C\u544A/\u5DE5\u5177\u9762\u677F\u5B50\u5F00\u5173\u4EC5\u7070\u663E\u4FDD\u7559\u539F\u503C\u3002",
        "\u7EC4\u4EF6\u7F6E\u7070\u80FD\u529B\uFF1ANumberRow / TextRow / SelectRow \u7EDF\u4E00\u652F\u6301 disabled\uFF0C\u4E0E ToggleRow \u4EA4\u4E92\u98CE\u683C\u4E00\u81F4\u3002",
        "\u8BBE\u7F6E\u5E95\u90E8\u7F72\u540D\u533A\u65B0\u589E\u7248\u6743\u4FE1\u606F\u680F\uFF1A\xA9 \u5E74\u4EFD \u4F5C\u8005 \xB7 All rights reserved \xB7 MIT \u8BB8\u53EF\u8BC1 + \u514D\u8D23\u58F0\u660E\uFF0C\u901A\u7528\u5F00\u6E90\u683C\u5F0F\u3002"
      ]
    },
    en: {
      title: "Local release notes \xB7 Settings parent-child hierarchy \xB7 Copyright footer",
      items: [
        "Announcement source reworked: user guide now ships with plugin i18n; release notes read from built-in VERSION_NOTES, no longer fetch remote JSON.",
        "Release notes display: dialog shows only the latest (current) version \u2014 title + highlights, no stacked history.",
        "Settings parent-child hierarchy: auto-learn and assistant sections now use indent-based children with gray-out on disabled, preserving saved values when toggling parents.",
        'Visibility controls: added "Show announcement" toggle (default on); closing the assistant only disables (never clears) announcement / right-panel sub-toggles.',
        "Row components disabled support: NumberRow / TextRow / SelectRow all accept disabled props, matching ToggleRow interaction style.",
        "Copyright footer added below signature: \xA9 year author \xB7 All rights reserved \xB7 MIT badge + disclaimer in standard OSS format."
      ]
    }
  },
  {
    version: "0.8.11",
    date: "2026-08-25",
    zh: {
      title: "\u516C\u544A\u52A8\u6001\u914D\u7F6E \xB7 \u81EA\u52A8\u66F4\u65B0 \xB7 \u6A21\u677F\u53D8\u91CF\u4F18\u5316",
      items: [
        "\u516C\u544A\u52A8\u6001\u914D\u7F6E\uFF1A\u53CC\u51FB\u8BCD\u5E93\u52A9\u624B\u5373\u53EF\u67E5\u770B\u516C\u544A\uFF0C\u4F7F\u7528\u624B\u518C\u4E0E\u901A\u544A\u5185\u5BB9\u968F\u7248\u672C\u5185\u7F6E\u5E76\u652F\u6301\u591A\u8BED\u8A00\u5207\u6362\u3002",
        "\u81EA\u52A8\u66F4\u65B0\uFF1A\u65B0\u589E\u81EA\u52A8\u66F4\u65B0\u5F00\u5173\u4E0E\u66F4\u65B0\u63D0\u9192\uFF0C\u7248\u672C\u68C0\u67E5\u4EE5 npm \u4E3A\u4E3B\u6E90\u3001GitHub Release \u515C\u5E95\uFF0C\u53D1\u73B0\u65B0\u7248\u672C\u540E\u53EF\u6309\u914D\u7F6E\u540E\u53F0\u9759\u9ED8\u5B89\u88C5\u3002",
        "\u6A21\u677F\u53D8\u91CF\u4F18\u5316\uFF1A\u63D2\u5165 {{\u53D8\u91CF}} \u65F6\u805A\u7126\u8F93\u5165\u6846\uFF0C\u9884\u89C8\u533A\u81EA\u52A8\u6EDA\u52A8\u5B9A\u4F4D\u5230\u5BF9\u5E94\u4F4D\u7F6E\uFF1B\u672A\u586B\u53D8\u91CF\u4F1A\u62E6\u622A\u63D2\u5165\u5E76\u63D0\u793A\uFF0C\u907F\u514D\u9057\u6F0F\u3002",
        "\u8BCD\u5E93\u52A9\u624B\uFF1A\u65B0\u589E\u53CC\u51FB\u4E8B\u4EF6\uFF0C\u53CC\u51FB\u5C0F\u4EBA\u5F39\u51FA\u516C\u544A\u5F39\u7A97\uFF1B\u52A9\u624B\u6C14\u6CE1\u63D0\u793A\u4E0E\u6D3B\u52A8\u72B6\u6001\u52A8\u753B\u540C\u6B65\u4F18\u5316\u3002",
        "\u516C\u544A\u663E\u793A\u63A7\u5236\uFF1A\u65B0\u589E\u300C\u663E\u793A\u516C\u544A\u300D\u5F00\u5173\uFF0C\u5173\u95ED\u540E\u53CC\u51FB\u8BCD\u5E93\u52A9\u624B\u4E0D\u518D\u5F39\u51FA\u516C\u544A\uFF0C\u9ED8\u8BA4\u5F00\u542F\uFF0C\u4EC5\u5728\u663E\u793A\u8BCD\u5E93\u52A9\u624B\u65F6\u53EF\u914D\u7F6E\u3002",
        "\u4F7F\u7528\u624B\u518C\u672C\u5730\u5316\uFF1A\u516C\u544A\u4E2D\u7684\u4F7F\u7528\u624B\u518C\u652F\u6301 i18n \u591A\u8BED\u8A00\u5207\u6362\uFF0C\u8DDF\u968F\u7CFB\u7EDF\u8BED\u8A00\u81EA\u52A8\u53D8\u66F4\u3002"
      ]
    },
    en: {
      title: "Dynamic announcements \xB7 Auto updates \xB7 Template variables",
      items: [
        "Dynamic announcements: double-click the assistant to open the announcement dialog; guides and release notes ship with the plugin and follow the system locale.",
        "Auto updates: new auto-update toggle and notifications; npm registry is the primary source with GitHub Releases fallback; can install in the background when enabled.",
        "Template variables: focus handler auto-scrolls preview to the highlighted segment; unfilled variables now block insert with an inline warning.",
        "Assistant enhancements: double-click gesture opens announcements; bubble hints and activity state animations are polished.",
        "Announcement visibility: new toggle to enable/disable the announcement dialog (default on, only configurable when the assistant is visible).",
        "Localized user guide: the embedded usage guide follows the system language."
      ]
    }
  },
  {
    version: "0.8.10",
    date: "2026-08-24",
    zh: {
      title: "\u6A21\u677F\u53D8\u91CF\u672A\u586B\u6821\u9A8C \xB7 \u9884\u89C8\u6EDA\u52A8\u5B9A\u4F4D",
      items: [
        "\u6A21\u677F\u53D8\u91CF\u63D2\u5165\u65F6\uFF0C\u9009\u4E2D\u67D0\u4E2A\u53D8\u91CF\u8F93\u5165\u6846\u4F1A\u81EA\u52A8\u6EDA\u52A8\u9884\u89C8\u533A\u57DF\u5230\u5BF9\u5E94\u7247\u6BB5\u3002",
        "\u672A\u586B\u5199\u7684\u53D8\u91CF\u4F1A\u62E6\u622A\u63D2\u5165\u64CD\u4F5C\uFF0C\u5E76\u805A\u7126\u5230\u7B2C\u4E00\u4E2A\u672A\u586B\u5199\u7684\u53D8\u91CF\u8F93\u5165\u6846\uFF0C\u9632\u6B62\u6F0F\u586B\u3002",
        "\u63D0\u793A\u8BCD\u6807\u9898 40 \u5B57\u9650\u5236\u6536\u7D27\u5230 25 \u5B57\uFF0C\u5199\u5165\u4E0E\u663E\u793A\u4E24\u7AEF\u7EDF\u4E00 clamp\u3002",
        "\u4E94\u7EF4\u7075\u9B42\u8FB9\u754C\u4F18\u5316\uFF1A\u5B66\u4E60\u7ECF\u9A8C/\u98CE\u683C\u6D1E\u5BDF\u4E0D\u518D\u65E0\u9650\u8FFD\u52A0\uFF0C\u53EA\u4FDD\u7559\u6700\u8FD1 20 \u6761\u5E76\u505A\u76F8\u4F3C\u5408\u5E76\u3002"
      ]
    },
    en: {
      title: "Template variable validation \xB7 preview scroll-to-segment",
      items: [
        "When focusing a variable input, the preview scrolls to the highlighted segment automatically.",
        "Unfilled variables now block insert and focus the first empty input, preventing missing values.",
        "Prompt title max length tightened to 25 chars on both write and display.",
        "Soul boundary MEMORY/USER no longer append indefinitely; only the most recent 20 entries are kept with similar-entry merging."
      ]
    }
  },
  {
    version: "0.8.9",
    date: "2026-08-23",
    zh: {
      title: "# \u5B9E\u65F6\u7B5B\u9009\u89E6\u53D1 \xB7 \u81EA\u52A8\u5B66\u4E60\u8D28\u91CF\u8FC7\u6EE4",
      items: [
        "\u8F93\u5165 # \u5B9E\u65F6\u7B5B\u9009\u8BCD\u5E93\uFF0C\u8F93\u5165\u7B5B\u9009\u8BCD\u3001\u2191\u2193 \u9009\u62E9\u3001\u56DE\u8F66\u63D2\u5165\u3001\u7A7A\u683C\u7ED3\u675F\u3001Esc \u5173\u95ED\u3002",
        "\u81EA\u52A8\u5B66\u4E60\u65B0\u589E isLowQuality \u8FC7\u6EE4\uFF08\u7A7A\u767D\u3001\u7EAF\u8868\u60C5\u3001\u5BA2\u5957\u95EE\u5019\u3001\u5355\u5B57\u5E94\u7B54\u7B49\uFF09\uFF0C\u51CF\u5C11\u8BEF\u5165\u5E93\u5783\u573E\u63D0\u793A\u8BCD\u3002",
        "\u65B0\u589E isLearnWorthy \u4FE1\u606F\u5BC6\u5EA6\u5224\u65AD\uFF1A\u591A\u53E5/\u5217\u8868/\u5360\u4F4D\u7B26\u7B49\u7ED3\u6784\u53EF\u5B66\u9608\u503C\u4F4E\uFF1B\u65E0\u7ED3\u6784\u5355\u53E5\u9700 2 \u500D\u957F\u5EA6\u624D\u5B66\u3002",
        "\u8FD1\u4F3C\u53BB\u91CD\uFF1A\u7528\u5B57\u7B26\u4E8C\u5143\u7EC4 Jaccard \u76F8\u4F3C\u5EA6\u505A\u6A21\u7CCA\u53BB\u91CD\uFF0C\u9AD8\u5EA6\u91CD\u590D\u7684\u76F8\u4F3C\u6587\u672C\u4E0D\u518D\u91CD\u590D\u5165\u5E93\u3002",
        "\u57FA\u7840\u6807\u9898\u68B3\u7406 buildTitle\uFF1A\u9996\u884C\u53BB\u9664 markdown \u6807\u8BB0\uFF0C\u8D85\u957F\u4F18\u5148\u53E5\u672B\u65AD\u53E5\uFF0C\u907F\u514D\u751F\u786C\u622A\u65AD\u3002"
      ]
    },
    en: {
      title: "# live filter trigger \xB7 auto-learn quality gates",
      items: [
        "Type # to open the library with live filtering; arrow keys to select, Enter to insert, Space to end, Esc to close.",
        "Auto-learn low-quality filter: rejects blanks, pure emoji/symbols, greetings, one-word replies.",
        "isLearnWorthy density gate: structural prompts (lists / placeholders / multi-sentence) accepted sooner; unstructured single sentences need 2x length.",
        "Near-duplicate detection via character bigram Jaccard: highly similar prompts no longer re-enter the library.",
        "Basic title builder buildTitle: strips markdown prefixes and prefers sentence-end breaks before length clamping."
      ]
    }
  }
];
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

// src/host/services/update/announcement.ts
var MANUAL_KEYS = [
  "pl.announce.manual.0",
  "pl.announce.manual.1",
  "pl.announce.manual.2",
  "pl.announce.manual.3",
  "pl.announce.manual.4"
];
var MANUAL_FALLBACK = {
  zh: [
    "\u8F93\u5165 # \u547C\u51FA\u8BCD\u5E93\uFF1A\u5B9E\u65F6\u7B5B\u9009\u3001\u2191\u2193 \u9009\u62E9\u3001\u56DE\u8F66\u63D2\u5165",
    "\u81EA\u52A8\u5B66\u4E60\u804A\u5929\u4E2D\u6709\u4EF7\u503C\u7684\u63D0\u793A\u8BCD\uFF0C\u53EF\u968F\u65F6\u7F16\u8F91\u6216\u5220\u9664",
    "\u652F\u6301 AI \u4F18\u5316\u4E0E\u667A\u80FD\u5B8C\u5584\uFF0C\u63D0\u5347\u63D0\u793A\u8BCD\u8D28\u91CF",
    "\u652F\u6301 {{\u53D8\u91CF}} \u5360\u4F4D\u7B26\uFF0C\u63D2\u5165\u65F6\u5F39\u7A97\u9010\u4E2A\u586B\u5199",
    "\u4FA7\u8FB9\u680F / \u804A\u5929\u9762\u677F\u53CC\u5165\u53E3\u7BA1\u7406\u8BCD\u5E93\uFF0C\u652F\u6301\u5BFC\u51FA\u4E0E\u5907\u4EFD"
  ],
  en: [
    "Type # to open the library: live filter, up/down to select, Enter to insert",
    "Automatically learn valuable prompts from chats; edit or delete anytime",
    "AI polish and smart enrichment to improve prompt quality",
    "Supports {{variable}} placeholders, filled in a popup before insert",
    "Manage the library from the sidebar / chat panel, with export & backup"
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
  return { source: "local", lang: L, manual, versions };
}

// src/host/routes/routes.ts
var PREFIX2 = "/api/prompt-library";
function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
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
function extractIds(body) {
  const list = typeof body === "object" && body !== null && Array.isArray(body.ids) ? body.ids : Array.isArray(body) ? body : [];
  return list.filter((x) => typeof x === "string");
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
        const prompt = await autoLearn(text, body.tag, body.skipEnrich);
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
      if (method === "POST" && promptId) {
        const updated = await recordUsage(promptId);
        if (!updated) return json(res, 404, { ok: false, error: "not found" });
        return json(res, 200, { ok: true, data: updated });
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
      if (method === "POST" && tail === "/skills/generate") {
        const raw = await readJsonBody(req);
        const ids = extractIds(raw);
        if (ids.length === 0) {
          return json(res, 400, { ok: false, error: "invalid body: {ids: string[]}" });
        }
        const result = await generateSkillsFromPrompts(ids);
        return json(res, 200, { ok: true, data: result });
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
        const settings = await getSettings();
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
      if (method === "GET" && tail === "/settings") {
        const settings = await getSettings();
        return json(res, 200, { ok: true, data: settings });
      }
      if (method === "GET" && tail === "/update") {
        const info = await checkUpdate();
        return json(res, 200, { ok: true, data: info });
      }
      if (method === "POST" && tail === "/update/apply") {
        const result = await upgradePlugin();
        return json(res, 200, { ok: result.ok, data: result });
      }
      if (method === "PUT" && tail === "/settings") {
        const raw = await readJsonBody(req);
        if (typeof raw !== "object" || raw === null) {
          return json(res, 400, { ok: false, error: "invalid body" });
        }
        const settings = await updateSettings(raw);
        return json(res, 200, { ok: true, data: settings });
      }
      if (method === "GET" && tail === "/activity") {
        const data = getActivity();
        return json(res, 200, { ok: true, data });
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
      if (method === "GET" && tail === "/stats") {
        const [stats, snapshots] = await Promise.all([
          computeLibraryStats(),
          listStatsSnapshots(12)
        ]);
        return json(res, 200, { ok: true, data: { stats, snapshots } });
      }
      return json(res, 404, { ok: false, error: `no route ${method} ${tail}` });
    } catch (err) {
      console.error("[prompt-library] \u8BF7\u6C42\u5904\u7406\u5931\u8D25:", err instanceof Error ? err.stack || err.message : err);
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

// src/host/services/harness/harness.ts
import { readFileSync as readFileSync4, statSync as statSync2 } from "node:fs";
import { mkdir as mkdir3, readFile as readFile3, writeFile as writeFile4 } from "node:fs/promises";
import { dirname as dirname5 } from "node:path";
var DEFAULT_HARNESS = `# HARNESS \xB7 \u4F1A\u8BDD\u4E0A\u4E0B\u6587

> \u672C\u6587\u4EF6\u5185\u5BB9\u4F1A\u968F\u5F53\u524D\u4F1A\u8BDD\u7684\u6BCF\u6B21\u53D1\u9001\u81EA\u52A8\u6CE8\u5165\u7ED9\u6A21\u578B\uFF0C\u662F\u6A21\u578B\u5E94\u5F53\u9075\u5B88\u7684\u5185\u90E8\u4E0A\u4E0B\u6587\u3002

## \u4F60\u7684\u8EAB\u4EFD
- \u4F60\u662F\u5E26\u300C\u8BCD\u5E93\u300D\u63D2\u4EF6\u7684\u52A9\u624B\uFF0C\u5F53\u524D\u4F1A\u8BDD\u96C6\u6210\u4E86\u8BCD\u5E93\u80FD\u529B\u3002

## \u4F60\u62E5\u6709\u7684\u80FD\u529B
- /prompts -add <\u6B63\u6587>\uFF1A\u4FDD\u5B58\u63D0\u793A\u8BCD\uFF0CAI \u81EA\u52A8\u751F\u6210\u6807\u9898\u4E0E\u6807\u7B7E
- /prompts -tag <\u6807\u7B7E> <\u6B63\u6587>\uFF1A\u6309\u6307\u5B9A\u6807\u7B7E\u4FDD\u5B58
- /prompts -s <\u5173\u952E\u8BCD>\uFF1A\u68C0\u7D22\u8BCD\u5E93
- /prompts -AI <\u6B63\u6587>\uFF1AAI \u6DA6\u8272\u6B63\u6587
- /prompts -enrich <\u6B63\u6587>\uFF1AAI \u4E13\u4E1A\u5B8C\u5584\uFF08\u6269\u5199\uFF09
- /prompts -e\uFF1A\u5BFC\u51FA\u5168\u90E8\u63D0\u793A\u8BCD
- /prompts -data\uFF1A\u67E5\u770B\u5B9E\u65F6\u7EDF\u8BA1 + \u8FD1 7 \u5929\u5386\u53F2\u5FEB\u7167
- /prompts -h\uFF1A\u67E5\u770B\u5B8C\u6574\u4F7F\u7528\u624B\u518C
- \u4FA7\u8FB9\u680F\u8BCD\u5E93\u4E0E\u804A\u5929\u6846\u63D0\u793A\u8BCD\u6309\u94AE\uFF1A\u968F\u65F6\u63D2\u5165 / \u590D\u5236 / \u6DA6\u8272\u63D0\u793A\u8BCD

## \u4F7F\u7528\u89C4\u5219
- \u7528\u6237\u63D0\u5230\u300C\u8BCD\u5E93 / \u4FDD\u5B58\u63D0\u793A\u8BCD / \u6DA6\u8272 / \u5B8C\u5584\u300D\u7B49\u65F6\uFF0C\u4F18\u5148\u5F15\u5BFC\u6216\u4F7F\u7528\u4E0A\u8FF0\u80FD\u529B\uFF1B
- \u9664\u975E\u7528\u6237\u4E3B\u52A8\u8981\u6C42\uFF0C\u4E0D\u8981\u4E3B\u52A8\u89E3\u91CA\u63D2\u4EF6\u7528\u6CD5\uFF0C\u4E5F\u4E0D\u8981\u590D\u8FF0\u672C\u6587\u4EF6\u5185\u5BB9\uFF1B
- \u4FDD\u6301\u7B80\u6D01\u3001\u52A1\u5B9E\uFF1B\u5982\u542F\u7528\u4E86\u4EBA\u683C\uFF0C\u9075\u5FAA\u5176\u4E2D\u7684\u6027\u683C\u4E0E\u8BED\u6C14\u3002
`;
async function ensureHarnessFile() {
  try {
    await readFile3(harnessPath(), "utf8");
  } catch {
    await mkdir3(dirname5(harnessPath()), { recursive: true });
    await writeFile4(harnessPath(), DEFAULT_HARNESS, "utf8");
  }
}
var harnessCache = null;
function harnessMeta() {
  try {
    const s = statSync2(harnessPath());
    return { mtimeMs: s.mtimeMs, size: s.size };
  } catch {
    return null;
  }
}
function harnessSystemSync() {
  const meta = harnessMeta();
  const cached = harnessCache;
  if (cached && meta && cached.meta && cached.meta.mtimeMs === meta.mtimeMs && cached.meta.size === meta.size) {
    return cached.assembled;
  }
  if (cached && !meta && !cached.meta) return cached.assembled;
  let content = "";
  try {
    content = stripBom(readFileSync4(harnessPath(), "utf8")).trim();
  } catch {
    void ensureHarnessFile().catch(() => {
    });
  }
  const assembled = content ? `\u3010HARNESS \xB7 \u4F1A\u8BDD\u4E0A\u4E0B\u6587 / \u4F7F\u7528\u89C4\u5219\u3011
\uFF08\u4EE5\u4E0B\u4E3A\u5185\u90E8\u4E0A\u4E0B\u6587\uFF0C\u4E0D\u8981\u5411\u7528\u6237\u56DE\u663E\uFF1B\u6309\u9700\u4F7F\u7528\u5176\u4E2D\u7684\u80FD\u529B\u4E0E\u89C4\u5219\uFF09
${content}` : "";
  harnessCache = { meta, assembled };
  return assembled;
}

// src/manual.ts
var manualZh = [
  "dsh-prompt-library \u8BCD\u5E93 \u2014 \u4F7F\u7528\u624B\u518C",
  "==========================================",
  "",
  "\u3010\u4E00\u3001\u8FD9\u662F\u4EC0\u4E48\u63D2\u4EF6\u3011",
  "\u5185\u7F6E\u4E8E\u804A\u5929\u754C\u7684\u63D0\u793A\u8BCD\u7BA1\u7406\u5DE5\u5177\uFF0C\u5E2E\u4F60\u7CFB\u7EDF\u6027\u5730\u4FDD\u5B58\u3001\u6574\u7406\u3001\u68C0\u7D22\u548C\u590D\u7528\u4F18\u8D28\u63D0\u793A\u8BCD\u3002\u4E3B\u8981\u7531\u4E09\u90E8\u5206\u7EC4\u6210\uFF1A",
  "- \u4FA7\u8FB9\u680F\u8BCD\u5E93\uFF1A\u53F3\u4FA7\u56FA\u5B9A\u5BBD\u5EA6\u9762\u677F\uFF08\u53EF\u5C55\u5F00/\u6298\u53E0\uFF09\uFF0C\u6D4F\u89C8\u3001\u641C\u7D22\u3001\u7BA1\u7406\u6240\u6709\u5DF2\u4FDD\u5B58\u7684\u63D0\u793A\u8BCD\uFF1B",
  "- \u804A\u5929\u6846\u63D0\u793A\u8BCD\u6309\u94AE\uFF1A\u8F93\u5165\u6846\u65C1\u7684\u4E00\u952E\u5165\u53E3\uFF0C\u968F\u65F6\u63D2\u5165\u6216\u590D\u5236\u63D0\u793A\u8BCD\uFF1B\u9009\u4E2D\u6587\u5B57\u53EF\u76F4\u63A5 AI \u4F18\u5316\uFF1B",
  "- Slash \u547D\u4EE4\uFF1A\u8F93\u5165 /prompts \u5F00\u5934\u7684\u547D\u4EE4\uFF0C\u76F4\u63A5\u4FDD\u5B58\u3001AI \u4F18\u5316\u6216\u7528 AI \u8865\u9F50\u65B0\u63D0\u793A\u8BCD\u3002",
  "\u6240\u6709\u6570\u636E\u5B58\u5728\u672C\u5730 SQLite\uFF08~/.dsh/prompt-library/db/prompts.db\uFF09\uFF0C\u4E0D\u4E0A\u4F20\u4E91\u7AEF\uFF0C\u5BFC\u51FA/\u5BFC\u5165\u5907\u4EFD\u90FD\u7531\u4F60\u638C\u63A7\u3002",
  "",
  "\u3010\u4E8C\u3001\u6838\u5FC3\u547D\u4EE4\u3011",
  "\uFF08/prompts \u540E\u52A1\u5FC5\u52A0\u4E00\u4E2A\u7A7A\u683C\u518D\u8F93\u5165\uFF1B\u547D\u4EE4\u4E0D\u533A\u5206\u5927\u5C0F\u5199\uFF0C\u652F\u6301\u7B80\u5316\u522B\u540D\uFF09",
  "- /prompts -add <\u6B63\u6587>\uFF1A\u4FDD\u5B58\u6B63\u6587\uFF0CAI \u81EA\u52A8\u751F\u6210\u6807\u9898\u4E0E\u6807\u7B7E\uFF08\u522B\u540D -ad\uFF09",
  "- /prompts -tag <\u6807\u7B7E> <\u6B63\u6587>\uFF1A\u6309\u6307\u5B9A\u6807\u7B7E\u4FDD\u5B58\uFF08\u522B\u540D -t\uFF09",
  "- /prompts -s <\u5173\u952E\u8BCD>\uFF1A\u68C0\u7D22\u8BCD\u5E93\uFF0C\u6807\u9898/\u6B63\u6587\u5339\u914D\uFF0C\u5927\u5C0F\u5199\u4E0D\u654F\u611F",
  "- /prompts -enrich <\u6B63\u6587>\uFF1AAI \u4E13\u4E1A\u5B8C\u5584\uFF08\u522B\u540D -en\uFF09\uFF0C\u6269\u5199\u4E3A\u66F4\u4E13\u4E1A/\u5168\u9762/\u7ED3\u6784\u5B8C\u6574\u7684\u7248\u672C\uFF0C\u7ED3\u679C\u6253\u5370\u5728\u804A\u5929\u8FD4\u56DE\u3001\u81EA\u884C\u590D\u5236",
  "- /prompts -e\uFF1A\u5BFC\u51FA\u5168\u90E8\u63D0\u793A\u8BCD\uFF08\u522B\u540D -exp\uFF0C\u7EAF\u6587\u672C\uFF0C\u53EF\u76F4\u63A5\u590D\u5236\uFF09",
  "- /prompts -data\uFF1A\u8F93\u51FA\u5B9E\u65F6\u7EDF\u8BA1 + \u6700\u8FD1 7 \u5929\u5386\u53F2\u5FEB\u7167\uFF0C\u672B\u5C3E\u9644 AI \u70B9\u8BC4\uFF08\u522B\u540D -d\uFF09",
  "- /prompts -AI <\u6B63\u6587>\uFF1A\u5BF9\u6B63\u6587\u505A AI \u4F18\u5316\uFF08\u522B\u540D -a\uFF09\uFF0C\u7ED3\u679C\u6253\u5370\u5728\u804A\u5929\u8FD4\u56DE\u3001\u81EA\u884C\u590D\u5236",
  "- /prompts -h\uFF1A\u663E\u793A\u672C\u624B\u518C\uFF08-help/--help \u4EA6\u53EF\uFF09",
  "- /prompts\uFF1A\u5355\u72EC\u8F93\u5165\uFF0C\u5217\u51FA\u5168\u90E8\u53EF\u7528\u547D\u4EE4\u793A\u4F8B",
  "",
  "\u4FDD\u5B58\u65F6\u7684\u884C\u4E3A\uFF1A",
  "- \u6B63\u6587\u4E3A\u7A7A\u4F1A\u62E6\u622A\u63D0\u793A\uFF0C\u4E0D\u4F1A\u4FDD\u5B58\uFF1B",
  "- \u4E0E\u5DF2\u6709\u63D0\u793A\u8BCD\u91CD\u590D\u65F6\u76F4\u63A5\u590D\u7528\uFF0C\u4E0D\u5236\u9020\u5197\u4F59\uFF1B",
  "- \u4FDD\u5B58\u540E\u6240\u6709\u7528\u5230\u63D0\u793A\u8BCD\u7684\u5730\u65B9\uFF08\u4FA7\u8FB9\u680F\u3001\u804A\u5929\u6846\u9762\u677F\u3001\u8BCD\u5E93\u7BA1\u7406\uFF09\u81EA\u52A8\u5237\u65B0\u3002",
  "",
  "\u3010\u4E09\u3001\u4FA7\u8FB9\u680F\u8BCD\u5E93\u3011",
  "- \u5C55\u5F00/\u6298\u53E0\uFF1A\u70B9\u51FB\u9762\u677F\u9876\u90E8\u7684\u6309\u94AE\u53EF\u6536\u8D77\u4E3A\u8FB9\u7F18\u5C0F\u6309\u94AE\uFF0C\u518D\u6B21\u70B9\u51FB\u6062\u590D\uFF0C\u4E0D\u5F71\u54CD\u804A\u5929\uFF1B",
  "- \u5206\u7EC4\u6D4F\u89C8\uFF1A\u6309\u300C\u6700\u8FD1\u4F7F\u7528\u300D\u300C\u6807\u7B7E\u300D\u300C\u672A\u5206\u7C7B\u300D\u5206\u7EC4\uFF0C\u540C\u4E00\u63D0\u793A\u8BCD\u53EF\u540C\u65F6\u51FA\u73B0\u5728\u6700\u8FD1\u4F7F\u7528\u4E0E\u5176\u6807\u7B7E\u5206\u7EC4\uFF1B",
  "- \u641C\u7D22\uFF1A\u9876\u90E8\u8F93\u5165\u5173\u952E\u8BCD\u5B9E\u65F6\u8FC7\u6EE4\uFF0C\u547D\u4E2D\u6807\u9898\u4E0E\u6B63\u6587\u7684\u5173\u952E\u8BCD\u9AD8\u4EAE\u663E\u793A\uFF1B",
  "- \u6807\u7B7E\u8FC7\u6EE4\uFF1A\u70B9\u51FB\u6807\u7B7E\u82AF\u7247\u53EF\u4E0E\u5173\u952E\u8BCD\u641C\u7D22\u53E0\u52A0\u7B5B\u9009\uFF1B",
  "- \u63D2\u5165\uFF1A\u70B9\u51FB\u67D0\u6761\u63D0\u793A\u8BCD\uFF0C\u5176\u6B63\u6587\u4F1A\u6309\u9700\u505A\u53D8\u91CF\uFF08{{\u53D8\u91CF}}\uFF09\u586B\u5145\u540E\u63D2\u5165\u804A\u5929\u6846\uFF1B",
  "- \u5E38\u89C1\u64CD\u4F5C\uFF1A\u63D2\u5165\u3001\u590D\u5236\u3001\u8986\u76D6\u539F\u6587\u3001\u7F16\u8F91\u3001\u8F6F\u5220\u9664\uFF08\u8FDB\u56DE\u6536\u7AD9\uFF09\uFF1B",
  "- \u60AC\u505C\u8BE6\u60C5\uFF1A\u5728\u6761\u76EE\u4E0A\u505C\u7559\u7247\u523B\uFF0C\u5DE6\u4FA7\u6ED1\u51FA\u8BE6\u60C5\u5361\u7247\u4FBF\u4E8E\u5FEB\u901F\u6D4F\u89C8\uFF08\u53EF\u5728\u8BBE\u7F6E\u4E2D\u5173\u95ED\uFF09\u3002",
  "",
  "\u3010\u56DB\u3001\u804A\u5929\u6846\u63D0\u793A\u8BCD\u6309\u94AE\u3011",
  "- \u4E00\u952E\u6253\u5F00\u6700\u8FD1\u4F7F\u7528/\u5E38\u7528\u63D0\u793A\u8BCD\u5217\u8868\uFF0C\u76F4\u63A5\u63D2\u5165\u5F53\u524D\u4F1A\u8BDD\uFF1B",
  "- \u8F93\u5165 # \u89E6\u53D1\u8BCD\u5E93\u9009\u62E9\uFF1A\u7EE7\u7EED\u8F93\u5165\u53EF\u5B9E\u65F6\u7B5B\u9009\uFF0C\u2191\u2193 \u9009\u62E9\u3001\u56DE\u8F66\u63D2\u5165\uFF0C\u7A7A\u683C\u6216 Esc \u7ED3\u675F\uFF08\u53EF\u5728\u8BBE\u7F6E\u4E2D\u5173\u95ED\uFF09\uFF1B",
  "- \u5DE5\u5177\u680F\u9009\u4E2D\u6587\u672C\u540E\u53EF\u7528 AI \u4F18\u5316\uFF08\u6B64\u5165\u53E3\u4E0D\u5904\u7406 {{}} \u53D8\u91CF\uFF09\uFF1B",
  "- \u9009\u4E2D\u6DFB\u52A0\u63D0\u793A\u8BCD\uFF08\u9ED8\u8BA4\u5173\u95ED\uFF0C\u53EF\u5728\u8BBE\u7F6E\u5F00\u542F\uFF09\uFF1A\u5728\u804A\u5929\u5185\u5BB9\u4E2D\u9AD8\u4EAE\u9009\u4E2D\u6587\u5B57\uFF0C\u6D6E\u51FA\u300C\u6DFB\u52A0\u63D0\u793A\u8BCD\u300D\u6309\u94AE\uFF0C\u72EC\u7ACB\u7A97\u53E3\u586B\u5199\u6807\u9898/\u6807\u7B7E/\u6B63\u6587\u540E\u4FDD\u5B58\uFF0C\u4E5F\u53EF\u76F4\u63A5\u590D\u5236\u9009\u4E2D\u6587\u5B57\u3002",
  "",
  "\u3010\u4E94\u3001\u53D8\u91CF\u6A21\u677F\u3011",
  "- \u6B63\u6587\u53EF\u7528 {{\u53D8\u91CF\u540D}} \u5360\u4F4D\uFF0C\u4F8B\u5982\uFF1A\u8BF7\u7528{{\u8BED\u6C14}}\u7684\u8BED\u6C14\uFF0C\u5411{{\u8BFB\u8005}}\u4ECB\u7ECD{{\u4E3B\u9898}}\u3002\uFF1B",
  "- \u63D2\u5165\u65F6\u5F39\u51FA\u586B\u5145\u754C\u9762\uFF0C\u81EA\u52A8\u8BB0\u5FC6\u4E0A\u6B21\u586B\u8FC7\u7684\u503C\uFF0C\u540C\u53D8\u91CF\u540D\u4E0B\u6B21\u81EA\u52A8\u5E26\u51FA\u3002",
  "",
  "\u3010\u516D\u3001AI \u80FD\u529B\u3011",
  "- AI \u667A\u80FD\u5B8C\u5584\uFF1A\u4FDD\u5B58\u540E\u81EA\u52A8\u63D0\u70BC\u6807\u9898\u3001\u6807\u7B7E\u4E0E\u6458\u8981\uFF0C\u5E76\u5728\u8BCD\u5E93\u5185\u4F18\u5316\u6539\u5199\u6B63\u6587\uFF1B",
  "- AI \u4F18\u5316\uFF1A\u6253\u78E8\u9009\u4E2D\u6587\u672C\u3002\u804A\u5929\u6846\u5165\u53E3\u4E0D\u4FDD\u7559 {{}} \u53D8\u91CF\uFF0C\u5176\u4ED6\u5165\u53E3\uFF08\u4FA7\u8FB9\u680F\u3001\u786E\u8BA4\u5361\uFF09\u9ED8\u8BA4\u4FDD\u7559\u5E76\u53EF\u65B0\u589E\uFF1B",
  "- \u81EA\u52A8\u5B66\u4E60\uFF08\u9ED8\u8BA4\u5173\u95ED\uFF09\uFF1A\u8F93\u5165\u8F83\u957F\u6B63\u6587\u5E76\u505C\u987F\u7247\u523B\u540E\u81EA\u52A8\u4FDD\u5B58\u5230\u8BCD\u5E93\uFF0C\u53EF\u5F00\u542F\u624B\u52A8\u786E\u8BA4\u540E\u518D\u5165\u5E93\uFF0C\u5E76\u53EF\u9009\u8C03\u7528 AI \u667A\u80FD\u5B8C\u5584\u3002",
  "",
  "\u3010\u4E03\u3001\u6570\u636E\u4E0E\u7EDF\u8BA1\u3011",
  "- \u5BFC\u5165/\u5BFC\u51FA\uFF1A\u53EF\u5728\u8BBE\u7F6E \u2192 \u8BCD\u5E93\u7BA1\u7406\u4E2D\u52FE\u9009\u8303\u56F4\u5BFC\u51FA\u4E3A\u5907\u4EFD\uFF0C\u4E5F\u53EF\u5BFC\u5165\u6062\u590D\uFF1B",
  "- \u6807\u7B7E\u7BA1\u7406\uFF1A\u7EDF\u4E00\u65B0\u5EFA\u3001\u91CD\u547D\u540D\u3001\u5220\u9664\uFF1B\u6B63\u5728\u88AB\u4F7F\u7528\u7684\u6807\u7B7E\u7981\u6B62\u5220\u9664\uFF08\u4F1A\u63D0\u793A\u5F53\u524D\u7528\u91CF\uFF09\uFF1B",
  "- \u56DE\u6536\u7AD9\uFF1A\u8F6F\u5220\u9664\u7684\u63D0\u793A\u8BCD\u5728\u6B64\uFF0C\u652F\u6301\u5355\u6761\u6216\u6279\u91CF\u300C\u6062\u590D/\u6C38\u4E45\u5220\u9664\u300D\uFF1B",
  "- \u6BCF\u5468\u81EA\u52A8\u7EDF\u8BA1\uFF1A\u6BCF 7 \u5929\u81EA\u52A8\u751F\u6210\u4E00\u6B21\u300C\u8FD1 7 \u5929\u300D\u7684\u589E\u91CF\u7EDF\u8BA1\u5FEB\u7167\uFF08\u65B0\u589E/\u4F7F\u7528/AI \u5B8C\u5584\uFF09\uFF0C\u5728 /prompts -data \u7ED3\u5C3E\u5C55\u793A\uFF0C\u4E0D\u4F1A\u91CD\u590D\u7EDF\u8BA1\uFF1B",
  "- \u5220\u9664\u786E\u8BA4\uFF1A\u6D89\u53CA\u5220\u9664\u7684\u64CD\u4F5C\u4F7F\u7528\u81EA\u5B9A\u4E49\u786E\u8BA4\u5F39\u7A97\uFF0C\u907F\u514D\u8BEF\u5220\u3002",
  "",
  "\u3010\u516B\u3001\u4EBA\u683C\uFF08\u5B9E\u9A8C\u5BA4\u529F\u80FD\uFF09\u3011",
  "- \u4EBA\u683C\u6587\u4EF6\uFF1A~/.dsh/prompt-library/character/SOUL.md\uFF0C\u805A\u5408\u8EAB\u4EFD\u3001\u6027\u683C/\u8BED\u6C14\u3001\u5DE5\u4F5C\u89C4\u8303\uFF1B",
  "- \u5185\u5BB9\u9700\u624B\u52A8\u586B\u5199\u7EF4\u62A4\uFF0C\u5F62\u6210\u7A33\u5B9A\u7684\u52A9\u624B\u4EBA\u683C\uFF1B\u88AB\u5220\u9664\u7684\u6587\u4EF6\u4F1A\u5728\u4E0B\u6B21\u542F\u52A8\u65F6\u81EA\u52A8\u91CD\u5EFA\u4E3A\u9ED8\u8BA4\u6A21\u677F\uFF1B",
  "- \u5728\u8BBE\u7F6E\u4E2D\u52FE\u9009\u300C\u6574\u4E2A\u804A\u5929\u5E94\u7528\u4EBA\u683C\u300D\u540E\uFF0C\u4F1A\u7EA6\u675F\u4E4B\u540E\u65B0\u5EFA\u7684\u4F1A\u8BDD\uFF08\u4E0D\u5F71\u54CD\u8FDB\u884C\u4E2D\u7684\u5BF9\u8BDD\uFF09\u3002",
  "",
  "\u3010\u4E5D\u3001\u5E38\u89C1\u95EE\u9898\u3011",
  "Q\uFF1A\u4FDD\u5B58\u540E\u9762\u677F\u6CA1\u53D8\u5316\uFF1F",
  "A\uFF1A\u786E\u8BA4\u5DF2\u91CD\u542F dsh web \u4F7F\u65B0\u7248\u672C\u751F\u6548\uFF1B\u4FDD\u5B58\u540E\u4F1A\u81EA\u52A8\u5237\u65B0\u6240\u6709\u9762\u677F\u3002",
  "",
  "Q\uFF1A/prompts -AI \u6CA1\u53CD\u5E94\uFF1F",
  "A\uFF1AAI \u4F18\u5316\u4F9D\u8D56\u53EF\u7528\u7684\u5927\u6A21\u578B\uFF0C\u82E5\u63D0\u793A\u300CAI \u670D\u52A1\u4E0D\u53EF\u7528\u300D\u8BF7\u68C0\u67E5\u6A21\u578B\u914D\u7F6E\u3002",
  "",
  "Q\uFF1A\u6570\u636E\u5B58\u5728\u54EA\u91CC\uFF1F\u4F1A\u4E0D\u4F1A\u4E22\uFF1F",
  "A\uFF1A\u672C\u5730 SQLite\uFF08~/.dsh/prompt-library/db/prompts.db\uFF09\uFF0C\u5EFA\u8BAE\u5B9A\u671F\u7528\u300C\u8BCD\u5E93\u7BA1\u7406 \u2192 \u5BFC\u51FA\u300D\u5907\u4EFD\u3002",
  "",
  "Q\uFF1A\u6807\u7B7E\u5220\u4E0D\u6389\uFF1F",
  "A\uFF1A\u8BE5\u6807\u7B7E\u6B63\u88AB\u63D0\u793A\u8BCD\u4F7F\u7528\uFF0C\u8BF7\u5148\u79FB\u9664\u6216\u5230\u8BCD\u5E93\u7BA1\u7406\u6E05\u7406\uFF1B\u4FDD\u62A4\u673A\u5236\u4F1A\u963B\u6B62\u5220\u9664\u5728\u7528\u6807\u7B7E\u3002"
].join("\n");
var manualEn = [
  "dsh-prompt-library \u2014 User Manual",
  "================================",
  "",
  "[1. What This Plugin Is]",
  "A prompt management tool built into the chat interface. It saves, organizes, searches, and reuses the prompts you use often. Main parts:",
  "- Sidebar prompt library: fixed-width right panel (collapsible) to browse, search, and manage all prompts;",
  "- Chat-box prompt button: a one-click entry beside the input box to insert or copy a prompt; select text to AI-polish it;",
  "- Slash commands: type /prompts-prefixed commands to save, AI-polish, or let AI fill in a prompt.",
  "Everything runs locally (SQLite at ~/.dsh/prompt-library/db/prompts.db); nothing is uploaded to the cloud; export/import backups are fully under your control.",
  "",
  "[2. Core Commands]",
  "(Remember the space after /prompts; commands are case-insensitive with short aliases)",
  "- /prompts -add <body>: save the body; AI generates title and tags (alias -ad)",
  "- /prompts -tag <tag> <body>: save with a specific tag (alias -t)",
  "- /prompts -s <keyword>: search the library, matching title/body, case-insensitive",
  "- /prompts -enrich <body>: AI professional enrichment (alias -en), expand into a more professional/complete/structured version; result printed in chat for you to copy",
  "- /prompts -e: export all prompts (alias -exp; plain text, ready to copy)",
  "- /prompts -data: realtime stats + last-7-days history snapshot + AI comment (alias -d)",
  "- /prompts -AI <body>: AI-polish the body (alias -a); result printed in chat for you to copy",
  "- /prompts -h: show this manual (-help/--help also work)",
  "- /prompts: type it alone to list all available command examples",
  "",
  "When saving:",
  "- Empty input is blocked with a hint and not saved;",
  "- A duplicate body is reused instead of duplicated;",
  "- After saving, every place using prompts (sidebar, chat-box panel, data management) refreshes automatically.",
  "",
  "[3. Sidebar Prompt Library]",
  "- Expand / collapse: click the button on top to collapse the panel to an edge button; click again to restore, without affecting the chat;",
  "- Grouped browsing: Recently used / Tags / Uncategorized; a prompt can appear under both Recently used and its tag group;",
  "- Search: type a keyword for live filtering; matches in titles and bodies are highlighted;",
  "- Tag filter: click tag chips to stack on top of keyword search;",
  "- Insert: click a prompt to insert its body into the chat box after variable ({{variable}}) filling;",
  "- Common actions: insert, copy, overwrite, edit, soft delete (to recycle bin);",
  "- Hover detail: hover an item briefly to slide out a detail card on its left (can be disabled in settings).",
  "",
  "[4. Chat-box Prompt Button]",
  "- One-click to open the Recently used / common prompts list and insert into the current session;",
  "- Type # to trigger library selection: keep typing to filter live, \u2191\u2193 to select, Enter to insert, Space or Esc to finish (can be disabled in settings);",
  "- Select text in the toolbar and invoke AI polish (this entry does not process {{}} variables);",
  '- Selection add prompt (off by default, enable in settings): highlight text in the chat, an "Add prompt" button floats up; fill title/tags/body in a separate window to save, or copy the selection directly.',
  "",
  "[5. Variable Templates]",
  "- Use {{variableName}} placeholders, e.g.: Explain {{topic}} to {{audience}} in a {{tone}} tone.;",
  "- The fill dialog remembers the last value you filled per variable name, so it is filled in automatically next time.",
  "",
  "[6. AI Capabilities]",
  "- AI enrichment: automatically extracts title, tags, and summary after saving, and refines the body inside the library;",
  "- AI polish: refines selected text. The chat-box entry does not preserve {{}} variables; other entries keep them and can add new ones;",
  "- Auto-learn (off by default): after typing a longer body and pausing, it is saved to the library automatically; optional manual confirm before saving, optionally with AI enrichment.",
  "",
  "[7. Data & Stats]",
  "- Import / export: export a selected scope as a backup, or import to restore, in Settings \u2192 Data management;",
  "- Tag management: create, rename, delete; tags in use cannot be deleted (the usage count is shown);",
  "- Recycle bin: soft-deleted prompts are here; restore or permanently delete single items or in bulk;",
  "- Weekly auto-stats: every 7 days a snapshot of the last-7-days increments (added/used/AI-refined) is generated and shown at the end of /prompts -data; no double counting;",
  "- Delete confirmation: delete operations use a custom confirm dialog to avoid accidents.",
  "",
  "[8. Personality (Lab Feature)]",
  "- Personality file: ~/.dsh/prompt-library/character/SOUL.md, combining identity, tone, and work guidelines;",
  "- Fill it in manually to form a stable assistant personality; a deleted file is rebuilt with the default template on the next startup;",
  '- Enable "Apply personality to the whole chat" in settings to constrain new conversations (does not affect ongoing ones).',
  "",
  "[9. FAQ]",
  "Q: Why doesn't the panel update after saving?",
  "A: Make sure you restarted dsh web so the new version takes effect; panels refresh automatically after saving.",
  "",
  "Q: /prompts -AI does nothing?",
  'A: AI polishing depends on an available model; if you see "AI service is unavailable", check your model config.',
  "",
  "Q: Where is my data? Could it be lost?",
  "A: It lives in local SQLite (~/.dsh/prompt-library/db/prompts.db); back it up via Data management \u2192 Export regularly.",
  "",
  "Q: Why can't I delete a tag?",
  "A: The tag is in use by some prompts. Remove it from those prompts first, or clean up via data management; the protection blocks deleting in-use tags."
].join("\n");

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
  ensureSoulFile().catch(() => {
  });
  ensureHarnessFile().catch(() => {
  });
  ctx.inject(["systemPrompt"], (promptCtx) => {
    const sp = promptCtx.systemPrompt;
    const dispose = sp.section({
      name: "prompt-library-character",
      order: 50,
      text: (context) => {
        const scope = context?.scope;
        const parts = [];
        parts.push(harnessSystemSync());
        if (shouldInjectChatCharacter(scope)) parts.push(soulSystemSync());
        const welcome = welcomePromptOnce(scope);
        if (welcome) parts.push(welcome);
        return parts.filter((p) => p.trim()).join("\n\n");
      }
    });
    return () => {
      dispose();
    };
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
            "-help": "help"
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
  const weeklySnapshotTimer = setInterval(() => {
    void checkAndGenerateWeeklySnapshot();
  }, 24 * 60 * 60 * 1e3);
  void checkAndGenerateWeeklySnapshot();
  return () => {
    disposeActivity?.();
    if (weeklySnapshotTimer) clearInterval(weeklySnapshotTimer);
    if (versionTimer) clearInterval(versionTimer);
  };
}
var WEEK_MS2 = 7 * 24 * 60 * 60 * 1e3;
async function checkAndGenerateWeeklySnapshot() {
  try {
    const lastAt = await getLastSnapshotAt().catch(() => 0);
    if (lastAt > 0 && Date.now() - lastAt < WEEK_MS2) return;
    const stats = await computeWeeklyStats();
    await saveStatsSnapshot(stats);
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
