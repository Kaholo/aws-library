const _ = require("lodash");
const parsers = require("./parsers");
const consts = require("./consts.json");

/**
 * @param params: [ { value: any, name: string, type: string } ]
 * Array of values passed to autocomplete function as action parameters.
 */
function mapAutocompleteFuncParamsToObject(params) {
  return params.reduce((acc, {
    value, name, type, valueType,
  }) => ({
    ...acc,
    [name]: parsers.resolveParser(type || valueType)(value),
  }), {});
}

function sliceAndSortItems(items) {
  return _.sortBy(items.slice(0, consts.MAX_AUTOCOMPLETE_RESULTS), ["value"]);
}

function filterItemsByQuery(autocompleteItems, query) {
  if (!query) { return sliceAndSortItems(autocompleteItems); }

  const queryWords = query.split(/[. ]/g).map(_.toLower);
  const filteredResult = autocompleteItems.filter((item) => {
    const wordIsPresentInValue = (word) => item.value.toLowerCase().includes(word);
    return queryWords.every(wordIsPresentInValue);
  });

  return sliceAndSortItems(filteredResult);
}

function toAutocompleteItemFromPrimitive(value, label = value) {
  return {
    id: value,
    value: label,
  };
}

function autocompleteListFromAwsCall(listFuncName, pathToArray, pathToValue) {
  return async (query, params, client) => {
    const response = await client[listFuncName]().promise();
    const autocompleteItems = _.get(response, pathToArray)
      .map((object) => toAutocompleteItemFromPrimitive(_.get(object, pathToValue)));

    return filterItemsByQuery(autocompleteItems, query);
  };
}

function listRegions(query = "") {
  const autocompleteList = consts.ALL_AWS_REGIONS.map(({ regionId, regionLabel }) => ({
    id: regionId,
    value: `${regionId} - ${regionLabel}`,
  }));

  return filterItemsByQuery(autocompleteList, query);
}

function getRegionLabel(regionId) {
  return consts.ALL_AWS_REGIONS.find((region) => region.regionId === regionId).regionLabel;
}

module.exports = {
  mapAutocompleteFuncParamsToObject,
  listRegions,
  getRegionLabel,
  toAutocompleteItemFromPrimitive,
  autocompleteListFromAwsCall,
  filterItemsByQuery,
};
