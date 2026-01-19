import { Computer, OSType, ProviderType } from "@trycua/computer";

async function main() {
  const computer = new Computer({
    osType: OSType.LINUX,
    providerType: ProviderType.DOCKER,
    image: "trycua/cua-xfce:latest",
  });

  await computer.run();

  try {
    const screenshot = await computer.interface.screenshot();
    console.log("Screenshot taken:", screenshot ? "success" : "failed");

    await computer.interface.leftClick(100, 100);
    console.log("Left click at (100, 100)");

    await computer.interface.typeText("Hello from Hyprnote!");
    console.log("Typed text");
  } finally {
    await computer.disconnect();
    console.log("Disconnected from sandbox");
  }
}

main().catch(console.error);
