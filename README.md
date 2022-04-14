# Overview
This library is an extention of [Kaholo Plugin Library](https://github.com/Kaholo/kaholo-plugin-library). All concepts introduced in there are still valid here, including the bootstrapping. The only difference is that this library includes AWS specific functionality on top of the generic one.

The bootstrapping allows the plugin methods to take the form of:
```js
function pluginMethod(awsClient, params, region)
```
instead of the typical
```js
function pluginMethod(action, settings)
```

When using the bootstrapping, the developer can always be sure that:
- `awsClient` provided in the first argument is already authenticated instance of given AWS service
- the parameters the plugin method receives are parsed and validated based on their `config.json` definition. Moreover they are already combined with the settings, so no need to handle those separately. The AWS credentials are stripped from the parameters for security reasons.
- the parameters _only_ consists of the values that are defined in `config.json` for the given method. They are also validated and no empty values are present in the `params` object.

# Core library
## bootstrap
```js 
function bootstrap (awsService, pluginMethods, autocompleteFuncs)
```

Allows to use more developer friendly version of plugin methods, removing the necessity of performing such repetitive tasks like manually parsing action arguments and settings or calling the AWS Service constructor.

### Parameters
`awsService` (_function_) – Native AWS API constructor for the AWS service to be used. This constructor will be called with credentials passed to any of the provided plugin methods and it's result will be passed as a method parameter.

`pluginMethods` (_object_) – an object containing all of the plugin methods to be bootstrapped within Kaholo AWS Library. The following parameters will be passed to each and every method provided in this object:
- `client` (_object_) – the AWS service instance, the result of calling `awsService` constructor.
- `params` (_object_) – the object containing all of the parameters passed to an action combined with plugin settings. All of the values in this object are already parsed based on either `type` or `parserType` provided in `config.json`.
- `region` (_string_) – the region that was provided in action parameters or plugin settings in AWS compatible format.
- `originalParameters` (_object_) – the original Kaholo plugin method parameters. The object contains two fields: `actions` and `settings`.

`autocompleteFuncs` (_object_) – an object containing all of the autocomplete functions to be bootstrapped with Kaholo AWS Library. The following parameters will be passed to each and every function provided in this object:
- `query` (_string_) - a query to be used for result filtering
- `params` (_object_) - the object containing all of the parameters passed to an action combined with plugin settings. All of the values in this object are already parsed on either `type` or `parserType` provided in `config.json`.
- `awsServiceClient` (_object_) – the AWS service instance, the result of calling `awsService` constructor.
- `region` (_string_) – the region that was provided in action parameters or plugin settings in AWS compatible format.
- `originalParameters` – the original Kaholo plugin method parameters. The object contains two fields: `actions` and `settings`.


> :information_source: **Note:** <br/>
> Using `originalParameters` in either plugin methods or autocomplete function is generally discouraged in favor of already parsed `params` object. `originalParameters` should only be used in case when access to the raw object is absolutely necessary – if you wonder if you need to use it, you probably don't.

### Returned value
This function returns an objects of bootstrapped functions, ready to be exported form your main plugin script (most likely `app.js`).

### Example usage
- *config.json*
```js
{
	// ...
	"methods": [
		"name": "describeInstances",
		"params": [
			// ...
			{
				"name": "instanceIds",  
				"type": "text",  
				"parserType": "array",  
				"required": true,  
			}
			// ...
		]
	]
}
```
- *app.js*

```js
const aws = require("aws-sdk");
const kaholo = require("kaholo-aws-plugin");

function describeInstances(client, params) {
	// because `instanceIds` is defined in config.json with
	// "parserType": "array", the value of `instanceIds` in `params`
	// will already be parsed as an array - no need to handle this manually!
	const instanceIds = params.instanceIds;
	// Client is aws.EC2 instance, already authenticated with the credentials
	// passed as action params or plugin settings.
	return client.describeInstances({ InstanceIds: instanceIds }).promise(); 
}

module.exports = kaholo.bootstrap(aws.EC2, { describeInstances }, {});
```

---
## generateAwsMethod
```js
function generateAwsMethod (functionName, payloadFunction = null)
```

Provides a shorthand way of simply calling AWS SDK functions for given service. This is useful if the whole plugin method should not contain any logic besides calling the SDK with arguments provided in action parameters.

### Parameters
`functionName` (_string_) – name of AWS service function to be called.

`payloadFunction` (_function_) – a function that should be called on already parsed action arguments. This is useful if there is only a simple manipulation or validation on the parameters is required. The function needs to take two arguments – `params`  (an object containing already parsed action parameters and settings) and `region` (_string_), and should return _object_. The return value will be directly passed as parameter to the function specified with `functionName` .

### Returned value
This function returns another function, that should be passed to the `bootstrap` function, inside `pluginMethods` argument.

### Example usage
```js
const aws = require("aws-sdk");
const kaholo = require("kaholo-aws-library");

const describeInstances = kaholo.generateAwsMethod("describeInstances");

module.exports = kaholo.bootstrap(aws.EC2, { describeInstances }, {});
```

Please note, that:
```js
const describeInstances = kaholo.generateAwsMethod("describeInstances");
```
will generate `describeInstances` as a direct equivalent of the following function:
```js
function describeInstances(client, params) {
	if (!_.hasIn(client, "describeInstances")) {  
	 throw new Error(`No method "describeInstances" found on client!`);  
	}
	const payload = helpers.removeUndefinedAndEmpty(params);  
  
return client.describeInstances(payload).promise();
}
```
# Helpers
## removeUndefinedAndEmpty

```js
function removeUndefinedAndEmpty(object)
```

Removes all of the object's fields which has value of empty string (`""`), empty object (`{}`), empty array(`[]`), `null`, `undefined`

### Parameters
`object` (_object_) – object to be cleaned

### Returned value
A copy of provided object with all of it's "undefined and empty" fields removed.

---

## buildTagSpecification
```js
function buildTagSpecification(resourceType, tags)
```

Returns  an AWS compatible tag specification object. More information: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_TagSpecification.html

### Parameters
`resourceType` (_string_) – Resource type to be used for tag specification
`tags` (_string_, _array of strings_, _object_ or _array of objects_) – Tags to be used in tags specification. Both parsed and unparsed. Please refer to tags parser documentation below to see the acceptable tags format.

### Returned value
An AWS compatible tag specification object structured as follows:
```js
{
	"ResourceType": <resourceType>,
	"Tags": [
		"Tag1": "Tag-value1",
		// ...
	]
}
```

---

## prepareParametersForAnotherMethodCall
```js
function prepareParametersForAnotherMethodCall(methodName, params, additionalParams = {})
```

Creates a parameters object for another plugin method call based on current method's parameters. This is useful in case you need to call plugin method from within another plugin method. See EC2 plugin's `createRouteTableWorkflow` for example usage.

### Parameters
`methodName` (_string_) – plugin method name that the parameters are supposed to be used with for
`params` (_object_) – current method parameters
`additionalParams` (_object_) – additional parameters to be included

### Returned value
Parsed parameters compatible with destination `methodName` plugin method. The returned object will only contain those parameters that are defined for the destination method in `config.json`, any other value from `params` or `additionalParams` will be stripped.

---

:warning: **The functions below are meant to be used with raw action parameters and settings provided from Kaholo platform. If you intend to use  `bootstrap` function and benefit from automatically parsed parameters, then you shouldn't use those** :warning:

## removeCredentials

```js
function removeCredentials(params, labels = consts.DEFAULT_CREDENTIAL_LABELS)
```

Removes the credentials from the `params` based on provided labels.
> :information_source: **Note**:<br/>
> This function is automatically called by core `bootstrap` function on every plugin method and autocomplete function for security reasons!

### Parameters
`params` (_object_) – Object to remove credentials from.
`labels` (_object_) – Object that specifies what labels to search for. The default value is defined as follows:
```json
  "DEFAULT_CREDENTIAL_LABELS": {
    "ACCESS_KEY": "AWS_ACCESS_KEY_ID",
    "SECRET_KEY": "AWS_SECRET_ACCESS_KEY",
    "REGION": "REGION"
  },
```

### Returned value
`params` object without the specified credentials keys.

---

## readRegion

```js
function readRegion(params, settings, label = consts.DEFAULT_CREDENTIAL_LABELS.REGION)
```

Retrieves parsed region from parameters or settings.
> :information_source: **Note**:<br/>
> Value from `parameters` always take priority over the value in `settings`.

### Parameters
`params` (_object_) – raw action parameters
`settings` (_object_) – raw plugin settings
`label` (_string_) – label under which the region is stored. Default value: `REGION`.

### Returned value
String cotaining selected region.

---

## readActionArguments
```js
function readActionArguments(  
 action,  
 credentialLabels = consts.DEFAULT_CREDENTIAL_LABELS,  
)
```

Retrieves and  parses the action parameters based on `config.json` definitions.

### Parameters
`action` (_object_) – raw action object
`credentialLabels` (_object_) – Object that specifies what labels to search for. The default value is defined as follows:
```json
"DEFAULT_CREDENTIAL_LABELS": {
    "ACCESS_KEY": "AWS_ACCESS_KEY_ID",
    "SECRET_KEY": "AWS_SECRET_ACCESS_KEY",
    "REGION": "REGION"
}
```

### Returned value
An object containing all of the action parameters with parsed values.
> :information_source: **Note**:<br/>
> This function calls `removeCredentials` function internally for security reasons, so the returned object will not contain any credentials.

# Parsers
Kaholo AWS Library exports the same parsers as Kaholo Plugin Library with the addition of the following:

## tags

```js
function tags(value)
```

### Parameters
`value` (_string_, _array of strings_, _object_ or _array of objects_) – value to be parsed. This value can be in the form of:
- String – new line separated strings in the format `KEY=VALUE`, for example:
```
name=my-instance
created_by=developer
purpose=sandbox
```

- Array of strings – an array containing any number of strings defined as above
- Object - an object in the form of:
```js
{
	"Key": "Name",
	"Value": "my-instance"
}
```

or

```js
{
	"name": "my-instance",
	"created_by": "developer",
// ...
}
```

- Array of objects – an array containing any number of objects defined as above

### Returned value
An array of objects in tag format supported by AWS:
```js
[
	{
		"Key": "name",
		"Value": "my-instance"
	},
	{
		"Key": "created_by",
		"Value": "developer"
	},
	// ...
]
```


# Autocomplete

## listRegions
```js
function listRegions(query = "")
```

An autocomplete function providing a list of AWS EC2 supported regions, filtered by query.

### Parameters
`query` (_string_) – query to filter the list by

### Returned value
A list of autocomplete objects containing all of the AWS EC2 supported regions, filtered by query.

---

```js
function getRegionLabel(regionId)
```

Provides a user-friendly name of the region based on the region id, for example:
```js
console.log(getRegionLabel("eu-west-2"));

// output:
// Europe (London)
```

### Parameters
`regionId` (_string_) – AWS region id

### Returned value
User-friendly region name

---

## autocompleteListFromAwsCall

```js
function autocompleteListFromAwsCall(listFuncName, pathToArray = "", pathToValue = "")
```

Creates a autocomplete list based on the result of AWS Service method call. This function returns another function that when executed, will call the AWS service method and extract the list of elements based on provided parameters to create a autocomplete list.

### Parameters
`listFuncName` (_string_) – a name of the function to be called on AWS service client
`pathToArray` (_string_) – a path to array on the returned object
`pathToValue` (_string_) – a path to the value. This is to be used in case that `pathToArray` leads to array of objects – in this case this path determines where in such object is the value that we want to use in the autocomplete list.

### Returned value
An autocomplete list with desired values

### Example usage
```js

/* 
The value returned from AWS S3 "listBuckets" function is structured as follows:

{ 
	Buckets: [ 
		{ CreationDate: <Date Representation>, Name: "examplebucket" }, 
		{ CreationDate: <Date Representation>, Name: "examplebucket2" }, 
		{ CreationDate: <Date Representation>, Name: "examplebucket3" } 
	], 
	Owner: { 
		DisplayName: "own-display-name", 
		ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31" 
	} 
}

So in order to get a function that will retrieve the list of autocomplete items with only the bucket names, we can call `listBucketsAutocomplete` in the following way:
*/

autocomplete.autocompleteListFromAwsCall("listBuckets", "Buckets", "Name");

```

---

## filterItemsByQuery

```js
function filterItemsByQuery(autocompleteItems, query)
```

Filters the provided list of autocomplete items by given query

### Parameters
`autocompleteItems` (_array of objects_) – autocomplete items list to filter
`query` (_string_) – query to filter the list by

### Returned value
An alphabetically sorted list of all autocomplete items that contains _all of the words_ in query

---

```js
function toAutocompleteItemFromPrimitive(value, label = value)
```

Creates an autocomplete item from value

### Parameters
`value` (_string_) – value to create autocomplete item from
`label` (_string_) – label to be used to describe the value

### Returned value
A proper autocomplete item from the value in the form of:

```json
{
	"id": "value",
	"value": "label"
}
```
