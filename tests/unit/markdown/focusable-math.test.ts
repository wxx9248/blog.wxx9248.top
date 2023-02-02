import type { Element, Root } from "hast";
import { expect, it } from "vitest";
import { rehypeFocusableMath } from "@/lib/markdown/focusable-math";

function span(className: string[]): Element {
  return {
    children: [],
    properties: { className },
    tagName: "span",
    type: "element"
  };
}

it("makes display math focusable so it can be scrolled by keyboard", () => {
  const display = span(["katex-display"]);
  const inline = span(["katex"]);
  const tree: Root = {
    children: [
      {
        children: [display, inline],
        properties: {},
        tagName: "p",
        type: "element"
      }
    ],
    type: "root"
  };
  rehypeFocusableMath()(tree);

  expect(display.properties.tabIndex).toBe(0);
  expect(inline.properties.tabIndex).toBeUndefined();
});
