const _ = require("lodash");
const helpers = require("./helpers");
const autocomplete = require("./autocomplete");
const consts = require("./consts.json");

function mapToAwsMethod(functionName, payloadFunction = null) {
  return (client, params, region) => {
    if (!_.has(client, functionName)) {
      throw new Error(`No method "${functionName}" found on client!`);
    }
    const payload = helpers.removeUndefinedAndEmpty(
      payloadFunction
        ? payloadFunction(params, region)
        : params,
    );

    return client[functionName](payload).promise();
  };
}

function bootstrap(awsService, pluginMethods, autocompleteFuncs) {
  const bootstrappedPluginMethods = _.entries(pluginMethods)
    .reduce((bootstrapped, [methodName, pluginMethod]) => ({
      ...bootstrapped,
      [methodName]: wrapPluginMethod(awsService, pluginMethod),
    }), {});

  const bootstrappedAutocompleteFuncs = _.entries(autocompleteFuncs)
    .reduce((bootstrapped, [funcName, autocompleteFunc]) => ({
      ...bootstrapped,
      [funcName]: wrapAutocompleteFunction(awsService, autocompleteFunc),
    }), {});

  return _.merge(bootstrappedPluginMethods, bootstrappedAutocompleteFuncs);
}

function wrapAutocompleteFunction(awsService, autocompleteFunction) {
  return async (query, pluginSettings, actionParams) => {
    const [params, settings] = [actionParams, pluginSettings]
      .map(autocomplete.mapAutocompleteFuncParamsToObject);

    const client = getServiceInstance(awsService, params, settings);
    const region = helpers.readRegion(params, settings);

    return autocompleteFunction(query, params, client, region, { pluginSettings, actionParams });
  };
}

function wrapPluginMethod(awsService, pluginMethod) {
  return async (action, settings) => {
    const client = getServiceInstance(awsService, action.params, settings);
    const params = helpers.readActionArguments(action);
    const region = helpers.readRegion(action.params, settings);

    return pluginMethod(client, params, region, { action, settings });
  };
}

function getServiceInstance(
  AWSService,
  actionParams,
  settings,
  credentialsLabels = consts.DEFAULT_CREDENTIAL_LABELS,
) {
  this.credentials = helpers.readCredentials(actionParams, settings, credentialsLabels);
  return new AWSService(this.credentials);
}

module.exports = {
  mapToAwsMethod,
  bootstrap,
};

