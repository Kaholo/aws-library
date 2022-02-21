const _ = require("lodash");
const aws = require("aws-sdk");
const parsers = require("./parsers");
const core = require("./core");
const awsPlugin = require("../index");
const consts = require("./consts.json");

/**
 * Maps parameters passed to Autocomplete function to an object with parsed values.
 *
 * @param params: [ { value: any, name: string, type: string } ]
 * Array of values passed to autocomplete function as action parameters.
 *
 * @returns {*} - object with params names as keys and parsed values
 */
function parseActionParameters(params) {
  return params.reduce((acc, {
    value, name, type, valueType,
  }) => ({
    ...acc,
    [name]: parsers.resolveParser(type || valueType)(value),
  }), {});
}

function handleInput(awsService, actionParams, pluginSettings) {
  const [params, settings] = [actionParams, pluginSettings].map(parseActionParameters);
  const client = core.getServiceInstance(awsService, params, settings);
  return { params, settings, client };
}

function simpleItemsFilter(autocompleteItems, query) {
  let result = autocompleteItems;
  if (query) {
    const qWords = query.split(/[. ]/g).map((word) => word.toLowerCase());
    result = result.filter((item) => qWords
      .every((word) => item.value.toLowerCase().includes(word)))
      .sort((word1, word2) => word1.value.toLowerCase().indexOf(qWords[0])
          - word2.value.toLowerCase().indexOf(qWords[0]));
  } else {
    result = result.sort((a, b) => (a.value >= b.value ? 1 : -1));
  }

  return result.splice(0, consts.MAX_AUTOCOMPLETE_RESULTS);
}

async function simpleList(awsService, listFuncName, pathToArray, pathToValue) {
  return async (query, pluginSettings, actionParams) => {
    const { client } = awsPlugin.autocomplete.handleInput(aws.S3, actionParams, pluginSettings);
    const response = await client[listFuncName].promise();

    const result = _.get(response, pathToArray).map((object) => {
      const value = _.get(object, pathToValue);
      return {
        id: value,
        value,
      };
    });

    return simpleItemsFilter(result, query);
  };
}

function listRegions(query = "") {
  const autocompleteList = consts.ALL_AWS_REGIONS.map(({ regionId, regionLabel }) => ({
    id: regionId,
    value: `${regionId} - ${regionLabel}`,
  }));

  return simpleItemsFilter(autocompleteList, query);
}

function getRegionLabel(regionId) {
  return consts.ALL_AWS_REGIONS.find((region) => region.regionId === regionId).regionLabel;
}

module.exports = {
  parseActionParameters,
  handleInput,
  simpleItemsFilter,
  simpleList,
  listRegions,
  getRegionLabel,
};
