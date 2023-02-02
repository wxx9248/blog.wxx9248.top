// Average adult reading speeds; CJK is read per character, not per word
const latinWordsPerMinute = 230;
const cjkCharsPerMinute = 400;
const minimumMinutes = 1;

const defaultExcerptLength = 160;
const ellipsis = "…";
const textStart = 0;

const fencePattern = /^\s*(?:```|~~~)/u;
// A $$ line opens display math only if it doesn't also close it, as $$x$$ does
const mathFenceOpenPattern = /^\s*\$\$(?!.*\$\$\s*$)/u;
const mathFenceClosePattern = /\$\$\s*$/u;
const blankLinePattern = /^\s*$/u;
const blockquotePattern = /^\s*>\s?/u;
// Blocks that render no prose: MDX statements, headings, JSX/HTML, display math
const nonProseStartPattern = /^\s*(?:import\s|export\s|#|<|\$\$)/u;

const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;
const wordPattern = /[\p{L}\p{N}]+/gu;

const inlineMarkup: readonly [RegExp, string][] = [
  [/!?\[(?<text>[^\]]*)\]\([^)]*\)/gu, "$<text>"],
  [/<[^>]+>/gu, ""],
  [/`(?<code>[^`]*)`/gu, "$<code>"],
  [/(?<mark>\*\*|__|\*|_)(?<text>.+?)\k<mark>/gu, "$<text>"],
  [/\$(?<tex>[^$]+)\$/gu, "$<tex>"]
];

/**
 * Splits a Markdown/MDX body into prose paragraphs, skipping code, display
 * math, MDX statements, headings and JSX/HTML blocks.
 */
export function proseBlocks(body: string): string[] {
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let closingFence: RegExp | null = null;

  const flush = (): void => {
    const [first = ""] = paragraph;
    // Paragraph lines are never blank, so an empty first line means no paragraph
    if (first && !nonProseStartPattern.test(first)) {
      blocks.push(paragraph.join("\n"));
    }
    paragraph = [];
  };

  for (const line of body.split("\n")) {
    if (closingFence) {
      if (closingFence.test(line)) {
        closingFence = null;
      }
    } else if (fencePattern.test(line) || mathFenceOpenPattern.test(line)) {
      flush();
      closingFence = fencePattern.test(line)
        ? fencePattern
        : mathFenceClosePattern;
    } else if (blankLinePattern.test(line)) {
      flush();
    } else {
      paragraph.push(line.replace(blockquotePattern, ""));
    }
  }
  flush();

  return blocks;
}

export function excerpt(
  body: string,
  maxLength: number = defaultExcerptLength
): string {
  const [first = ""] = proseBlocks(body);
  const text = inlineMarkup
    .reduce(
      (result, [pattern, replacement]) => result.replace(pattern, replacement),
      first
    )
    .replace(/\s+/gu, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(textStart, maxLength - ellipsis.length).trimEnd()}${ellipsis}`;
}

export function readingMinutes(body: string): number {
  const prose = proseBlocks(body).join("\n");
  const cjkChars = (prose.match(cjkPattern) ?? []).length;
  const latinWords = (prose.replace(cjkPattern, " ").match(wordPattern) ?? [])
    .length;

  return Math.max(
    minimumMinutes,
    Math.ceil(latinWords / latinWordsPerMinute + cjkChars / cjkCharsPerMinute)
  );
}

export function byteSize(text: string): number {
  return new TextEncoder().encode(text).length;
}
