import type { Element, Root } from "hast";
import { expect, it } from "vitest";
import { rehypeHeadingMarkers } from "@/lib/markdown/heading-markers";

function heading(tagName: string): Element {
  return {
    children: [{ type: "text", value: "Title" }],
    properties: {},
    tagName,
    type: "element"
  };
}

it("prepends an aria-hidden marker matching the heading level", () => {
  const tree: Root = {
    children: [heading("h2"), heading("h4"), heading("p")],
    type: "root"
  };
  rehypeHeadingMarkers()(tree);
  const [h2, h4, paragraph] = tree.children as Element[];

  expect(h2?.children[0]).toEqual({
    children: [{ type: "text", value: "## " }],
    properties: { ariaHidden: "true", className: ["heading-marker"] },
    tagName: "span",
    type: "element"
  });
  expect(h4?.children[0]).toMatchObject({
    children: [{ type: "text", value: "#### " }]
  });
  expect(paragraph?.children).toHaveLength(1);
});
