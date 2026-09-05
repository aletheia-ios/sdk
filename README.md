# @aletheia-ios/sdk

[![npm](https://img.shields.io/npm/v/@aletheia-ios/sdk?logo=npm)](https://www.npmjs.com/package/@aletheia-ios/sdk)
[![ci](https://github.com/aletheia-ios/sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/aletheia-ios/sdk/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

The contract for writing a source package for [Aletheia](https://aletheia.moe), an offline-first
reader for series, manhwa and manhua on iOS.

A source is a small TypeScript program that runs inside the app in JavaScriptCore. It tells the
app how to search a site, read a series, list its chapters and find its pages. The app does the
networking, the credentials and the HTML parsing; the source describes requests and maps
responses.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Usage](#usage)
  - [`types`](#aletheia-iossdktypes)
  - [`host`](#aletheia-iossdkhost)
  - [`utils`](#aletheia-iossdkutils)
  - [`schemas` and `json-schema`](#aletheia-iossdkschemas-and-json-schema)
- [A package](#a-package)
- [The runtime](#the-runtime)
- [Development](#development)
- [Related](#related)
- [Contributing](#contributing)
- [License](#license)

## Install

```sh
pnpm add -D @aletheia-ios/sdk
```

Requires Node 22 or later to build with. The published output is ES2022 and runs in
JavaScriptCore on iOS 26.

There is no root export. Import the subpath you need:

| Subpath | Holds | Reaches the device? |
|---|---|---|
| `@aletheia-ios/sdk/types` | the contract as TypeScript types: `Source`, the opt-in interfaces, every DTO | no, types only |
| `@aletheia-ios/sdk/host` | the bridge to the app: `fetchJSON`, `fetchText`, `request`, `parseHTML`, `markdown` | yes, about 0.7 kB |
| `@aletheia-ios/sdk/utils` | date parsers, byte codecs, query encoding, `allowsAdult`, `SourceError` | yes, only what you use |
| `@aletheia-ios/sdk/schemas` | the same contract as Zod schemas, for tooling that validates package files | no, never import this from a source |
| `@aletheia-ios/sdk/json-schema/*` | JSON Schema for `source.json`, `filters.json`, `auth.json`, `index.json` | no, for your editor |

## Quick start

The fastest route is [`@aletheia-ios/tools`](https://github.com/aletheia-ios/tools), which
scaffolds a working package and builds, checks and packs it:

```sh
pnpm add -D @aletheia-ios/sdk @aletheia-ios/tools
pnpm exec aletheia new mysite --name "My Site"
pnpm exec aletheia check
```

`new` gives you an offline source that already passes `check`. Replace `src/index.ts` with a
real one:

```ts
import { fetchJSON } from "@aletheia-ios/sdk/host";
import type { Source } from "@aletheia-ios/sdk/types";
import { allowsAdult, parseISO, withQuery } from "@aletheia-ios/sdk/utils";
import filters from "../filters.json";
import manifest from "../source.json";

const source: Source = {
  async search(query) {
    const gateOpen = allowsAdult(query, manifest.contentRating, filters);
    const page = Number(query.cursor ?? "1");
    const listing = await fetchJSON<Listing>({
      url: withQuery("https://api.example.com/series", { q: query.text ?? "", page: String(page), adult: String(gateOpen) }),
    });
    return {
      items: listing.results.map((row) => ({ slug: row.id, title: row.title, cover: row.cover, adult: row.nsfw })),
      next: listing.hasMore ? String(page + 1) : null,
    };
  },

  async details(seriesSlug) {
    const row = await fetchJSON<Series>({ url: `https://api.example.com/series/${seriesSlug}` });
    return {
      slug: row.id,
      title: row.title,
      altTitles: row.aliases,
      synopsis: row.summary,
      url: `https://example.com/series/${row.id}`,
      classification: row.nsfw ? "Explicit" : "Safe",
      publication: row.ongoing ? "Ongoing" : "Completed",
      covers: [row.cover],
      tags: row.tags,
      authors: row.authors,
    };
  },

  async chapters(seriesSlug) {
    const rows = await fetchJSON<Chapter[]>({ url: `https://api.example.com/series/${seriesSlug}/chapters` });
    return rows.map((row) => ({
      slug: row.id,
      title: row.title,
      number: row.number,
      language: "en",
      scanlator: row.group ?? "My Site",
      url: `https://example.com/read/${row.id}`,
      publishedDate: parseISO(row.publishedAt),
    }));
  },

  async content(_seriesSlug, chapterSlug) {
    const pages = await fetchJSON<string[]>({ url: `https://api.example.com/chapters/${chapterSlug}/pages` });
    return pages.map((url, index) => ({ index, url }));
  },
};

export default source;
```

## Usage

### `@aletheia-ios/sdk/types`

Everything a source implements or returns. Four required calls on `Source`; opt into more by
intersection, and the app derives what the source can do from which methods the exported
object has:

```ts
import type { Commenting, Revalidating, Source } from "@aletheia-ios/sdk/types";

const source: Source & Revalidating & Commenting = {
  // search, details, chapters, content
  async chaptersChanged(seriesSlug, stored) { /* "unchanged" or the full list */ },
  async comments(seriesSlug, chapterSlug, next) { /* one page of a thread */ },
};
```

| Interface | Adds | For |
|---|---|---|
| `Commenting` | `comments`, optional `replies` | a site with per-chapter discussion |
| `Revalidating` | `chaptersChanged` | a site whose feed states a trustworthy total |
| `ChallengeAware` | `isChallenge` | a site whose 403 is not always a bot wall |
| `SignedPing` | `pingURL` | a site whose health endpoint needs a signature |

Authentication is not an interface. A package that needs a credential ships an `auth.json`;
the app captures and applies it, and the source never sees it.

### `@aletheia-ios/sdk/host`

The only way out of the sandbox.

```ts
import { fetchJSON, fetchText, markdown, parseHTML, request } from "@aletheia-ios/sdk/host";

const doc = parseHTML(await fetchText({ url }));
const rows = doc.select("li.chapter");                  // jsoup dialect: :contains, :has, :containsData
const title = doc.first("h1")?.text() ?? "";
const synopsis = markdown(doc.first(".summary")?.data() ?? "");

const raw = await request({ url, credentials: "omit" }); // status never throws here
```

`request` returns the response as-is; `fetchText` and `fetchJSON` throw `SourceError` outside
2xx. The host applies the credential, enforces the manifest's `hosts` allowlist and rate limit,
and handles any challenge before the promise resolves. A challenge sheet the reader taps
through happens inside that one `await`.

### `@aletheia-ios/sdk/utils`

| Export | Does |
|---|---|
| `parseISO`, `parseDateTime`, `parseMonthName`, `parseRelative`, `parseDate`, `fromEpochSeconds` | site date text to epoch milliseconds, or `null` |
| `utf8Encode`, `utf8Decode`, `base64Encode`, `base64Decode`, `hexEncode`, `hexDecode` | byte codecs, for signers and decoders |
| `encodeComponent`, `queryString`, `withQuery`, `formBody`, `FORM_CONTENT_TYPE` | RFC 3986 strict query and form encoding, order preserved |
| `allowsAdult` | whether the reader opened the adult gate |
| `SourceError` | the failures the app understands: `noPages`, `notFound`, `badResponse`, `parse` |

Every export has JSDoc with the reasoning and, where it applies, a link to the spec it
implements.

### `@aletheia-ios/sdk/schemas` and `json-schema`

The contract as Zod, for tooling. `@aletheia-ios/tools` uses it to validate package files; you
do not import it from a source. The same schemas are emitted as JSON Schema, so an editor
validates the files as you type:

```json
{
  "$schema": "./node_modules/@aletheia-ios/sdk/dist/json-schema/source.json",
  "slug": "mysite"
}
```

## A package

Five files, zipped as `<slug>-v<version>.althsource` by `@aletheia-ios/tools`:

| File | Read by | Holds |
|---|---|---|
| `source.json` | the app, without running anything | identity, versions, URLs, `hosts` allowlist, sort, presets, settings |
| `filters.json` | the app | the Refine sheet |
| `auth.json` | the app | how to obtain a credential; present only when the site needs one |
| `icon.png` | the app | 512x512, rasterised from your `icon.svg` |
| `main.js` | JavaScriptCore | your source, bundled to one file |

Only `main.js` runs. The Sources screen, filter sheets and preset grids render from the JSON
alone.

## The runtime

Bare JavaScriptCore. No `fetch`, no DOM, no `TextEncoder`, no `atob`, no `URL`, no
`setTimeout`. This package compiles against `lib: ["es2022"]` alone, so reaching for one of
those is a type error rather than a crash on a phone. The host installs `console` and one
object, `__host`, which `host` wraps. Everything else you need is in `utils`.

Rules a source lives by:

- Never call `__host` directly. Use the wrappers so a bridge change never reaches your code.
- Never catch a rejection from a fetch without rethrowing. A cancelled request must stay cancelled.
- Return the contract's shapes exactly. The app validates every result; an extra field is
  ignored, a missing one fails the call.
- Dates are epoch milliseconds or `null`. Cursors and `PageURL.meta` are opaque strings the app
  hands back untouched.
- When `allowsAdult` says the gate is shut, the request must actively exclude adult content.
  Omitting the parameter is not the same: most sites default an unasked question the other way.

## Development

```sh
pnpm install     # also installs the git hooks
pnpm check       # typecheck, lint, build, test with coverage, publint, attw
pnpm test        # vitest with coverage thresholds
pnpm build       # dist/ plus dist/json-schema/
```

| Tool | Role |
|---|---|
| TypeScript 7 | strict, ES2022, no DOM lib |
| tsdown | one bundle per subpath, `.d.ts` included, zod left external |
| Biome | formatting and linting at the `all` preset |
| vitest | tests beside their modules, v8 coverage with thresholds |
| lefthook | pre-commit formats staged files and runs typecheck and tests; pre-push runs `pnpm check` |

Publishing is by tag through GitHub's OIDC trusted publishing; no npm token exists.

## Related

| Repository | What |
|---|---|
| [aletheia-ios/tools](https://github.com/aletheia-ios/tools) | the `aletheia` CLI: build, check, pack, index, serve, new, live |
| [aletheia-ios/sample](https://github.com/aletheia-ios/sample) | a real source (MangaDex) and the sample source list |

## Contributing

Issues and pull requests are welcome. Run `pnpm check` before opening one; the hooks run the
same checks on commit and push. Commit messages follow Conventional Commits, subject only:
`feat: add a date format`.

## License

[MIT](LICENSE)
