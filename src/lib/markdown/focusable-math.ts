import type { Root, RootContent } from "hast";

const displayMathClass = "katex-display";
const keyboardFocusable = 0;

function markDisplayMath(nodes: readonly RootContent[]): void {
  for (const node of nodes) {
    if (node.type !== "element") {
      continue;
    }
    const { className } = node.properties;
    if (Array.isArray(className) && className.includes(displayMathClass)) {
      node.properties.tabIndex = keyboardFocusable;
    }
    markDisplayMath(node.children);
  }
}

/**
 * Rehype plugin: wide display formulas scroll sideways, and a scrollable
 * region must be reachable by keyboard (WCAG 2.1.1), so make them focusable.
 * Runs after rehype-katex, which creates the display elements.
 */
export function rehypeFocusableMath(): (tree: Root) => void {
  return (tree) => markDisplayMath(tree.children);
}
