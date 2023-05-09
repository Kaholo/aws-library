const _ = require("lodash");
const helpers = require("./helpers");
const autocomplete = require("./autocomplete");
const consts = require("./consts.json");

function generateAwsMethod(functionName, payloadFunction = null) {
  return (awsServiceClient, params, region) => {
    if (!_.hasIn(awsServiceClient, functionName)) {
      throw new Error(`No method "${functionName}" found on client!`);
    }
    const payload = helpers.removeUndefinedAndEmpty(
      payloadFunction
        ? payloadFunction(params, region)
        : params,
    );

    return awsServiceClient[functionName](payload).promise();
  };
}

function bootstrap(
  awsService,
  pluginMethods,
  autocompleteFuncs = {},
  credentialLabels = consts.DEFAULT_CREDENTIAL_LABELS,
) {
  const bootstrappedPluginMethods = _.entries(pluginMethods)
    .map(([methodName, awsMethod]) => ({
      [methodName]: generatePluginMethod(awsService, awsMethod, credentialLabels),
    }));

  const bootstrappedAutocompleteFuncs = _.entries(autocompleteFuncs)
    .map(([funcName, autocompleteFunc]) => ({
      [funcName]: generateAutocompleteFunction(awsService, autocompleteFunc, credentialLabels),
    }));

  return _.merge(...bootstrappedPluginMethods, ...bootstrappedAutocompleteFuncs);
}

function generateAutocompleteFunction(awsService, autocompleteFunction, credentialLabels) {
  return async (query, pluginSettings, actionParams) => {
    const [params, settings] = [actionParams, pluginSettings]
      .map(autocomplete.mapAutocompleteFuncParamsToObject);

    const awsServiceClient = getServiceInstance(awsService, params, settings, credentialLabels);
    const region = helpers.readRegion(params, settings, credentialLabels.REGION);

    return autocompleteFunction(
      query,
      params,
      awsServiceClient,
      region,
      { pluginSettings, actionParams },
    );
  };
}

function generatePluginMethod(awsService, pluginMethod, credentialLabels) {
  return async (action, settings) => {
    const awsServiceClient = getServiceInstance(
      awsService,
      action.params,
      settings,
      credentialLabels,
    );
    const params = helpers.readActionArguments(action, credentialLabels);
    const region = helpers.readRegion(action.params, settings, credentialLabels.REGION);

    // The last parameter is mostly ignored and passed here only to provide user
    // the possibility to access original parameters.
    return pluginMethod(awsServiceClient, params, region, { action, settings }).then((result) => {
      if (_.isNil(result) || _.isEmpty(result)) {
        return consts.OPERATION_FINISHED_SUCCESSFULLY_MESSAGE;
      }
      return result;
    });
  };
}

function getServiceInstance(
  AWSService,
  actionParams,
  settings,
  credentialsLabels = consts.DEFAULT_CREDENTIAL_LABELS,
) {
  const credentials = helpers.readCredentials(actionParams, settings, credentialsLabels);
  return new AWSService(credentials);
}

module.exports = {
  generateAwsMethod,
  bootstrap,
};
