const _ = require("lodash");
const parsers = require("./parsers");
const consts = require("./consts.json");

function removeCredentials(params, labels = consts.DEFAULT_CREDENTIAL_LABELS) {
  return { ..._.omit(params, _.values(labels)) };
}

function loadConfiguration() {
  try {
    // eslint-disable-next-line global-require
    return require("../../config.json");
  } catch (exception) {
    console.error(exception);
    throw new Error("Could not retrieve the plugin configuration");
  }
}

function readRegion(params, settings, label = consts.DEFAULT_CREDENTIAL_LABELS.REGION) {
  if (!_.has(params, label) && !_.has(settings, label)) {
    throw new Error(`No region has been found under "${label}" in neither params nor settings.`);
  }
  return parsers.autocomplete(params[label]) || parsers.autocomplete(settings[label]);
}

function readCredentials(params, settings, labels = consts.DEFAULT_CREDENTIAL_LABELS) {
  const credentialKeys = [labels.ACCESS_KEY, labels.SECRET_KEY, labels.REGION];
  if (_.difference(credentialKeys, _.keys({ ...params, ...settings })).length !== 0) {
    throw new Error(`Credential labels has not been found on neither params nor settings`);
  }

  return {
    accessKeyId: parsers.string(params[labels.ACCESS_KEY]) || parsers.string(settings[labels.ACCESS_KEY]),
    secretAccessKey: parsers.string(params[labels.SECRET_KEY]) || parsers.string(settings[labels.SECRET_KEY]),
    region: readRegion(params, settings, labels.REGION),
  };
}

function removeUndefinedAndEmpty(object) {
  if (!_.isPlainObject(object)) { return object; }
  return _.omitBy(object, (value) => value === "" || _.isNil(value) || (_.isObjectLike(value) && _.isEmpty(value)));
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

function parseMethodParameter(paramDefinition, value) {
  const valueToParse = value || paramDefinition.default;
  if (_.isNil(valueToParse)) {
    if (paramDefinition.required) {
      throw Error(`Missing required "${paramDefinition.name}" value`);
    }
    return valueToParse;
  }

  const parserToUse = paramDefinition.parserType || paramDefinition.type;
  return parsers.resolveParser(parserToUse)(valueToParse);
}

function readActionArguments(
  action,
  credentialLabels = consts.DEFAULT_CREDENTIAL_LABELS,
) {
  const method = loadMethodFromConfiguration(action.method.name);
  const paramValues = removeUndefinedAndEmpty(action.params);

  if (_.isNil(method)) {
    throw new Error(`Could not find a method "${action.method.name}" in config.json`);
  }

  method.params.forEach((paramDefinition) => {
    paramValues[paramDefinition.name] = parseMethodParameter(
      paramDefinition,
      paramValues[paramDefinition.name],
    );
  });

  return removeCredentials(
    removeUndefinedAndEmpty(paramValues),
    credentialLabels
  );
}

function prepareParametersForAnotherMethodCall(methodName, params, additionalParams = {}) {
  const methodDefinition = loadMethodFromConfiguration(methodName);
  if (_.isNil(methodDefinition)) { throw new Error(`No method "${methodName}" found in config!`); }
  return _.entries(_.merge(params, additionalParams))
    .reduce((methodParameters, [key, value]) => {
      const paramDefinition = _.find(methodDefinition.params, { name: key });
      if (_.isNil(paramDefinition)) { return methodParameters; }

      return {
        ...methodParameters,
        [key]: parseMethodParameter(paramDefinition, value),
      };
    }, {});
}

function buildTagSpecification(resourceType, tags) {
  if (resourceType === "" || _.isNil(resourceType)) {
    throw new Error("Resource type cannot be empty nor null / undefined");
  }
  if (_.isNil(tags)) {
    throw new Error("Tags cannot be null nor undefined");
  }
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
  buildTagSpecification,
  prepareParametersForAnotherMethodCall,
};
