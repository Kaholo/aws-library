const parsers = require("../parsers");

describe("Object parser", () => {
  const properObject = {
    stringParam: "first",
    numberParam: 123,
    arrayParam: [1,2,3,4],
    objectParam: {
      test: "param"
    }
  };

  test("returns an argument if proper object passed", () => {
    expect(parsers.object(properObject)).toBe(properObject);
  });

  test("returns parsed object if proper JSON passed", () => {
    const json = `{"stringParam":"first","numberParam":123,"arrayParam":[1,2,3,4],"objectParam":{"test":"param"}}`;
    expect(parsers.object(json)).toStrictEqual(properObject);
  });

  test("throws if malformed JSON passed", () => {
    expect(() => parsers.object("{\"name:}\"")).toThrowError("Couldn't parse provided value as object: {\"name:}\"");
  });

  test("throws if valid JSON passed and parsed value is not an object", () => {
    const expectedErrorMessage = `Couldn't parse provided value as object: string-value`;
    expect(() => parsers.object("string-value")).toThrowError(expectedErrorMessage);
  });

  test("throws if neither object nor JSON string passed", () => {
    const expectedErrorMessage = `123 is not a valid object`;
    expect(() => parsers.object(123)).toThrowError(expectedErrorMessage);
  });
});

describe("Number parser", () => {
  test("returns an argument if proper number passed", () => {
    expect(parsers.number(123)).toEqual(123);
  });

  test("returns a properly parsed integer if number string passed", () => {
    expect(parsers.number("123")).toEqual(123);
  });

  test("returns a properly parsed float if number string passed", () => {
    expect(parsers.number("123.123")).toEqual(123.123);
  });

  test("throws if Infinity passed", () => {
    const expectedErrorMessage = `Value Infinity is not a valid number`;
    expect(() => parsers.number(1/0)).toThrowError(expectedErrorMessage);
  });

  test("throws if NaN passed", () => {
    const expectedErrorMessage = `Value NaN is not a valid number`;
    expect(() => parsers.number(1/"nan")).toThrowError(expectedErrorMessage);
  });

  test("throws if another value type is passed", () => {
    const expectedErrorMessage = `Value [object Object] is not a valid number`;
    expect(() => parsers.number({})).toThrowError(expectedErrorMessage);
  });
});

describe("Boolean parser", () => {
  test("returns argument if proper boolean value passed", () => {
    expect(parsers.boolean(true)).toBe(true);
    expect(parsers.boolean(false)).toBe(false);
  });

  test("returns false if empty string passed", () => {
    expect(parsers.boolean("")).toBe(false);
  });

  test("returns proper value if true/false string passed", () => {
    expect(parsers.boolean("true")).toBe(true);
    expect(parsers.boolean("false")).toBe(false);
  });

  test("returns proper value if true/false string passed", () => {
    expect(parsers.boolean("true")).toBe(true);
    expect(parsers.boolean("false")).toBe(false);
    expect(parsers.boolean("TRUE")).toBe(true);
    expect(parsers.boolean("FaLsE")).toBe(false);
  });

  test("returns false if null / undefined passed", () => {
    expect(parsers.boolean(null)).toBe(false);
    expect(parsers.boolean(undefined)).toBe(false);
  });

  test("throws if value is not of type boolean", () => {
    const expectedErrorMessage = `Value 123 is not of type boolean`;
    expect(() => parsers.boolean(123)).toThrowError(expectedErrorMessage);
  });
});

describe("String parser", () => {
  test("returns argument if proper string passed", () => {
    expect(parsers.string("hello")).toBe("hello");
  });

  test("returns empty string if null, undefined or empty string passed", () => {
    expect(parsers.string(null)).toBe("");
    expect(parsers.string(undefined)).toBe("");
    expect(parsers.string("")).toBe("");
  });

  test("throws if something else passed", () => {
    const expectedErrorMessage = `Value 123 is not a valid string`;
    expect(() => parsers.string(123)).toThrowError(expectedErrorMessage);
  });
});

