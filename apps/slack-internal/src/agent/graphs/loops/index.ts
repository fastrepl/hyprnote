import { createSubgraph } from "../factory";

export const loopsGraph = createSubgraph({
  name: "loops",
  toolName: "executeLoopsCode",
  toolDescription:
    "Execute TypeScript/JavaScript code to interact with Loops.so",
  promptDir: import.meta.dirname,
});
