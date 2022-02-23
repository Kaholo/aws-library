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
  if (_.isNumber(value) && !_.isNaN(value)) {
    return value;
  }
  if (_.isNumber(parseInt(value, 10)) && !_.isNaN(parseInt(value, 10))) {
    return parseInt(value, 10);
  }
  throw new Error(`Value ${value} is not a valid number`);
}

function boolean(value) {
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
  if (_.isNil(value) || _.isEmpty(value)) { return ""; }
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
};
