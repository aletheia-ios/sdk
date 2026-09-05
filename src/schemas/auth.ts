import { z } from "zod";
import { templatedURL } from "./scalars";

/** Validates one `AuthRequirement`: a cookie by name, or a meta tag sent back as a header. */
export const AuthRequirement = z
  .union([
    z.strictObject({
      cookie: z.string().min(1).meta({ description: "A cookie the capture waits for, by name." }),
      optional: z.boolean().optional().meta({
        description:
          "Do not wait for it, but keep it if it appears. For a wall that does not always mint one.",
      }),
    }),
    z.strictObject({
      meta: z
        .string()
        .min(1)
        .meta({ description: 'A <meta name="..."> tag whose content is captured.' }),
      header: z.string().min(1).meta({ description: "The header that content is sent back as." }),
    }),
  ])
  .meta({ id: "AuthRequirement" });

/** Validates `auth.json`. */
export const AuthSpec = z
  .strictObject({
    $schema: z.string().optional(),
    requirements: z.array(AuthRequirement).min(1),
    challengeURL: templatedURL.meta({
      description: "The page the capture loads. Only an HTML route can serve a meta requirement.",
    }),
    userAgent: z
      .string()
      .nullable()
      .meta({ description: "Pin one, or null to capture whatever the WebView reports." }),
    maneuver: z
      .string()
      .min(1)
      .meta({ description: "The one line of instruction shown to the reader above the WebView." }),
    interactive: z.boolean().meta({
      description: "Show the WebView so the reader can act, rather than running it hidden.",
    }),
    pinChallengeURL: z.boolean().optional().meta({
      description:
        "Always load challengeURL; never retarget to the request that was refused. For a host whose API is never itself challenged.",
    }),
  })
  .meta({
    id: "AuthSpec",
    description:
      "auth.json - present only for a source behind a wall. Its presence is the capability; the script has nothing to implement.",
  });
