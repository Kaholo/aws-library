const _ = require("lodash");

function object(value) {
  if (_.isObject(value)) { return value; }
  if (_.isString(value)) {
    try {
      return JSON.parse(value);
    } catch (e) {
      throw new Error(`Couldn't parse provided value as object: ${value}`);
    }
  }
  throw new Error(`${value} is not a valid object`);
}

function number(value) {
  const validNumber = (value) => _.isNumber(value) && _.isFinite(value) && !_.isNaN(value);
  if (validNumber(value)) {
    return value;
  }
  if (validNumber(parseFloat(value))) {
    return parseFloat(value);
  }
  throw new Error(`Value ${value} is not a valid number`);
}

function boolean(value) {
  if (_.isNil(value)) { return false; }
  if (_.isBoolean(value)) { return value; }
  if (_.isString(value) && _.isEmpty(value)) { return false; }
  if (
    _.isString(value)
    && _.includes(["true", "false"], value.toLowerCase().trim())
  ) {
    return value.toLowerCase().trim() === "true";
  }
  throw new Error(`Value ${value} is not of type boolean`);
}

function string(value) {
  if (_.isNil(value)) { return ""; }
  if (_.isString(value)) { return value; }
  throw new Error(`Value ${value} is not a valid string`);
}

function autocomplete(value) {
  if (_.isNil(value)) { return ""; }
  if (_.isString(value)) { return value; }
  if (_.isObject(value) && _.has(value, "id")) { return value.id; }
  throw new Error(`Value "${value}" is not a valid autocomplete result nor string.`);
}

function array(value) {
  if (_.isNil(value)) { return []; }
  if (_.isArray(value)) { return value; }
  if (_.isString(value)) {
    return _.compact(
      value.split("\n").map(_.trim),
    );
  }
  throw new Error("Unsupported array format");
}

const isTagObject = (t) => _.has(t, "Key") && _.has(t, "Value") && _.keys(t).length === 2;

function tag(value) {
  if (_.isNil(value)) { throw new Error("Cannot null or undefined tag!"); }

  if (_.isObject(value) && isTagObject(value)) {
    return value;
  }

  if (_.isString(value)) {
    const [Key, Value] = value.split(/=(.+)/);
    if (!_.isEmpty(Key) && !_.isEmpty(Value)) {
      return { Key: Key.trim(), Value: Value.trim() };
    }
    throw new Error(`Incorrectly formatted tag string: ${value}`);
  }
  throw new Error("Unsupported tags format!");
}

function tagsString(value) {
  const parsedArray = array(value);
  return parsedArray.map(tag);
}

function tags(value) {
  if (_.isNil(value)) { return []; }
  if (_.isArray(value)) {
    if (_.every(value, _.isObject)) {
      return value.map(tag);
    }
    if (_.every(value, _.isString)) {
      return _.flatten(value.map(tagsString));
    }
    throw new Error("Incorrect AWS Tags format");
  }
  if (_.isString(value)) {
    return tagsString(value);
  }
  if (_.isObject(value)) {
    if (isTagObject(value)) { return value; }
    return _.entries(value).map(([Key, Value]) => ({ Key: Key.trim(), Value: Value.trim()}));
  }
  throw new Error("Unsupported tags format!");
}

function resolveParser(type) {
  switch (type) {
    case "object":
      return object;
    case "number":
      return number;
    case "boolean":
      return boolean;
    case "vault":
    case "options":
    case "text":
    case "string":
      return string;
    case "autocomplete":
      return autocomplete;
    case "array":
      return array;
    case "tag":
      return tag;
    case "tags":
      return tags;
    default:
      throw new Error(`Can't resolve parser of type "${type}"`);
  }
}

module.exports = {
  resolveParser,
  string,
  autocomplete,
  boolean,
  number,
  object,
  array,
  tags,
};
