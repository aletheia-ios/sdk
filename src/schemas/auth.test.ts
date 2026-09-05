import { expect, test } from "vitest";
import { AuthSpec } from "./auth";

test("auth spec accepts cookie and meta requirements and refuses an empty or mixed one", () => {
  // arrange
  const spec = {
    requirements: [
      { cookie: "cf_clearance" },
      { cookie: "session", optional: true },
      { meta: "csrf-token", header: "X-CSRF-TOKEN" },
    ],
    challengeURL: "https://x.com/error/404",
    userAgent: null,
    maneuver: "Complete the check.",
    interactive: true,
    pinChallengeURL: true,
  };
  const empty = { ...spec, requirements: [] };
  const mixed = { ...spec, requirements: [{ cookie: "a", header: "b" }] };

  // act
  const results = [spec, empty, mixed].map((input) => AuthSpec.safeParse(input).success);

  // assert
  expect(results).toEqual([true, false, false]);
});
