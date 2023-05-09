const _ = require("lodash");
const rewire = require("rewire");
const consts = require("../consts.json");
const helpers = require("../helpers");

describe("removeCredentials", () => {
  test("properly removes credentials from params", () => {
    const params = {
      [consts.DEFAULT_CREDENTIAL_LABELS.ACCESS_KEY]: "test access",
      [consts.DEFAULT_CREDENTIAL_LABELS.SECRET_KEY]: "test secret",
      [consts.DEFAULT_CREDENTIAL_LABELS.REGION]: "test region",
      otherParam: "test param",
    };

    const returnedParams = helpers.removeCredentials(params);
    expect(_.keys(returnedParams)).toStrictEqual(["otherParam"]);
  });

  test("properly removes credentials from params based on provided labels", () => {
    const labels = {
      ACCESS_KEY: "access",
      SECRET_KEY: "secret",
      REGION: "region",
    };
    const params = {
      access: "test access",
      secret: "test secret",
      region: "test region",
      otherParam: "test param",
    };

    const returnedParams = helpers.removeCredentials(params, labels);
    expect(_.keys(returnedParams)).toStrictEqual(["otherParam"]);
  });

  test("still succeeds even if some of the credentials missing", () => {
    const paramsWithPartialCredentials = {
      [consts.DEFAULT_CREDENTIAL_LABELS.ACCESS_KEY]: "test access",
      otherParam: "test param",
    };
    const paramsWithCredentialsMissing = {
      otherParam: "test param",
    };

    const result1 = helpers.removeCredentials(paramsWithPartialCredentials);
    const result2 = helpers.removeCredentials(paramsWithCredentialsMissing);
    expect(_.keys(result1)).toStrictEqual(["otherParam"]);
    expect(_.keys(result2)).toStrictEqual(["otherParam"]);
  });
});

describe("removeUndefinedAndEmpty", () => {
  test("returns the argument if no null, undefined nor empty values found", () => {
    const objectWithoutEmptyValues = {
      key1: "val1",
      key2: 0,
      key3: false,
      key4: {
        key41: "test",
        key42: 10,
      },
    };

    expect(
      helpers.removeUndefinedAndEmpty(objectWithoutEmptyValues),
    ).toStrictEqual(objectWithoutEmptyValues);
  });

  test("properly removes keys with null or undefined values", () => {
    const objectWithNils = {
      key1: null,
      key2: undefined,
      key3: "text",
    };
    const expectedObject = {
      key3: "text",
    };

    expect(helpers.removeUndefinedAndEmpty(objectWithNils)).toStrictEqual(expectedObject);
  });

  test("properly removes keys with empty strings, arrays and objects", () => {
    const objectWithEmptyValues = {
      key1a: "text",
      key1b: "",
      key2a: ["a", "b"],
      key2b: [],
      key3a: { a: "test" },
      key3b: {},
    };
    const expectedObject = {
      key1a: "text",
      key2a: ["a", "b"],
      key3a: { a: "test" },
    };

    expect(helpers.removeUndefinedAndEmpty(objectWithEmptyValues)).toStrictEqual(expectedObject);
  });

  test("returns the argument if it's not an object", () => {
    expect(helpers.removeUndefinedAndEmpty("string")).toStrictEqual("string");
    expect(helpers.removeUndefinedAndEmpty(100)).toStrictEqual(100);
    expect(helpers.removeUndefinedAndEmpty(["a", "b", "c"])).toStrictEqual(["a", "b", "c"]);
  });
});

