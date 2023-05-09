const _ = require("lodash");
const autocomplete = require("../autocomplete");
const consts = require("../consts.json");

const expectProperAutocompleteObject = (item) => {
  expect(_.keys(item)).toHaveLength(2);
  expect(_.keys(item)).toContain("id", "value");
};
const expectSortedArrayOfAutocompleteObjects = (result, unsortedExpectedValues) => {
  expect(result).toBeInstanceOf(Array);
  expect(result).toHaveLength(unsortedExpectedValues.length);
  result.forEach(expectProperAutocompleteObject);

  const allItemsValues = result.map(({ value }) => value);
  expect(allItemsValues).toStrictEqual(unsortedExpectedValues.sort());
};

const autocompleteActionParams = [
  {
    type: "string",
    name: "TestField",
    value: "test value",
  },
  {
    type: "number",
    name: "TestNumber",
    value: "100",
  },
];

const autocompletePluginSettings = [
  {
    valueType: "string",
    name: "TestSetting",
    value: "test setting value",
  },
  {
    valueType: "number",
    name: "TestSettingNumber",
    value: "300",
  },
];

describe("mapAutocompleteFuncToObject", () => {
  const expectObjectToNotBeEmptyAndToNotContainNilKeysNorValues = (object) => {
    expect(object).toBeInstanceOf(Object);
    expect(object).not.toStrictEqual({});

    const allKeysAndValues = [
      ..._.keys(object),
      ..._.values(object),
    ];

    expect(allKeysAndValues).not.toContain(null);
    expect(allKeysAndValues).not.toContain(undefined);
    expect(allKeysAndValues).not.toContain(NaN);
  };

  test("works as expected for pluginParams data format", () => {
    const returnedObjectForParams = (
      autocomplete.mapAutocompleteFuncParamsToObject(autocompleteActionParams)
    );
    expectObjectToNotBeEmptyAndToNotContainNilKeysNorValues(returnedObjectForParams);
  });

  test("works as expected for pluginSettings data format", () => {
    const returnedObjectForSettings = (
      autocomplete.mapAutocompleteFuncParamsToObject(autocompletePluginSettings)
    );
    expectObjectToNotBeEmptyAndToNotContainNilKeysNorValues(returnedObjectForSettings);
  });

  test("properly converts array of values into object with correct keys and parsed values", () => {
    const expectedResultForParams = {
      TestField: "test value",
      TestNumber: 100,
    };

    const expectedResultForSettings = {
      TestSetting: "test setting value",
      TestSettingNumber: 300,
    };

    const returnedObjectForParam = (
      autocomplete.mapAutocompleteFuncParamsToObject(autocompleteActionParams)
    );
    const returnedObjectForSettings = (
      autocomplete.mapAutocompleteFuncParamsToObject(autocompletePluginSettings)
    );

    expect(returnedObjectForParam).toStrictEqual(expectedResultForParams);
    expect(returnedObjectForSettings).toStrictEqual(expectedResultForSettings);
  });

  test("throws in case param or setting with unknown type is passed", () => {
    const wrongTypeActionParams = [
      {
        type: "no_such_type",
        name: "TestField",
        value: "test value",
      },
      {
        type: "number",
        name: "TestNumber",
        value: "100",
      },
    ];

    const wrongTypePluginSettings = [
      {
        valueType: "string",
        name: "TestSetting",
        value: "test setting value",
      },
      {
        valueType: "unknown type",
        name: "TestSettingNumber",
        value: "300",
      },
    ];

    expect(() => autocomplete.mapAutocompleteFuncParamsToObject(wrongTypeActionParams))
      .toThrowError("Can't resolve parser of type \"no_such_type\"");
    expect(() => autocomplete.mapAutocompleteFuncParamsToObject(wrongTypePluginSettings))
      .toThrowError("Can't resolve parser of type \"unknown type\"");
  });

  test("throws in case argument passed is not an array of objects", () => {
    const array = ["test", "test2", "test3"];
    const singleObjectInParamsFormat = autocompleteActionParams[0];
    const singleObjectInDifferentFormat = { key: "value" };
    const string = "Test string";
    const number = 10;
    const boolean = true;

    const arrayNotFilledWithObjectsErrorMessage = "Failed to map autocomplete parameters to object - every item of params array need to be an object";
    const notArrayErrorMessage = "Failed to map autocomplete parameters to object – params provided are not an array";

    expect(() => autocomplete.mapAutocompleteFuncParamsToObject(array))
      .toThrowError(arrayNotFilledWithObjectsErrorMessage);

    expect(() => autocomplete.mapAutocompleteFuncParamsToObject(singleObjectInParamsFormat))
      .toThrowError(notArrayErrorMessage);

    expect(() => autocomplete.mapAutocompleteFuncParamsToObject(singleObjectInDifferentFormat))
      .toThrowError(notArrayErrorMessage);

    expect(() => autocomplete.mapAutocompleteFuncParamsToObject(string))
      .toThrowError(notArrayErrorMessage);

    expect(() => autocomplete.mapAutocompleteFuncParamsToObject(number))
      .toThrowError(notArrayErrorMessage);

    expect(() => autocomplete.mapAutocompleteFuncParamsToObject(boolean))
      .toThrowError(notArrayErrorMessage);
  });

  test("throws when params passed are missing fields", () => {
    const paramsWithMissingName = [{
      type: "string",
      value: "test value",
    }];
    const paramsWithMissingType = [{
      name: "Some field",
      value: "some text",
    }];

    const missingNameErrorMessage = "Failed to map one of autocomplete parameters to object - `name` field is required";
    const missingTypeErrorMessage = "Failed to map one of autocomplete parameters to object - either `type` or `valueType` field is required";

    expect(() => autocomplete.mapAutocompleteFuncParamsToObject(paramsWithMissingName))
      .toThrowError(missingNameErrorMessage);

    expect(() => autocomplete.mapAutocompleteFuncParamsToObject(paramsWithMissingType))
      .toThrowError(missingTypeErrorMessage);
  });
});

