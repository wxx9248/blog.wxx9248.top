import type { Element, Root, RootContent } from "hast";

const headingTagPattern = /^h(?<level>[1-6])$/u;

function marker(level: number): Element {
  return {
    children: [{ type: "text", value: `${"#".repeat(level)} ` }],
    properties: { ariaHidden: "true", className: ["heading-marker"] },
    tagName: "span",
    type: "element"
  };
}

function addMarkers(nodes: readonly RootContent[]): void {
  for (const node of nodes) {
    if (node.type !== "element") {
      continue;
    }
    const level = headingTagPattern.exec(node.tagName)?.groups?.level;
    if (level) {
      node.children.unshift(marker(Number(level)));
    } else {
      addMarkers(node.children);
    }
  }
}

/**
 * Rehype plugin: prefixes headings with Markdown-style "##" markers. They are
 * aria-hidden so screen readers and link names use only the heading text.
 */
export function rehypeHeadingMarkers(): (tree: Root) => void {
  return (tree) => addMarkers(tree.children);
}
