describe("Hyprnote Desktop App", () => {
  it("should launch the application", async () => {
    const title = await browser.getTitle();
    console.log("Window title:", title);
    expect(title).toBeDefined();
  });

  it("should have a window", async () => {
    const windowHandle = await browser.getWindowHandle();
    expect(windowHandle).toBeDefined();
  });
});
