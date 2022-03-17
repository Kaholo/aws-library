const _ = require("lodash");
const consts = require("../consts.json");
const helpers = require("../helpers");

describe("removeCredentials", () => {
  test("properly removes credentials from params based on DEFAULT_CREDENTIAL_LABELS if no labels provided", () => {
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
    }
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
  })
});

describe("removeUndefinedAndEmpty", () => {});

describe("readRegion", () => {});

describe("readCredentials", () => {});

describe("readActionArguments", () => {});

describe("buildTagSpecification", () => {});

describe("prepareParametersForAnotherMethodCall", () => {});
