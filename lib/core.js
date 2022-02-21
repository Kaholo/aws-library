const helpers = require("./helpers");
const consts = require("./consts.json");

function getServiceInstance(
  AWSService,
  actionParams,
  settings,
  credentialsLabels = consts.DEFAULT_CREDENTIAL_LABELS,
) {
  this.credentials = helpers.readCredentials(actionParams, settings, credentialsLabels);
  return new AWSService(this.credentials);
}

function handleInput(awsService, action, settings) {
  return {
    client: getServiceInstance(awsService, action.params, settings),
    region: helpers.readRegion(action.params, settings),
    params: helpers.readActionArguments(action),
  };
}

function mapToAws(service, functionName, payloadFunction = null) {
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

module.exports = {
  handleInput,
  getServiceInstance,
  mapToAws,
};