describe("listRegions", () => {
  test("returns an array of objects with no empty values", () => {
    const regions = autocomplete.listRegions();
    expect(regions).toBeInstanceOf(Array);
    expect(regions.length).toBeGreaterThan(0);
    expect(regions.every(_.isObject)).toBe(true);

    regions.forEach((region) => {
      const keysAndValues = [..._.keys(region), ..._.values(region)];
      expect(keysAndValues).not.toContain(null);
      expect(keysAndValues).not.toContain(undefined);
      expect(keysAndValues).not.toContain(NaN);
    });
  });

  test("returns autocomplete items with regions data, properly filtered and sorted", () => {
    const allRegions = autocomplete.listRegions();
    const filteredRegions = autocomplete.listRegions("west");
    const emptyRegions = autocomplete.listRegions("this query has no chance to match");

    const expectedFilteredRegions = consts.ALL_AWS_REGIONS.filter((region) => region.regionId.includes("west"));

    expect(allRegions).toHaveLength(consts.ALL_AWS_REGIONS.length);
    allRegions.forEach(expectProperAutocompleteObject);
    expect(allRegions).toStrictEqual(_.sortBy(allRegions, "id"));

    expect(filteredRegions).toHaveLength(expectedFilteredRegions.length);
    filteredRegions.forEach(expectProperAutocompleteObject);
    expect(filteredRegions).toStrictEqual(_.sortBy(filteredRegions, "id"));

    expect(emptyRegions).toStrictEqual([]);
  });
});

describe("getRegionLabel", () => {
  test("returns correct label for given region", () => {
    const regionIds = consts.ALL_AWS_REGIONS.map((region) => region.regionId);
    const regionLabels = consts.ALL_AWS_REGIONS.map((region) => region.regionLabel);

    regionIds.forEach((id, index) => (
      expect(autocomplete.getRegionLabel(id)).toEqual(regionLabels[index])
    ));
  });

  test("throws if incorrect regionId provided", () => {
    const expectedErrorMessage = "Could not find a region label for region id: \"unknown_region\"";
    expect(() => autocomplete.getRegionLabel("unknown_region")).toThrowError(expectedErrorMessage);
  });
});

