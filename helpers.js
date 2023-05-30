const _ = require("lodash");
const { parsers } = require("@kaholo/plugin-library");

const consts = require("./consts.json");

function removeCredentials(params, labels = consts.DEFAULT_CREDENTIAL_LABELS) {
  return { ..._.omit(params, _.values(labels)) };
}

function readRegion(
  params,
  label = consts.DEFAULT_CREDENTIAL_LABELS.REGION,
) {
  if (!_.has(params, label)) {
    console.warn(`Region parameter not specified, using default value: "${consts.DEFAULT_REGION}"`);
  }
  return _.has(params, label) ? parsers.autocomplete(params[label]) : consts.DEFAULT_REGION;
}

function readCredentials(
  params,
  labels = consts.DEFAULT_CREDENTIAL_LABELS,
) {
  const areCredentialsDefined = (
    _.has(params, labels.ACCESS_KEY)
    && _.has(params, labels.SECRET_KEY)
  );
  if (!areCredentialsDefined) {
    throw new Error("Credential labels has not been found in params");
  }

  return {
    accessKeyId: params[labels.ACCESS_KEY],
    secretAccessKey: params[labels.SECRET_KEY],
    region: readRegion(params, labels.REGION),
  };
}

function removeUndefinedAndEmpty(object) {
  if (!_.isPlainObject(object)) {
    return object;
  }
  return _.omitBy(object, (value) => value === "" || _.isNil(value) || (_.isObjectLike(value) && _.isEmpty(value)));
}

function tryParseJson(value) {
  if (!_.isString(value)) {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function buildTagSpecification(resourceType, tags) {
  if (resourceType === "" || _.isNil(resourceType)) {
    throw new Error("Resource type cannot be empty nor null / undefined");
  }
  if (_.isNil(tags)) {
    return [];
  }
  const unparsedTags = !_.isArray(tags) ? [tags] : tags;

  if (_.isEmpty(_.compact(unparsedTags))) {
    return [];
  }

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
  buildTagSpecification,
};
