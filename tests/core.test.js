const _ = require("lodash");
const rewire = require("rewire");

let core;

const mockPluginMethods = {
  method1: jest.fn().mockImplementation((client) => client),
  method2: jest.fn(),
  method3: jest.fn(),
};
const mockAutocompleteFunctions = {
  auto1: jest.fn(),
  auto2: jest.fn(),
  auto3: jest.fn(),
};

const mockAction = {
  id: "mockAction",
  params: [],
};
const mockSettings = { id: "mockSettings" };

const mockServiceConstructor = jest.fn();

const mockAutocompleteParams = [{
  value: "param1 value",
  name: "param1",
  type: "string"
}];
const mockAutocompleteSettings = [{
  value: "setting1 value",
  name: "setting1",
  valueType: "string"
}];

const mockClient = { id: "mockClient" };
const mockParsedParams = { id: "mockParsedParams" };
const mockRegion = "mock region";
const mockQuery = "mock query";

beforeEach(() => {
  core = rewire("../core.js");
})

describe("mapToAwsMethod", () =>{
  const mockMethodPromise = jest.fn();

  const mockClient = {
    mockMethod: jest.fn().mockImplementation((payload) => ({
      promise: mockMethodPromise
    })),
    anotherMockMethod: jest.fn().mockImplementation(() => ({
      promise: () => {}
    })),
  };

  const simpleParameters = {
    name: "some name"
  };

  const parametersWithoutEmptyValues = {
    string: "Some text",
    number: 5,
    bool: true,
    array: ["Some value", "Some other value"],
    nestedObject: {
      key: "value"
    }
  };

  test("returns a function that triggers only specified service method on call with provided parameters", () => {

    const returnedFunction1 = core.mapToAwsMethod("mockMethod");
    const returnedFunction2 = core.mapToAwsMethod("anotherMockMethod");

    returnedFunction1(mockClient, parametersWithoutEmptyValues);

    expect(mockClient.mockMethod).toHaveBeenCalledTimes(1);
    expect(mockClient.mockMethod).toHaveBeenCalledWith(parametersWithoutEmptyValues);
    expect(mockClient.anotherMockMethod).toHaveBeenCalledTimes(0);

    returnedFunction2(mockClient, simpleParameters);

    expect(mockClient.mockMethod).toHaveBeenCalledTimes(1);
    expect(mockClient.anotherMockMethod).toHaveBeenCalledTimes(1);
    expect(mockClient.anotherMockMethod).toHaveBeenCalledWith(simpleParameters);
  });

  test("returns a function that triggers the payload function with params on call and pass its result to service method", () => {
    const mockPayloadFunction = jest.fn().mockImplementation((params) => parametersWithoutEmptyValues);
    const returnedFunction = core.mapToAwsMethod("mockMethod", mockPayloadFunction);
    const someRegion = "some region";

    expect(mockPayloadFunction).toHaveBeenCalledTimes(0);

    returnedFunction(mockClient, simpleParameters, someRegion);
    expect(mockPayloadFunction).toHaveBeenCalledTimes(1);
    expect(mockPayloadFunction).toHaveBeenCalledWith(simpleParameters, someRegion);
    expect(mockClient.mockMethod).toHaveBeenCalledWith(parametersWithoutEmptyValues);
  });

  test("returns a function that calls `promise()` method on service function result on call", () => {
    const returnedFunction = core.mapToAwsMethod("mockMethod");

    returnedFunction(mockClient);
    expect(mockClient.mockMethod).toHaveBeenCalled();
    expect(mockMethodPromise).toHaveBeenCalled();
  });

  test("returns a function that throws if no such method has been found", () => {
    const returnedFunction = core.mapToAwsMethod("nonExistentMethod");
    expect(() => returnedFunction(mockClient)).toThrowError();
  });
});

describe("bootstrap", () => {

  test("returns a single object containing all of the functions passed as arguments", () => {
    core.__set__("wrapPluginMethod", jest.fn());
    core.__set__("wrapAutocompleteFunction", jest.fn());

    const bootstrappedObject = core.bootstrap({}, mockPluginMethods, mockAutocompleteFunctions);
    expect(_.keys(bootstrappedObject)).toHaveLength(6);
    expect(_.keys(bootstrappedObject)).toStrictEqual([..._.keys(mockPluginMethods), ..._.keys(mockAutocompleteFunctions)]);
  });

  test("properly wraps plugin methods by returning the function that calls the original plugin method with correct arguments", () => {
    const mockMethodParameters = {
      action: mockAction,
      settings: mockSettings
    };
    core.__set__("getServiceInstance", jest.fn().mockImplementation(() => mockClient));
    core.__set__("helpers.readActionArguments", jest.fn().mockImplementation(() => mockParsedParams));
    core.__set__("helpers.readRegion", jest.fn().mockImplementation(() => mockRegion));

    const bootstrappedObject = core.bootstrap(mockServiceConstructor, mockPluginMethods, {});
    bootstrappedObject.method1(mockAction, mockSettings);

    expect(mockPluginMethods.method1).toHaveBeenCalledWith(mockClient, mockParsedParams, mockRegion, mockMethodParameters);
  });

  test("properly wraps plugin methods by returning the function that calls the original autocomplete method with correct arguments", () => {
    const mockAutocompleteParameters = {
      pluginSettings: mockAutocompleteSettings,
      actionParams: mockAutocompleteParams,
    };
    core.__set__("autocomplete.mapAutocompleteFuncParamsToObject", jest.fn().mockImplementation(() => mockParsedParams));
    core.__set__("getServiceInstance", jest.fn().mockImplementation(() => mockClient));
    core.__set__("helpers.readRegion", jest.fn().mockImplementation(() => mockRegion));

    const bootstrappedObject = core.bootstrap(mockServiceConstructor, {}, mockAutocompleteFunctions);
    bootstrappedObject.auto1(mockQuery, mockAutocompleteSettings, mockAutocompleteParams);

    expect(mockAutocompleteFunctions.auto1)
      .toHaveBeenCalledWith(mockQuery, mockParsedParams, mockClient, mockRegion, mockAutocompleteParameters);
  });
});

describe("getServiceInstance", () => {
  test("calls provided service constructor per method call and returns its the result", async () => {
    const mockServiceConstructor = jest.fn().mockImplementation(() => mockClient);

    const mockCredentials = {
      accessKeyId: "access",
      secretAccessKey: "secret",
      region: "region",
    };

    core.__set__("helpers.readCredentials", jest.fn().mockImplementation(() => mockCredentials));
    core.__set__("helpers.readActionArguments", jest.fn().mockImplementation(() => mockParsedParams));
    core.__set__("helpers.readRegion", jest.fn().mockImplementation(() => mockRegion));

    const bootstrappedObject = core.bootstrap(mockServiceConstructor, mockPluginMethods, {});

    const methodResult = await bootstrappedObject.method1(mockAction, mockSettings);
    expect(mockServiceConstructor).toHaveBeenCalledTimes(1);
    expect(mockServiceConstructor).toHaveBeenLastCalledWith(mockCredentials);
    expect(methodResult).toStrictEqual(mockClient);

    bootstrappedObject.method2(mockAction, mockSettings);
    expect(mockServiceConstructor).toHaveBeenCalledTimes(2);
  });
});
