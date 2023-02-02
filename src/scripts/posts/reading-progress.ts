const percent = 100;
const complete = 1;
const nothingToScroll = 0;

function update(): void {
  const { scrollHeight, scrollTop } = document.documentElement;
  const scrollable = scrollHeight - window.innerHeight;
  const fraction =
    scrollable > nothingToScroll
      ? Math.min(scrollTop / scrollable, complete)
      : complete;

  for (const label of document.querySelectorAll("[data-reading-progress]")) {
    label.textContent = `${Math.round(fraction * percent)}%`;
  }
  for (const bar of document.querySelectorAll<HTMLElement>(
    "[data-reading-progress-bar]"
  )) {
    bar.style.transform = `scaleX(${fraction})`;
  }
}

let scheduled = false;

function schedule(): void {
  if (scheduled) {
    return;
  }
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    update();
  });
}

if (document.querySelector("[data-reading-progress]")) {
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  update();
}