describe("Autocomplete parser", () => {
  const stringValueItem = { id: "Test value", value: "Test label" };
  const numberValueItem = { id: 123, value: "Test label" };

  test("returns proper value if autocomplete item passed", () => {
    expect(parsers.autocomplete(stringValueItem)).toBe("Test value");
    expect(parsers.autocomplete(numberValueItem)).toBe(123);
  });

  test("returns empty string if null / undefined passed", () => {
    expect(parsers.autocomplete(null)).toBe("");
    expect(parsers.autocomplete(undefined)).toBe("");
  });

  test("returns an argument if string passed", () => {
    expect(parsers.autocomplete("Test value")).toBe("Test value");
  });

  test("throws if another kind of value passed", () => {
    const expectedErrorMessage = `Value "[object Object]" is not a valid autocomplete result nor string.`;
    expect(() => parsers.autocomplete({})).toThrowError(expectedErrorMessage);
  })
});

describe("Array parser", () => {
  test("returns argument if proper array passed", () => {
    expect(parsers.array([1,2,3,4])).toStrictEqual([1,2,3,4]);
  });

  test("return empty array if null / undefined passed", () => {
    expect(parsers.array(null)).toStrictEqual([]);
    expect(parsers.array(undefined)).toStrictEqual([]);
  });

  test("return array of strings split by new line if string passed", () => {
    const emptyString = "";
    const singleLineString = "single line";
    const multilineString = "line one\nline two\nline three";

    expect(parsers.array(emptyString)).toStrictEqual([]);
    expect(parsers.array(singleLineString)).toStrictEqual([singleLineString]);

    expect(parsers.array(multilineString).length === 3).toBe(true);
    expect(parsers.array(multilineString)[0]).toStrictEqual("line one");
  });

  test("throws if something else provided", () => {
    const expectedErrorMessage = "Unsupported array format";
    expect(() => parsers.array(123)).toThrowError(expectedErrorMessage);
  });
});

describe("Tags parser", () => {
  const tagObject = { Key: "hello", Value: "world" };

  const tagsString = "First tag = First_value\nMiddle-tag=Middlevalue\nLast.tag    =Last#value";
  const properTagsArray = [
    { Key: "First tag", Value: "First_value" },
    { Key: "Middle-tag", Value: "Middlevalue" },
    { Key: "Last.tag", Value: "Last#value" }
  ];

  const anotherTagsString = "anotherTag=anotherValue\nyetAnotherTag=someValue";
  const anotherProperTagsArray = [
    { Key: "anotherTag", Value: "anotherValue" },
    { Key: "yetAnotherTag", Value: "someValue" },
  ];

  const multiTagObject = {
    "First tag": "First_value",
    "Middle-tag": "Middlevalue",
    "Last.tag": "Last#value",
  }

  test("returns an array with argument if proper tag object passed", () => {
    const parsed = parsers.tags(tagObject);
    expect(parsed).toContain(tagObject);
    expect(parsed.length).toEqual(1);
  });

  test("returns an argument if proper tags array passed", () => {
    expect(parsers.tags(properTagsArray)).toStrictEqual(properTagsArray);
  });

  test("returns a proper array of tags if valid tags string passed", () => {
    expect(parsers.tags(tagsString)).toStrictEqual(properTagsArray);
  });

  test("returns a proper array of tags if non-tag object passed", () => {
    expect(parsers.tags(multiTagObject)).toStrictEqual(properTagsArray);
  });

  test("returns a proper array of tags if array of tag strings passed", () => {
    const parsed = parsers.tags([tagsString, anotherTagsString]);
    expect(parsed).toStrictEqual([...properTagsArray, ...anotherProperTagsArray]);
  });

  test("returns empty array if null/undefined or empty array/string/object passed", () => {
    expect(parsers.tags(null)).toStrictEqual([]);
    expect(parsers.tags(undefined)).toStrictEqual([]);
    expect(parsers.tags("")).toStrictEqual([]);
    expect(parsers.tags([])).toStrictEqual([]);
    expect(parsers.tags({})).toStrictEqual([]);
  });

  test("throws if string in incorrect format passed", () => {
    const expectedErrorMessage = `Incorrectly formatted tag string: someText`;
    expect(() => parsers.tags("someText")).toThrowError(expectedErrorMessage);
  });

  test("throws if another type of value passed", () => {
    const expectedErrorMessage = "Unsupported tags format!";
    expect(() => parsers.tags(5)).toThrowError(expectedErrorMessage);
    expect(() => parsers.tags(true)).toThrowError(expectedErrorMessage);
    expect(() => parsers.tags(false)).toThrowError(expectedErrorMessage);
  });
});