describe("readRegion", () => {
  test("returns parsed region from both params and settings using DEFAULT_CREDENTIAL_LABELS by default", () => {
    const params = {
      [consts.DEFAULT_CREDENTIAL_LABELS.REGION]: {
        id: "eu-west-2",
        value: "eu-west-2 (London)",
      },
    };
    expect(helpers.readRegion(params, {})).toStrictEqual("eu-west-2");
    expect(helpers.readRegion({}, params)).toStrictEqual("eu-west-2");
  });

  test("returns parsed region from settings using custom label", () => {
    const params = {
      customRegion: {
        id: "eu-west-2",
        value: "eu-west-2 (London)",
      },
    };
    expect(helpers.readRegion(params, {}, "customRegion")).toStrictEqual("eu-west-2");
    expect(helpers.readRegion({}, params, "customRegion")).toStrictEqual("eu-west-2");
  });

  test("returns parsed region preferring value from params over settings", () => {
    const params = {
      [consts.DEFAULT_CREDENTIAL_LABELS.REGION]: {
        id: "eu-west-2",
        value: "eu-west-2 (London)",
      },
    };
    const settings = {
      [consts.DEFAULT_CREDENTIAL_LABELS.REGION]: {
        id: "us-east-2",
        value: "us-east-2 (Ohio)",
      },
    };
    expect(helpers.readRegion(params, settings)).toStrictEqual("eu-west-2");
  });

  test("throws if no region has been found in neither params nor settings", () => {
    const noRegionFoundErrorMessage = "No region has been found under \"REGION\" in neither params nor settings.";
    expect(() => helpers.readRegion({}, {})).toThrowError(noRegionFoundErrorMessage);
  });
});

describe("readCredentials", () => {
  test("returns proper credentials object from params and settings using DEFAULT_CREDENTIAL_LABELS by default", () => {
    const params = {
      [consts.DEFAULT_CREDENTIAL_LABELS.ACCESS_KEY]: "test access",
      [consts.DEFAULT_CREDENTIAL_LABELS.SECRET_KEY]: "test secret",
      [consts.DEFAULT_CREDENTIAL_LABELS.REGION]: "test region",
    };

    const expectedResult = {
      accessKeyId: "test access",
      secretAccessKey: "test secret",
      region: "test region",
    };

    expect(helpers.readCredentials(params, {})).toStrictEqual(expectedResult);
    expect(helpers.readCredentials({}, params)).toStrictEqual(expectedResult);
  });

  test("returns proper credentials object from params and settings using provided labels", () => {
    const params = {
      access: "test access",
      secret: "test secret",
      region: "test region",
    };

    const customLabels = {
      ACCESS_KEY: "access",
      SECRET_KEY: "secret",
      REGION: "region",
    };

    const expectedResult = {
      accessKeyId: "test access",
      secretAccessKey: "test secret",
      region: "test region",
    };

    expect(helpers.readCredentials(params, {}, customLabels)).toStrictEqual(expectedResult);
    expect(helpers.readCredentials({}, params, customLabels)).toStrictEqual(expectedResult);
  });

  test("returns proper credentials object combining params and settings, preferring values from params over settings", () => {
    const params = {
      [consts.DEFAULT_CREDENTIAL_LABELS.ACCESS_KEY]: "test params access",
      [consts.DEFAULT_CREDENTIAL_LABELS.REGION]: "test params region",
    };

    const settings = {
      [consts.DEFAULT_CREDENTIAL_LABELS.SECRET_KEY]: "test settings secret",
      [consts.DEFAULT_CREDENTIAL_LABELS.REGION]: "test settings region",
    };

    const expectedResult = {
      accessKeyId: "test params access",
      secretAccessKey: "test settings secret",
      region: "test params region",
    };

    expect(helpers.readCredentials(params, settings)).toStrictEqual(expectedResult);
  });

  test("throws if params and settings combined do not contain all of the credential keys", () => {
    const incompleteParams = {
      [consts.DEFAULT_CREDENTIAL_LABELS.ACCESS_KEY]: "test params access",
    };

    const incompleteSettings = {
      [consts.DEFAULT_CREDENTIAL_LABELS.SECRET_KEY]: "test settings secret",
    };

    const expectedErrorMessage = "Credential labels has not been found on neither params nor settings";
    expect(() => helpers.readCredentials({}, {})).toThrowError(expectedErrorMessage);
    expect(
      () => helpers.readCredentials(incompleteParams, incompleteSettings),
    ).toThrowError(expectedErrorMessage);
  });
});