describe("autocompleteListFromAwsCall", () => {
  const listOfStrings = ["test value3", "test value1", "value2"];
  const listOfObjects = [
    {
      name: "name 3",
      value: "test value3",
    },
    {
      name: "name 1",
      value: "test value1",
    },
    {
      name: "name 2",
      value: "value2",
    },
  ];

  const mockClient = {
    listFunctionReturningArray: jest.fn().mockImplementation(() => ({
      promise: () => Promise.resolve(listOfStrings),
    })),

    listFunctionReturningObjectWithArray: jest.fn().mockImplementation(() => ({
      promise: () => Promise.resolve({ functionResult: listOfStrings }),
    })),

    listFunctionReturningObjectWithArrayOfObjects: jest.fn().mockImplementation(() => ({
      promise: () => Promise.resolve({ functionResult: listOfObjects }),
    })),
  };

  describe("returns a function that calls client method", () => {
    test("that throws if incorrect paths provided", async () => {
      const autocompleteFunction = autocomplete.autocompleteListFromAwsCall(
        "listFunctionReturningObjectWithArray",
        "nonExistentPath",
      );
      const anotherAutocompleteFunction = autocomplete.autocompleteListFromAwsCall(
        "listFunctionReturningObjectWithArrayOfObjects",
        "functionResult",
        "nonExistentPath2",
      );

      const noPathToArrayErrorMessage = "Path \"nonExistentPath\" doesn't exist on method call response";
      const noPathToValueErrorMessage = "Path \"nonExistentPath2\" doesn't exist on elements of array";

      await expect(() => autocompleteFunction("", [], mockClient)).rejects.toThrowError(noPathToArrayErrorMessage);
      await expect(() => anotherAutocompleteFunction("", [], mockClient)).rejects.toThrowError(noPathToValueErrorMessage);
    });

    describe("returning sorted list of autocomplete items", () => {
      test("if client method returns array and no paths provided", async () => {
        const autocompleteFunction = autocomplete.autocompleteListFromAwsCall("listFunctionReturningArray");
        const autocompleteList = await autocompleteFunction("", [], mockClient);
        expectSortedArrayOfAutocompleteObjects(autocompleteList, listOfStrings);
      });

      test("if client method returns an object and proper path to array is provided", async () => {
        const autocompleteFunction = autocomplete.autocompleteListFromAwsCall(
          "listFunctionReturningObjectWithArray",
          "functionResult",
        );
        const functionResult = await autocompleteFunction("", [], mockClient);
        expectSortedArrayOfAutocompleteObjects(functionResult, listOfStrings);
      });

      test("if client method returns an object with nested array of objects and proper paths are provided", async () => {
        const autocompleteFunction = autocomplete.autocompleteListFromAwsCall(
          "listFunctionReturningObjectWithArrayOfObjects",
          "functionResult",
          "value",
        );
        const functionResult = await autocompleteFunction("", [], mockClient);
        expectSortedArrayOfAutocompleteObjects(
          functionResult,
          listOfObjects.map(({ value }) => value),
        );
      });
    });

    test("returning properly filtered autocomplete items", async () => {
      const autocompleteFunction = autocomplete.autocompleteListFromAwsCall("listFunctionReturningArray");
      const functionResult = await autocompleteFunction("test", [], mockClient);
      const filteredValues = listOfObjects.map(({ value }) => value).filter((value) => value.includes("test"));
      expectSortedArrayOfAutocompleteObjects(functionResult, filteredValues);
    });
  });

  test("returns a function that throws if method not exists", async () => {
    const autocompleteFunction = autocomplete.autocompleteListFromAwsCall("nonExistentMethod");

    const noMethodErrorMessage = "Method \"nonExistentMethod\" doesn't exist on service";
    await expect(() => autocompleteFunction("", [], mockClient)).rejects.toThrowError(noMethodErrorMessage);
  });
});

describe("filterItemsByQuery", () => {
  const autocompleteItems = [
    { id: "id1", value: "value1" },
    { id: "id3", value: "test value3" },
    { id: "id2", value: "value2" },
    { id: "id5", value: "test value5" },
    { id: "id4", value: "value4" },
    { id: "id6", value: "test value6" },
  ];

  const allAutocompleteItemsValues = autocompleteItems.map(({ value }) => value);

  test("only sort the list if no query provided", () => {
    const resultArray = autocomplete.filterItemsByQuery(autocompleteItems);
    expectSortedArrayOfAutocompleteObjects(resultArray, allAutocompleteItemsValues);
  });

  test("properly filters the items with single word query", () => {
    const expectedValues = [
      "test value3",
      "test value5",
      "test value6",
    ];
    const resultArray = autocomplete.filterItemsByQuery(autocompleteItems, "test");
    expectSortedArrayOfAutocompleteObjects(resultArray, expectedValues);
  });

  test("properly filters the items with multi word query, regardless of the words order", () => {
    const expectedValues = [
      "test value3",
      "test value5",
      "test value6",
    ];
    const resultArray1 = autocomplete.filterItemsByQuery(autocompleteItems, "value test");
    const resultArray2 = autocomplete.filterItemsByQuery(autocompleteItems, "test value");

    expectSortedArrayOfAutocompleteObjects(resultArray1, expectedValues);
    expect(resultArray1).toStrictEqual(resultArray2);
  });

  test("returns an empty array if query doesn't match any item", () => {
    const resultArray = autocomplete.filterItemsByQuery(autocompleteItems, "definitely nothing match this query");
    expect(resultArray).toStrictEqual([]);
  });

  test("limits the number of returned values to defined default value", () => {
    const veryLongAutocompleteItemsArray = [];
    for (let i = 0; i < 10000; i += 1) {
      veryLongAutocompleteItemsArray.push({
        id: `id${i.toString()}`,
        value: `value${i.toString()}`,
      });
    }

    const resultArray = autocomplete.filterItemsByQuery(veryLongAutocompleteItemsArray);
    expect(resultArray).toHaveLength(consts.MAX_AUTOCOMPLETE_RESULTS);
  });
});

describe("toAutocompleteItemFromPrimitive", () => {
  test("returns autocomplete item with both fields set to value if no label provided", () => {
    const autocompleteItemFromPrimitive = autocomplete.toAutocompleteItemFromPrimitive("testItem");
    expectProperAutocompleteObject(autocompleteItemFromPrimitive);
    expect(autocompleteItemFromPrimitive.id).toEqual(autocompleteItemFromPrimitive.value);
  });

  test("returns proper autocomplete item if both params provided", () => {
    const autocompleteItemFromPrimitive = autocomplete.toAutocompleteItemFromPrimitive("testItem", "testLabel");
    expectProperAutocompleteObject(autocompleteItemFromPrimitive);
    expect(autocompleteItemFromPrimitive.id).toEqual("testItem");
    expect(autocompleteItemFromPrimitive.value).toEqual("testLabel");
  });
});
