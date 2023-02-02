import { resolve, semanticTokens } from "@wxx9248/colors";
import type { Theme } from "@/scripts/theme";
import { giscusOrigin } from "./client";

/**
 * Giscus's theme variables, named after GitHub's, and the site's token for each.
 * Everything else, such as the syntax colors in code, stays as Giscus's own
 * theme sets it.
 */
const bindings: Record<string, keyof typeof semanticTokens> = {
  "accent-emphasis": "action-primary",
  "accent-fg": "link",
  "accent-muted": "selection-bg",
  "accent-subtle": "selection-bg",
  "action-list-item-default-hover-bg": "hover-bg",
  "attention-fg": "warning-text",
  "attention-muted": "warning-border",
  "attention-subtle": "warning-bg",
  "border-default": "border-default",
  "border-muted": "border-subtle",
  "btn-active-bg": "hover-bg",
  "btn-active-border": "border-input",
  "btn-bg": "bg-surface",
  "btn-border": "border-default",
  "btn-hover-bg": "hover-bg",
  "btn-hover-border": "border-input",
  "btn-primary-bg": "action-primary",
  "btn-primary-border": "action-primary",
  "btn-primary-disabled-bg": "hover-bg",
  "btn-primary-disabled-border": "border-subtle",
  "btn-primary-disabled-text": "text-disabled",
  "btn-primary-hover-bg": "action-primary-hover",
  "btn-primary-hover-border": "action-primary-hover",
  "btn-primary-selected-bg": "action-primary-pressed",
  "btn-primary-text": "text-on-primary",
  "btn-selected-bg": "bg-sunken",
  "btn-text": "text-primary",
  "canvas-default": "bg-page",
  "canvas-inset": "bg-page",
  "canvas-overlay": "bg-raised",
  "canvas-subtle": "hover-bg",
  "danger-fg": "text-error",
  "danger-muted": "error-border",
  "danger-subtle": "error-bg",
  "fg-default": "text-primary",
  "fg-muted": "text-muted",
  "fg-subtle": "text-placeholder",
  "neutral-muted": "hover-bg",
  "segmented-control-bg": "bg-sunken",
  "segmented-control-button-bg": "bg-page",
  "segmented-control-button-selected-border": "border-input",
  "social-reaction-bg-hover": "hover-bg",
  "social-reaction-bg-reacted-hover": "selection-bg",
  "success-fg": "success-text"
};

/**
 * Giscus's frame is on another origin and can't read the site's CSS variables,
 * so its theme carries the colors themselves.
 */
export function giscusThemeCss(theme: Theme): string {
  const properties = Object.entries(bindings).map(
    ([name, token]) =>
      `  --color-${name}:${resolve(semanticTokens[token][theme])};`
  );
  return `@import url("${giscusOrigin}/themes/${theme}.css");\nmain {\n${properties.join("\n")}\n}\n`;
}
