const _ = require("lodash");
const rewire = require("rewire");

const core = require("../core");
const consts = require("../consts.json");

function getMockPluginMethod() {
  return jest.fn().mockImplementation(() => new Promise(() => {}));
}

function getMockAutocompleteFunction() {
  return jest.fn().mockImplementation(() => []);
}

describe("generateAwsMethod", () => {
  test("creates an independent AWS method", () => {
    const mockMethodPromise = jest.fn();

    const mockClient = {
      mockMethod: jest.fn().mockImplementation(() => ({
        promise: mockMethodPromise,
      })),
      anotherMockMethod: jest.fn().mockImplementation(() => ({
        promise: () => {},
      })),
    };

    const parametersWithoutEmptyValues = {
      string: "Some text",
      number: 5,
      bool: true,
      array: ["Some value", "Some other value"],
      nestedObject: {
        key: "value",
      },
    };

    const simpleParameters = {
      name: "some name",
    };

    const awsMockMethod = core.generateAwsMethod("mockMethod");
    const anotherAwsMockMethod = core.generateAwsMethod("anotherMockMethod");

    awsMockMethod(mockClient, parametersWithoutEmptyValues);

    expect(mockClient.mockMethod).toHaveBeenCalledTimes(1);
    expect(mockClient.mockMethod).toHaveBeenCalledWith(parametersWithoutEmptyValues);
    expect(mockClient.anotherMockMethod).toHaveBeenCalledTimes(0);

    anotherAwsMockMethod(mockClient, simpleParameters);

    expect(mockClient.mockMethod).toHaveBeenCalledTimes(1);
    expect(mockClient.anotherMockMethod).toHaveBeenCalledTimes(1);
    expect(mockClient.anotherMockMethod).toHaveBeenCalledWith(simpleParameters);
  });

  test("creates AWS method which maps params before execution", () => {
    const mockClient = {
      mockMethod: jest.fn().mockImplementation(() => ({
        promise: jest.fn(),
      })),
      anotherMockMethod: jest.fn().mockImplementation(() => ({
        promise: () => {},
      })),
    };

    const parametersWithoutEmptyValues = {
      string: "Some text",
      number: 5,
      bool: true,
      array: ["Some value", "Some other value"],
      nestedObject: {
        key: "value",
      },
    };

    const simpleParameters = {
      name: "some name",
    };

    const mockPayloadFunction = jest.fn().mockImplementation(() => parametersWithoutEmptyValues);
    const mockAwsMethod = core.generateAwsMethod("mockMethod", mockPayloadFunction);
    const someRegion = "some region";

    expect(mockPayloadFunction).toHaveBeenCalledTimes(0);

    mockAwsMethod(mockClient, simpleParameters, someRegion);
    expect(mockPayloadFunction).toHaveBeenCalledTimes(1);
    expect(mockPayloadFunction).toHaveBeenCalledWith(simpleParameters, someRegion);
    expect(mockClient.mockMethod).toHaveBeenCalledWith(parametersWithoutEmptyValues);
  });

  test("returns a function that calls `promise()` method on service function result on call", () => {
    const mockMethodPromise = jest.fn();

    const mockClient = {
      mockMethod: jest.fn().mockImplementation(() => ({
        promise: mockMethodPromise,
      })),
      anotherMockMethod: jest.fn().mockImplementation(() => ({
        promise: () => {},
      })),
    };

    const mockAwsMethod = core.generateAwsMethod("mockMethod");

    mockAwsMethod(mockClient);
    expect(mockClient.mockMethod).toHaveBeenCalled();
    expect(mockMethodPromise).toHaveBeenCalled();
  });

  test("returns a function that throws if no such method is found", () => {
    const mockMethodPromise = jest.fn();

    const mockClient = {
      mockMethod: jest.fn().mockImplementation(() => ({
        promise: mockMethodPromise,
      })),
      anotherMockMethod: jest.fn().mockImplementation(() => ({
        promise: () => {},
      })),
    };
    const awsMethod = core.generateAwsMethod("nonExistentMethod");
    expect(() => awsMethod(mockClient)).toThrowError("No method \"nonExistentMethod\" found on client!");
  });
});

