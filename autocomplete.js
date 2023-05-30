const _ = require("lodash");
const consts = require("./consts.json");

function listRegions(query = "") {
  const autocompleteList = consts.ALL_AWS_REGIONS.map(({ regionId, regionLabel }) => (
    toAutocompleteItemFromPrimitive(regionId, `${regionId} - ${regionLabel}`)
  ));

  return filterItemsByQuery(autocompleteList, query);
}

function getRegionLabel(regionId) {
  const foundRegion = consts.ALL_AWS_REGIONS.find((region) => region.regionId === regionId);
  if (_.isNil(foundRegion)) {
    throw new Error(`Could not find a region label for region id: "${regionId}"`);
  }
  return foundRegion.regionLabel;
}

function autocompleteListFromAwsCall(listFuncName, pathToArray = "", pathToValue = "") {
  return async (query, params, awsServiceClient) => {
    if (!_.hasIn(awsServiceClient, listFuncName)) {
      throw new Error(`Method "${listFuncName}" doesn't exist on service`);
    }
    const response = await awsServiceClient[listFuncName]().promise();

    if (pathToArray !== "" && !_.has(response, pathToArray)) {
      throw new Error(`Path "${pathToArray}" doesn't exist on method call response`);
    }
    const autocompleteItems = (pathToArray === "" ? response : _.get(response, pathToArray))
      .map((object) => {
        if (pathToValue !== "" && (_.isArray(object) || !_.has(object, pathToValue))) {
          throw new Error(`Path "${pathToValue}" doesn't exist on elements of array`);
        }
        return toAutocompleteItemFromPrimitive(pathToValue === "" ? object : _.get(object, pathToValue));
      });

    return filterItemsByQuery(autocompleteItems, query);
  };
}

function filterItemsByQuery(autocompleteItems, query) {
  if (!query) {
    return sliceAndSortItems(autocompleteItems);
  }

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

function sliceAndSortItems(items) {
  return _.sortBy(items.slice(0, consts.MAX_AUTOCOMPLETE_RESULTS), ["value"]);
}

module.exports = {
  listRegions,
  getRegionLabel,
  autocompleteListFromAwsCall,
  filterItemsByQuery,
  toAutocompleteItemFromPrimitive,
};
