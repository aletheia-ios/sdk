import { afterEach, expect, test } from "vitest";
import type { Request, Response } from "@/types";
import { SourceError } from "@/utils/error";
import type { Host } from "./bridge";
import { fetchJSON, fetchText, request } from "./fetch";

const globals = globalThis as { __host?: Host | undefined };

afterEach(() => {
  globals.__host = undefined;
});

function respond(status: number, text: string): void {
  globals.__host = {
    fetch: async (req: Request): Promise<Response> => ({ status, headers: {}, url: req.url, text }),
    html: {} as Host["html"],
  };
}

test("request returns the response untouched, whatever the status", async () => {
  // arrange
  respond(403, "nope");

  // act
  const response = await request({ url: "https://x/bad" });

  // assert
  expect(response).toEqual({ status: 403, headers: {}, url: "https://x/bad", text: "nope" });
});

test("fetchText returns the body on 2xx", async () => {
  // arrange
  respond(200, "hello");

  // act
  const text = await fetchText({ url: "https://x/text" });

  // assert
  expect(text).toBe("hello");
});

test("fetchText throws badResponse with the status outside 2xx", async () => {
  // arrange
  respond(403, "nope");

  // act
  const act = fetchText({ url: "https://x/bad" });

  // assert
  await expect(act).rejects.toMatchObject({
    name: "SourceError",
    code: "badResponse",
    status: 403,
  });
  await expect(act).rejects.toBeInstanceOf(SourceError);
});

test("fetchJSON parses the body", async () => {
  // arrange
  respond(200, '{"a":1}');

  // act
  const result = await fetchJSON<{ a: number }>({ url: "https://x/json" });

  // assert
  expect(result).toEqual({ a: 1 });
});

test("fetchJSON throws parse with the underlying error as cause", async () => {
  // arrange
  respond(200, "not json");

  // act
  const act = fetchJSON({ url: "https://x/text" });

  // assert
  await expect(act).rejects.toMatchObject({ code: "parse", cause: expect.any(SyntaxError) });
});