describe("bootstrap", () => {
  test("returns a single object containing all of the functions passed as arguments", () => {
    const rewiredCore = rewire("../core.js");
    // eslint-disable-next-line no-underscore-dangle
    rewiredCore.__set__("generatePluginMethod", jest.fn());
    // eslint-disable-next-line no-underscore-dangle
    rewiredCore.__set__("generateAutocompleteFunction", jest.fn());

    const mockPluginMethods = {
      method1: getMockPluginMethod(),
      method2: getMockPluginMethod(),
      method3: getMockPluginMethod(),
    };

    const mockAutocompleteFunctions = {
      auto1: getMockAutocompleteFunction(),
      auto2: getMockAutocompleteFunction(),
      auto3: getMockAutocompleteFunction(),
    };

    const bootstrappedObject = rewiredCore.bootstrap(
      {},
      mockPluginMethods,
      mockAutocompleteFunctions,
    );

    expect(_.keys(bootstrappedObject)).toHaveLength(
      _.entries(mockPluginMethods).length + _.entries(mockAutocompleteFunctions).length,
    );
    expect(_.keys(bootstrappedObject)).toStrictEqual(
      [..._.keys(mockPluginMethods), ..._.keys(mockAutocompleteFunctions)],
    );
  });

  test("injects service instance, parsed parameters, region and original method parameters into plugin methods as parameters", () => {
    const rewiredCore = rewire("../core.js");
    const mockAction = {
      id: "mockAction",
      params: [],
    };

    const mockSettings = { id: "mockSettings" };

    const mockMethodParameters = {
      action: mockAction,
      settings: mockSettings,
    };

    const mockClient = { id: "mockClient" };
    const mockParsedParams = { id: "mockParsedParams" };
    const mockRegion = "mock region";

    const mockPluginMethods = {
      method1: getMockPluginMethod(),
    };

    // eslint-disable-next-line no-underscore-dangle
    rewiredCore.__set__("getServiceInstance", jest.fn().mockImplementation(() => mockClient));
    // eslint-disable-next-line no-underscore-dangle
    rewiredCore.__set__("helpers.readActionArguments", jest.fn().mockImplementation(() => mockParsedParams));
    // eslint-disable-next-line no-underscore-dangle
    rewiredCore.__set__("helpers.readRegion", jest.fn().mockImplementation(() => mockRegion));

    const bootstrappedObject = rewiredCore.bootstrap(jest.fn(), mockPluginMethods, {});
    bootstrappedObject.method1(mockAction, mockSettings);

    expect(mockPluginMethods.method1).toHaveBeenCalledWith(
      mockClient,
      mockParsedParams,
      mockRegion,
      mockMethodParameters,
    );
  });

  test("injects query, service instance, parsed parameters, region and original method parameters into autocomplete function as parameters", () => {
    const rewiredCore = rewire("../core.js");
    const mockAutocompleteSettings = [{
      value: "setting1 value",
      name: "setting1",
      valueType: "string",
    }];

    const mockAutocompleteParams = [{
      value: "param1 value",
      name: "param1",
      type: "string",
    }];
    const mockParsedParams = { id: "mockParsedParams" };

    const mockAutocompleteParameters = {
      pluginSettings: mockAutocompleteSettings,
      actionParams: mockAutocompleteParams,
    };

    const mockRegion = "mock region";
    const mockQuery = "mock query";
    const mockClient = { id: "mockClient" };

    const mockAutocompleteFunctions = {
      auto1: getMockAutocompleteFunction(),
    };

    // eslint-disable-next-line no-underscore-dangle
    rewiredCore.__set__("autocomplete.mapAutocompleteFuncParamsToObject", jest.fn().mockImplementation(() => mockParsedParams));
    // eslint-disable-next-line no-underscore-dangle
    rewiredCore.__set__("getServiceInstance", jest.fn().mockImplementation(() => mockClient));
    // eslint-disable-next-line no-underscore-dangle
    rewiredCore.__set__("helpers.readRegion", jest.fn().mockImplementation(() => mockRegion));

    const bootstrappedObject = rewiredCore.bootstrap(jest.fn(), {}, mockAutocompleteFunctions);
    bootstrappedObject.auto1(mockQuery, mockAutocompleteSettings, mockAutocompleteParams);

    expect(mockAutocompleteFunctions.auto1).toHaveBeenCalledWith(
      mockQuery,
      mockParsedParams,
      mockClient,
      mockRegion,
      mockAutocompleteParameters,
    );
  });

  test("injects success message if returned promise resolves without value", async () => {
    const rewiredCore = rewire("../core.js");
    const mockParsedParams = { id: "mockParsedParams" };
    const mockRegion = "mock region";
    const mockClient = { id: "mockClient" };
    const methodSuccessValue = { status: "success" };
    const mockAction = {
      id: "mockAction",
      params: [],
    };
    const mockSettings = { id: "mockSettings" };

    const mockPluginMethods = {
      methodToSucceedWithoutValue: getMockPluginMethod().mockImplementation(
        () => Promise.resolve({}),
      ),
      methodToSucceedWithValue: getMockPluginMethod().mockImplementation(
        () => Promise.resolve(methodSuccessValue),
      ),
    };

    // eslint-disable-next-line no-underscore-dangle
    rewiredCore.__set__("getServiceInstance", jest.fn().mockImplementation(() => mockClient));
    // eslint-disable-next-line no-underscore-dangle
    rewiredCore.__set__("helpers.readActionArguments", jest.fn().mockImplementation(() => mockParsedParams));
    // eslint-disable-next-line no-underscore-dangle
    rewiredCore.__set__("helpers.readRegion", jest.fn().mockImplementation(() => mockRegion));

    const bootstrappedObject = rewiredCore.bootstrap(jest.fn(), mockPluginMethods, {});
    const implicitlyReturnedValue = (
      await bootstrappedObject.methodToSucceedWithoutValue(mockAction, mockSettings)
    );
    const explicitlyReturnedValue = (
      await bootstrappedObject.methodToSucceedWithValue(mockAction, mockSettings)
    );

    expect(implicitlyReturnedValue).toStrictEqual(consts.OPERATION_FINISHED_SUCCESSFULLY_MESSAGE);
    expect(explicitlyReturnedValue).toStrictEqual(methodSuccessValue);
  });
});

