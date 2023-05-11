const _ = require("lodash");
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
  test("returns parsed region from params using DEFAULT_CREDENTIAL_LABELS by default", () => {
    const params = {
      [consts.DEFAULT_CREDENTIAL_LABELS.REGION]: {
        id: "eu-west-2",
        value: "eu-west-2 (London)",
      },
    };

    expect(helpers.readRegion(params)).toStrictEqual("eu-west-2");
  });

  test("returns parsed region using custom label", () => {
    const params = {
      customRegion: {
        id: "eu-west-2",
        value: "eu-west-2 (London)",
      },
    };

    expect(helpers.readRegion(params, "customRegion")).toStrictEqual("eu-west-2");
  });

  test("throws if no region has been found in params", () => {
    const noRegionFoundErrorMessage = "No region has been found under \"REGION\" in params.";

    expect(() => helpers.readRegion({})).toThrowError(noRegionFoundErrorMessage);
  });
});

describe("readCredentials", () => {
  test("returns proper credentials object from params using DEFAULT_CREDENTIAL_LABELS by default", () => {
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

    expect(helpers.readCredentials(params)).toStrictEqual(expectedResult);
  });

  test("returns proper credentials object using custom labels", () => {
    const params = {
      secret: "test params secret",
      access: "test params access",
      region: "test params region",
    };
    const labels = {
      SECRET_KEY: "secret",
      ACCESS_KEY: "access",
      REGION: "region",
    };

    const expectedResult = {
      accessKeyId: "test params access",
      secretAccessKey: "test params secret",
      region: "test params region",
    };

    expect(helpers.readCredentials(params, labels)).toStrictEqual(expectedResult);
  });

  test("throws if params do not contain all of the credential keys", () => {
    const incompleteParams = {
      [consts.DEFAULT_CREDENTIAL_LABELS.ACCESS_KEY]: "test params access",
    };
    const expectedErrorMessage = "Credential labels has not been found in params";

    expect(() => helpers.readCredentials({})).toThrowError(expectedErrorMessage);
    expect(() => helpers.readCredentials(incompleteParams)).toThrowError(expectedErrorMessage);
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
