const helpers = require("./helpers");
const autocomplete = require("./autocomplete");
const consts = require("./consts.json");
const _ = require("lodash");

function getServiceInstance(
  AWSService,
  actionParams,
  settings,
  credentialsLabels = consts.DEFAULT_CREDENTIAL_LABELS,
) {
  this.credentials = helpers.readCredentials(actionParams, settings, credentialsLabels);
  return new AWSService(this.credentials);
}

function mapToAwsMethod(service, functionName, payloadFunction = null) {
  return (action, settings) => {
    const { client, region, params } = handleInput(service, action, settings);
    const payload = helpers.removeUndefinedAndEmpty(
      payloadFunction
        ? payloadFunction(params, region)
        : params,
    );
    return client[functionName](payload).promise();
  };
}

function wrapPluginMethod(awsService, pluginMethod) {
  return async (action, settings) => {
    const client = getServiceInstance(awsService, action.params, settings);
    const params = helpers.readActionArguments(action);
    const region = helpers.readRegion(action.params, settings);

    return pluginMethod(client, params, region, { action, settings });
  }
}

function wrapAutocompleteFunction(awsService, autocompleteFunction) {
  return async (query, pluginSettings, actionParams) => {
    const [params, settings] = [actionParams, pluginSettings].map(autocomplete.parseActionParameters);
    const client = getServiceInstance(awsService, params, settings);
    const region = helpers.readRegion(params, settings);

    return autocompleteFunction(query, params, client, region, { pluginSettings, actionParams });
  }
}


function boostrap(awsService, pluginMethods, autocompleteFuncs) {
  const bootstrappedPluginMethods = _.entries(pluginMethods)
    .reduce((bootstrapped, [ methodName, pluginMethod ]) => ({
    ...bootstrapped,
    [methodName]: wrapPluginMethod(awsService, pluginMethod),
  }), {});

  const bootstrappedAutocompleteFuncs = _.entries(autocompleteFuncs)
    .reduce((bootstrapped, [ funcName, autocompleteFunc ]) => ({
      ...bootstrapped,
      [funcName]: wrapAutocompleteFunction(awsService, autocompleteFunc),
  }), {})

  return _.merge(bootstrappedPluginMethods, bootstrappedAutocompleteFuncs);
}

module.exports = {
  handleInput,
  getServiceInstance,
  mapToAwsMethod,
};