describe("getServiceInstance", () => {
  test("is called for every plugin method", async () => {
    const rewiredCore = rewire("../core.js");
    const mockClient = { id: "mockClient" };
    const mockServiceConstructor = jest.fn().mockImplementation(() => mockClient);

    const mockCredentials = {
      accessKeyId: "access",
      secretAccessKey: "secret",
      region: "region",
    };

    const mockParsedParams = { id: "mockParsedParams" };
    const mockRegion = "mock region";

    const mockPluginMethods = {
      method1: getMockPluginMethod().mockImplementation((client) => Promise.resolve(client)),
      method2: getMockPluginMethod(),
    };

    const mockAction = {
      id: "mockAction",
      params: [],
    };

    const mockSettings = { id: "mockSettings" };

    // eslint-disable-next-line no-underscore-dangle
    rewiredCore.__set__("helpers.readCredentials", jest.fn().mockImplementation(() => mockCredentials));
    // eslint-disable-next-line no-underscore-dangle
    rewiredCore.__set__("helpers.readActionArguments", jest.fn().mockImplementation(() => mockParsedParams));
    // eslint-disable-next-line no-underscore-dangle
    rewiredCore.__set__("helpers.readRegion", jest.fn().mockImplementation(() => mockRegion));

    const bootstrappedObject = rewiredCore.bootstrap(mockServiceConstructor, mockPluginMethods, {});

    const methodResult = await bootstrappedObject.method1(mockAction, mockSettings);
    expect(mockServiceConstructor).toHaveBeenCalledTimes(1);
    expect(mockServiceConstructor).toHaveBeenLastCalledWith(mockCredentials);
    expect(methodResult).toStrictEqual(mockClient);

    bootstrappedObject.method2(mockAction, mockSettings);
    expect(mockServiceConstructor).toHaveBeenCalledTimes(2);
  });
});
