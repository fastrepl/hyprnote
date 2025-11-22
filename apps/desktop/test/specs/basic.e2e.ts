import { expect } from "@wdio/globals";

describe("Hyprnote Desktop App", () => {
  it("should launch the application", async () => {
    const title = await browser.getTitle();
    expect(title).toBeTruthy();
  });

  it("should have a window", async () => {
    const windowHandles = await browser.getWindowHandles();
    expect(windowHandles.length).toBeGreaterThan(0);
  });
});
