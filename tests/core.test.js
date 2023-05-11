const core = require("../core");

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

// TODO: Write tests for injecting AWS Service
// Bootstrapping should be tested in the kaholo-plugin-library