describe("readActionArguments", () => {
  const rewiredHelpers = rewire("../helpers.js");

  test("returns the parameters in expected format with no nil/empty values and without credentials", () => {
    const mockActionWithCredentialsAndNilValues = {
      method: {
        name: "testMethod",
      },
      params: {
        REGION: { id: "test region", value: "test region" },
        testStringParam: "test string value",
        testNumberParam: "100",
        testNullParam: null,
        testUndefinedParam: undefined,
        testEmptyParam: "",
      },
    };
    const minimalMockMethodConfiguration = {
      name: "testMethod",
      viewName: "Test method",
      params: [
        {
          name: "AWS_ACCESS_KEY_ID",
          type: "vault",
        },
        {
          name: "AWS_SECRET_ACCESS_KEY",
          type: "vault",
        },
        {
          name: "REGION",
          type: "autocomplete",
        },
        {
          name: "testStringParam",
          type: "string",
        },
        {
          name: "testNumberParam",
          type: "number",
        },
        {
          name: "testNullParam",
          type: "text",
        },
        {
          name: "testUndefinedParam",
          type: "text",
        },
        {
          name: "testEmptyParam",
          type: "text",
        },
      ],
    };
    const expectedResult = {
      testStringParam: "test string value",
      testNumberParam: 100,
    };

    // eslint-disable-next-line no-underscore-dangle
    rewiredHelpers.__set__("loadMethodFromConfiguration", () => minimalMockMethodConfiguration);
    expect(
      rewiredHelpers.readActionArguments(mockActionWithCredentialsAndNilValues),
    ).toEqual(expectedResult);
  });

  test("returns the parameters in expected format properly making use of default parameter if provided", () => {
    const mockAction = {
      method: {
        name: "testMethod",
      },
      params: {
        noDefaultParam: "No default",
        defaultParam: "This value should overwrite default one",
      },
    };
    const mockMethod = {
      name: "testMethod",
      viewName: "Test method",
      params: [
        {
          name: "AWS_ACCESS_KEY_ID",
          type: "vault",
        },
        {
          name: "AWS_SECRET_ACCESS_KEY",
          type: "vault",
        },
        {
          name: "REGION",
          type: "autocomplete",
        },
        {
          name: "noDefaultParam",
          type: "string",
        },
        {
          name: "noDefaultNoValueParam",
          type: "string",
        },
        {
          name: "defaultParam",
          type: "string",
          default: "some default value",
        },
        {
          name: "defaultNoValueParam",
          type: "string",
          default: "this default value should be returned",
        },
      ],
    };
    const expectedResult = {
      noDefaultParam: "No default",
      defaultParam: "This value should overwrite default one",
      defaultNoValueParam: "this default value should be returned",
    };

    // eslint-disable-next-line no-underscore-dangle
    rewiredHelpers.__set__("loadMethodFromConfiguration", () => mockMethod);
    expect(rewiredHelpers.readActionArguments(mockAction)).toEqual(expectedResult);
  });

  test("throws if the required parameter is missing", () => {
    const mockMethod = {
      name: "testMethod",
      viewName: "Test method",
      params: [
        {
          name: "AWS_ACCESS_KEY_ID",
          type: "vault",
        },
        {
          name: "AWS_SECRET_ACCESS_KEY",
          type: "vault",
        },
        {
          name: "REGION",
          type: "autocomplete",
        },
        {
          name: "paramRequiredWithValue",
          type: "string",
          required: true,
        },
        {
          name: "paramRequiredWithDefaultValue",
          type: "string",
          default: "this is a default value",
          required: true,
        },
      ],
    };
    const getAction = (params) => ({
      method: {
        name: "testMethod",
      },
      params,
    });

    const properAction = getAction({ paramRequiredWithValue: "proper value", paramRequiredWithDefaultValue: "some other value" });
    const anotherProperAction = getAction({ paramRequiredWithValue: "proper value" });
    const improperAction = getAction({ paramRequiredWithValue: "" });
    const anotherImproperAction = getAction({});

    // eslint-disable-next-line no-underscore-dangle
    rewiredHelpers.__set__("loadMethodFromConfiguration", () => mockMethod);
    expect(() => rewiredHelpers.readActionArguments(properAction)).not.toThrowError(/Missing required ".*" value/);
    expect(() => rewiredHelpers.readActionArguments(anotherProperAction)).not.toThrowError(/Missing required ".*" value/);
    expect(() => rewiredHelpers.readActionArguments(improperAction)).toThrowError(/Missing required ".*" value/);
    expect(() => rewiredHelpers.readActionArguments(anotherImproperAction)).toThrowError(/Missing required ".*" value/);
  });
});

