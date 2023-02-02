import { searchFocusHash } from "@/lib/navigation/routes";

// Written by `pagefind` after the build, so it only exists in built output
const pagefindUrl = "/pagefind/pagefind.js";
const debounceMilliseconds = 200;

interface PagefindResultData {
  excerpt: string;
  meta: { title?: string };
  url: string;
}

interface PagefindResult {
  data: () => Promise<PagefindResultData>;
}

interface Pagefind {
  debouncedSearch: (
    term: string,
    options: { filters: Record<string, string> },
    milliseconds: number
  ) => Promise<{ results: PagefindResult[] } | null>;
}

function renderResult({
  excerpt,
  meta,
  url
}: PagefindResultData): HTMLLIElement {
  const item = document.createElement("li");
  const link = document.createElement("a");
  link.href = url;
  const path = document.createElement("span");
  path.className = "path";
  path.textContent = `${url}:`;
  const title = document.createElement("span");
  title.className = "title";
  title.textContent = meta.title ?? url;
  link.append(path, " ", title);
  const snippet = document.createElement("p");
  snippet.className = "excerpt";
  // Pagefind escapes the excerpt itself and only adds <mark> around matches
  snippet.innerHTML = excerpt;
  item.append(link, snippet);
  return item;
}

async function loadPagefind(): Promise<Pagefind | null> {
  try {
    return (await import(/* @vite-ignore */ pagefindUrl)) as Pagefind;
  } catch {
    return null;
  }
}

async function setUp(form: HTMLFormElement): Promise<void> {
  const input = form.querySelector("input");
  const results = form.querySelector<HTMLElement>("[data-search-results]");
  const status = form.querySelector<HTMLElement>("[data-search-status]");
  const { lang = "", noResults = "", unavailable = "" } = form.dataset;
  if (!input || !results || !status) {
    return;
  }

  const focusIfRequested = (): void => {
    if (location.hash === searchFocusHash) {
      input.focus();
    }
  };
  focusIfRequested();
  addEventListener("hashchange", focusIfRequested);
  form.addEventListener("submit", (event) => event.preventDefault());

  const engine = await loadPagefind();
  if (!engine) {
    status.textContent = unavailable;
    return;
  }

  input.addEventListener("input", async () => {
    const term = input.value.trim();
    const search = await engine.debouncedSearch(
      term,
      { filters: { lang } },
      debounceMilliseconds
    );
    // Null means a newer keystroke superseded this search
    if (!search) {
      return;
    }
    const found = await Promise.all(
      search.results.map((result) => result.data())
    );
    results.replaceChildren(...found.map(renderResult));
    status.textContent = term && !found.length ? noResults : "";
  });
}

for (const form of document.querySelectorAll<HTMLFormElement>(
  "form[data-search]"
)) {
  setUp(form).catch(reportError);
}
