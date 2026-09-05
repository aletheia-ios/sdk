import { expect, test } from "vitest";
import { SourceError } from "./error";

test("SourceError defaults its message to the code", () => {
  // arrange
  const code = "notFound";

  // act
  const error = new SourceError(code);

  // assert
  expect(error.message).toBe("notFound");
  expect(error.name).toBe("SourceError");
  expect(error.code).toBe("notFound");
  expect(error.status).toBeUndefined();
});

test("SourceError keeps an explicit message and status", () => {
  // arrange
  const code = "badResponse";

  // act
  const error = new SourceError(code, "403 from https://x", { status: 403 });

  // assert
  expect(error.message).toBe("403 from https://x");
  expect(error.status).toBe(403);
  expect(error).toBeInstanceOf(Error);
});

test("SourceError carries the cause it wraps", () => {
  // arrange
  const cause = new SyntaxError("Unexpected token");

  // act
  const error = new SourceError("parse", "not json", { cause });

  // assert
  expect(error.cause).toBe(cause);
});
