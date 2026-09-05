import { expect, test } from "vitest";
import { host } from "./bridge";

test("host throws when __host is not installed", () => {
  // arrange - nothing installed

  // act
  const act = () => host();

  // assert
  expect(act).toThrow(/__host is not installed/);
});
