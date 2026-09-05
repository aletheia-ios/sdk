import { expect, test } from "vitest";
import { base64Decode, base64Encode, hexDecode, hexEncode, utf8Decode, utf8Encode } from "./bytes";

const SAMPLE = Uint8Array.from([0, 1, 2, 250, 251, 252, 253, 254, 255, 63, 62]);

test("utf8Encode matches node for ascii, multibyte and astral text", () => {
  // arrange
  const texts = ["", "plain", "café", "日本語", "\u{1F600}", "a\u{1F600}b"];

  // act
  const encoded = texts.map((text) => Array.from(utf8Encode(text)));

  // assert
  expect(encoded).toEqual(texts.map((text) => Array.from(Buffer.from(text, "utf8"))));
});

test("utf8Decode round-trips utf8Encode", () => {
  // arrange
  const texts = ["", "plain", "café", "日本語", "\u{1F600}", "a\u{1F600}b"];

  // act
  const decoded = texts.map((text) => utf8Decode(utf8Encode(text)));

  // assert
  expect(decoded).toEqual(texts);
});

test("base64Encode matches node in the standard alphabet with padding", () => {
  // arrange
  const bytes = SAMPLE;

  // act
  const result = base64Encode(bytes);

  // assert
  expect(result).toBe(Buffer.from(bytes).toString("base64"));
});

test("base64Encode matches node in the url alphabet, unpadded unless asked", () => {
  // arrange
  const bytes = SAMPLE;

  // act
  const unpadded = base64Encode(bytes, { url: true });
  const padded = base64Encode(bytes, { url: true, pad: true });

  // assert
  expect(unpadded).toBe(Buffer.from(bytes).toString("base64url"));
  expect(padded).toBe(`${Buffer.from(bytes).toString("base64url")}=`);
});

test("base64Decode accepts either alphabet, padding optional, whitespace ignored", () => {
  // arrange
  const standard = Buffer.from(SAMPLE).toString("base64");
  const url = Buffer.from(SAMPLE).toString("base64url");
  const spaced = `${standard.slice(0, 4)}\n ${standard.slice(4)}`;

  // act
  const results = [standard, url, spaced].map(base64Decode);

  // assert
  for (const result of results) expect(result).toEqual(SAMPLE);
});

test("base64Decode throws on a character outside both alphabets", () => {
  // arrange
  const input = "!!!!";

  // act
  const act = () => base64Decode(input);

  // assert
  expect(act).toThrow(/invalid base64/);
});

test("hexEncode and hexDecode round-trip, decode ignoring whitespace and case", () => {
  // arrange
  const bytes = Uint8Array.from([0, 15, 16, 255]);

  // act
  const encoded = hexEncode(bytes);
  const decoded = hexDecode("00 0F 10 FF");

  // assert
  expect(encoded).toBe("000f10ff");
  expect(decoded).toEqual(bytes);
});

test("hexDecode throws on odd length or a non-hex pair", () => {
  // arrange
  const inputs = ["abc", "zz"];

  // act
  const acts = inputs.map((input) => () => hexDecode(input));

  // assert
  for (const act of acts) expect(act).toThrow();
});

test("base64Encode pads every remainder length like node does", () => {
  // arrange
  const inputs = [0, 1, 2, 3, 4].map((length) => Uint8Array.from({ length }, (_, i) => i + 65));

  // act
  const padded = inputs.map((bytes) => base64Encode(bytes));
  const unpadded = inputs.map((bytes) => base64Encode(bytes, { pad: false }));
  const urlPadded = inputs.map((bytes) => base64Encode(bytes, { url: true, pad: true }));

  // assert
  expect(padded).toEqual(inputs.map((bytes) => Buffer.from(bytes).toString("base64")));
  expect(unpadded).toEqual(
    inputs.map((bytes) => Buffer.from(bytes).toString("base64").replace(/[=]+$/, "")),
  );
  expect(urlPadded).toEqual(
    inputs.map((bytes) => {
      const url = Buffer.from(bytes).toString("base64url");
      return url + "=".repeat((4 - (url.length % 4)) % 4);
    }),
  );
});
