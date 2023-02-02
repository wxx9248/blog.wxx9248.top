const editableTags = new Set(["INPUT", "SELECT", "TEXTAREA"]);

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || editableTags.has(target.tagName))
  );
}

// "/" opens search, as in vim and less
document.addEventListener("keydown", (event) => {
  const { searchUrl } = document.body.dataset;
  if (
    event.key !== "/" ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.defaultPrevented ||
    isTyping(event.target) ||
    !searchUrl
  ) {
    return;
  }
  event.preventDefault();
  location.assign(searchUrl);
});
