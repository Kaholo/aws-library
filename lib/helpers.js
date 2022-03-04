const _ = require("lodash");
const parsers = require("./parsers");
const consts = require("./consts.json");

function removeCredentials(params, labels = consts.DEFAULT_CREDENTIAL_LABELS) {
  return { ..._.omit(params, labels) };
}

function loadConfiguration() {
  try {
    // eslint-disable-next-line global-require
    return require("../../../config.json");
  } catch (exception) {
    console.error(exception);
    throw new Error("Could not retrieve the plugin configuration");
  }
}

function readRegion(params, settings, label = consts.DEFAULT_CREDENTIAL_LABELS[2]) {
  return parsers.autocomplete(params[label]) || parsers.autocomplete(settings[label]);
}

function readCredentials(params, settings, labels = consts.DEFAULT_CREDENTIAL_LABELS) {
  return {
    accessKeyId: parsers.string(params[labels[0]]) || parsers.string(settings[labels[0]]),
    secretAccessKey: parsers.string(params[labels[1]]) || parsers.string(settings[labels[1]]),
    region: readRegion(params, settings),
  };
}

function removeUndefinedAndEmpty(object) {
  return _.omitBy(object, (v) => _.isNil(v) || (_.isObjectLike(v) && _.isEmpty(v)));
}

function tryParseJson(value) {
  if (!_.isString(value)) { return value; }
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
}

function loadMethodFromConfiguration(methodName) {
  const config = loadConfiguration();
  return config.methods.find((m) => m.name === methodName);
}

function readActionArguments(
  action,
  overrideParsers = {},
  credentialLabels = consts.DEFAULT_CREDENTIAL_LABELS,
) {
  const method = loadMethodFromConfiguration(action.method.name);
  const paramValues = removeUndefinedAndEmpty(action.params);

  if (_.isNil(method)) {
    throw new Error(`Could not find a method "${action.method.name}" in config.json`);
  }

  method.params.forEach((paramDefinition) => {
    const value = paramValues[paramDefinition.name] || paramDefinition.default;
    if (_.isNil(value)) {
      if (paramDefinition.required) {
        throw new Error(`Missing required "${paramDefinition.name}" value`);
      }
      return;
    }

    const parserToUse = overrideParsers[paramDefinition.name] || paramDefinition.type;
    paramValues[paramDefinition.name] = parsers.resolveParser(parserToUse)(value);
  });
  return removeCredentials(paramValues, credentialLabels);
}

function convertActionForAnotherMethodCall(methodName, action, additionalParams = {}) {
  const method = loadMethodFromConfiguration(methodName);
  const params = _.merge(...(method.params.map((param) => ({ [param.name]: "" ?? param.default }))));
  _.keys(_.merge(action.params, additionalParams)).forEach((key) => {
    if (_.has(params, key)) {
      params[key] = action.params[key];
    }
  });

  return {
    ...action,
    method: {
      name: methodName,
    },
    params,
  };
}

function handleTagSpecification(resourceType, tags) {
  const unparsedTags = !_.isArray(tags) ? [tags] : tags;

  if (_.isEmpty(_.compact(unparsedTags))) { return []; }

  return [{
    ResourceType: resourceType,
    Tags: _.flatten(unparsedTags.map((v) => parsers.tags(tryParseJson(v)))),
  }];
}

module.exports = {
  removeCredentials,
  removeUndefinedAndEmpty,
  readRegion,
  readCredentials,
  readActionArguments,
  handleTagSpecification,
  convertActionForAnotherMethodCall,
};
