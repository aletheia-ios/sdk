import { afterEach, expect, test } from "vitest";
import type { Host } from "./bridge";
import { markdown, parseHTML } from "./html";

const globals = globalThis as { __host?: Host | undefined };

afterEach(() => {
  globals.__host = undefined;
});

function install(): void {
  globals.__host = {
    fetch: () => Promise.reject(new Error("unused")),
    html: {
      parse: () => 1,
      select: (_handle, selector) => (selector === "none" ? [] : [2, 3]),
      attr: (handle, name) => `${handle}:${name}`,
      text: (handle) => `text${handle}`,
      ownText: (handle) => `own${handle}`,
      wholeText: (handle) => `whole${handle}`,
      data: (handle) => `data${handle}`,
      className: (handle) => `class${handle}`,
      tagName: (handle) => `tag${handle}`,
      childNodes: () => [
        { kind: "text", text: "t" },
        { kind: "element", handle: 9 },
      ],
      parent: (handle) => (handle === 1 ? null : 1),
      markdown: (html) => `md:${html}`,
    },
  };
}

test("select and first wrap the handles the host returns", () => {
  // arrange
  install();

  // act
  const doc = parseHTML("<p>");
  const [a, b] = doc.select("p");

  // assert
  expect([a?.handle, b?.handle]).toEqual([2, 3]);
  expect(doc.first("p")?.handle).toBe(2);
  expect(doc.first("none")).toBeNull();
});

test("every accessor forwards to the handle api", () => {
  // arrange
  install();

  // act
  const element = parseHTML("<p>").first("p");

  // assert
  expect(element?.attr("href")).toBe("2:href");
  expect(element?.text()).toBe("text2");
  expect(element?.ownText()).toBe("own2");
  expect(element?.wholeText()).toBe("whole2");
  expect(element?.data()).toBe("data2");
  expect(element?.className()).toBe("class2");
  expect(element?.tagName()).toBe("tag2");
});

test("childNodes wraps element children and passes text through", () => {
  // arrange
  install();

  // act
  const nodes = parseHTML("<p>").first("p")?.childNodes() ?? [];

  // assert
  expect(nodes[0]).toEqual({ kind: "text", text: "t" });
  expect(nodes[1]?.kind === "element" && nodes[1].element.handle).toBe(9);
});

test("parent is null at the root and an element below it", () => {
  // arrange
  install();

  // act
  const doc = parseHTML("<p>");
  const child = doc.first("p");

  // assert
  expect(doc.parent()).toBeNull();
  expect(child?.parent()?.handle).toBe(1);
});

test("markdown forwards to the host", () => {
  // arrange
  install();

  // act
  const result = markdown("<b>x</b>");

  // assert
  expect(result).toBe("md:<b>x</b>");
});
