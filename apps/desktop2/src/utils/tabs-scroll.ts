/**
 * Utility to manage tabs scroll container reference and scrolling
 */

let scrollContainerRef: HTMLDivElement | null = null;

export function setTabsScrollContainer(ref: HTMLDivElement | null) {
  scrollContainerRef = ref;
}

export function scrollTabsToEnd() {
  setTimeout(() => {
    if (scrollContainerRef) {
      scrollContainerRef.scrollTo({
        left: scrollContainerRef.scrollWidth,
        behavior: "smooth",
      });
    }
  }, 0);
}
