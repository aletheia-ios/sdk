import { expect, test } from "vitest";
import { encodeComponent, formBody, queryString, withQuery } from "./form";

test("encodeComponent escapes the characters encodeURIComponent leaves alone", () => {
  // arrange
  const inputs = ["a b", "it's (x)*!", "-._~", "日"];

  // act
  const results = inputs.map(encodeComponent);

  // assert
  expect(results).toEqual(["a%20b", "it%27s%20%28x%29%2A%21", "-._~", "%E6%97%A5"]);
});

test("queryString keeps repeated keys in caller order", () => {
  // arrange
  const params: [string, string][] = [
    ["content_rating[]", "safe"],
    ["content_rating[]", "suggestive"],
    ["page", "1"],
  ];

  // act
  const result = queryString(params);

  // assert
  expect(result).toBe("content_rating%5B%5D=safe&content_rating%5B%5D=suggestive&page=1");
});

test("queryString accepts a record and preserves its key order", () => {
  // arrange
  const params = { b: "2", a: "1" };

  // act
  const result = queryString(params);

  // assert
  expect(result).toBe("b=2&a=1");
});

test("queryString of nothing is empty", () => {
  // arrange
  const params: [string, string][] = [];

  // act
  const result = queryString(params);

  // assert
  expect(result).toBe("");
});

test("withQuery appends with ? on a bare url and & on one that has a query", () => {
  // arrange
  const bare = "https://x.com/api";
  const queried = "https://x.com/api?x=1";

  // act
  const results = [
    withQuery(bare, { q: "a" }),
    withQuery(queried, { q: "a" }),
    withQuery(bare, {}),
  ];

  // assert
  expect(results).toEqual([
    "https://x.com/api?q=a",
    "https://x.com/api?x=1&q=a",
    "https://x.com/api",
  ]);
});

test("formBody uses the same encoding as a query string", () => {
  // arrange
  const fields: [string, string][] = [
    ["title_id", "abc"],
    ["userSettingsEnabled", "false"],
  ];

  // act
  const result = formBody(fields);

  // assert
  expect(result).toBe("title_id=abc&userSettingsEnabled=false");
});