describe("buildTagSpecification", () => {
  test("properly builds a tag specification based on tags string", () => {
    const resourceType = "test tag spec";
    const tagsString = "test1=value1\ntest2 = value2";
    const expectedValue = [{
      ResourceType: resourceType,
      Tags: [
        { Key: "test1", Value: "value1" },
        { Key: "test2", Value: "value2" },
      ],
    }];

    expect(helpers.buildTagSpecification(resourceType, tagsString)).toStrictEqual(expectedValue);
  });

  test("properly builds a tag specification based on array of tags string", () => {
    const resourceType = "test tag spec";
    const tagsString = ["test1=value1\ntest2 = value2", "test3=value3\ntest4 = value4"];
    const expectedValue = [{
      ResourceType: resourceType,
      Tags: [
        { Key: "test1", Value: "value1" },
        { Key: "test2", Value: "value2" },
        { Key: "test3", Value: "value3" },
        { Key: "test4", Value: "value4" },
      ],
    }];

    expect(helpers.buildTagSpecification(resourceType, tagsString)).toStrictEqual(expectedValue);
  });

  test("returns an empty array if tags provided is empty array, empty string or nil value", () => {
    const resourceType = "test tag spec";
    expect(helpers.buildTagSpecification(resourceType, [])).toStrictEqual([]);
    expect(helpers.buildTagSpecification(resourceType, "")).toStrictEqual([]);
    expect(helpers.buildTagSpecification(resourceType, null)).toStrictEqual([]);
    expect(helpers.buildTagSpecification(resourceType, undefined)).toStrictEqual([]);
  });

  test("throws if resourceType is empty or nil", () => {
    const resourceTypeErrorMessage = "Resource type cannot be empty nor null / undefined";
    expect(() => helpers.buildTagSpecification("", null)).toThrowError(resourceTypeErrorMessage);
    expect(() => helpers.buildTagSpecification(null, null)).toThrowError(resourceTypeErrorMessage);
  });
});

describe("prepareParametersForAnotherMethodCall", () => {
  const rewiredHelpers = rewire("../helpers.js");

  test("properly builds parameters compatible with another method based on provided ones by limiting the extra ones", () => {
    const methodDefinition = {
      name: "testMethod",
      viewName: "Test method",
      params: [
        {
          name: "param2",
          type: "string",
        },
        {
          name: "param3",
          type: "string",
        },
      ],
    };
    const paramsToConvert = {
      param1: "value1",
      param2: "value2",
      param3: "value3",
      param4: "value4",
      param5: "value5",
    };
    const expectedParams = {
      param2: "value2",
      param3: "value3",
    };

    // eslint-disable-next-line no-underscore-dangle
    rewiredHelpers.__set__("loadMethodFromConfiguration", () => methodDefinition);
    expect(rewiredHelpers.prepareParametersForAnotherMethodCall("testMethod", paramsToConvert)).toEqual(expectedParams);
  });

  test("properly builds parameters compatible with another method based on provided and additional ones", () => {
    const methodDefinition = {
      name: "testMethod",
      viewName: "Test method",
      params: [
        {
          name: "param2",
          type: "string",
        },
        {
          name: "someOtherParam",
          type: "string",
        },
      ],
    };
    const paramsToConvert = {
      param1: "value1",
      param2: "value2",
      param3: "value3",
      param4: "value4",
      param5: "value5",
    };
    const additionalParams = {
      someOtherParam: "some other param",
    };
    const expectedParams = {
      param2: "value2",
      someOtherParam: "some other param",
    };

    // eslint-disable-next-line no-underscore-dangle
    rewiredHelpers.__set__("loadMethodFromConfiguration", () => methodDefinition);
    expect(rewiredHelpers.prepareParametersForAnotherMethodCall("testMethod", paramsToConvert, additionalParams)).toEqual(expectedParams);
  });
});
