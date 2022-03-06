const _ = require("lodash");
const parsers = require("./parsers");
const core = require("./core");
const consts = require("./consts.json");

/**
 * @param params: [ { value: any, name: string, type: string } ]
 * Array of values passed to autocomplete function as action parameters.
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

function itemsFilter(autocompleteItems, query) {
  if (query) {
    const queryWords = query.split(/[. ]/g).map(_.toLower);
    const wordInValue = (value, word) => value.toLowerCase().includes(word);
    const filteredResult = autocompleteItems.filter((item) =>
      queryWords.every(
        (word) => wordInValue(item.value, word)
      ));

    return _.sortBy(filteredResult, ["value"]);
  }
  return _.sortBy(
    autocompleteItems.slice(0, consts.MAX_AUTOCOMPLETE_RESULTS),
    ["value"]);
}

function autocompleteListFromAwsCall(awsService, listFuncName, pathToArray, pathToValue) {
  return async (query, pluginSettings, actionParams) => {
    const { client } = handleInput(awsService, actionParams, pluginSettings);
    const response = await client[listFuncName]().promise();
    const result = _.get(response, pathToArray)
      .map((object) => itemFromValue(_.get(object, pathToValue)));

    return itemsFilter(result, query);
  }
}

function listRegions(query = "") {
  const autocompleteList = consts.ALL_AWS_REGIONS.map(({ regionId, regionLabel }) => ({
    id: regionId,
    value: `${regionId} - ${regionLabel}`,
  }));

  return itemsFilter(autocompleteList, query);
}

function itemFromValue(value, label = value) {
  return {
    id: value,
    value: label,
  };
}

function getRegionLabel(regionId) {
  return consts.ALL_AWS_REGIONS.find((region) => region.regionId === regionId).regionLabel;
}

module.exports = {
  parseActionParameters,
  handleInput,
  listRegions,
  getRegionLabel,
  itemFromValue,
  autocompleteListFromAwsCall,
  itemsFilter,
};
