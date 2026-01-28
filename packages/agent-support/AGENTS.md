`Langgraph` has `Graph` api and `Functional` API:

## Graph

- https://docs.langchain.com/oss/javascript/langgraph/graph-api.md
- https://docs.langchain.com/oss/javascript/langgraph/use-graph-api.md

## Functional

- https://docs.langchain.com/oss/javascript/langgraph/functional-api.md
- https://docs.langchain.com/oss/javascript/langgraph/use-functional-api.md

In `packages/agent-support`, use `Graph` API. Do not use `Functional` API.

## Architecture

The agent is built using LangGraph's Graph API with the following structure:

- `state.ts` - Defines `AgentState` annotation with messages, request, images, and output
- `nodes/agent.ts` - Agent node that invokes the LLM with tools
- `nodes/tools.ts` - Tools node that executes tool calls (with interrupt for approval)
- `graph/routing.ts` - Conditional routing based on tool calls
- `graph/index.ts` - Assembles the graph with StateGraph and compiles with checkpointer
- `agent.ts` - Exports the compiled graph as `agent` for LangGraph Studio

## Others

- https://docs.langchain.com/oss/javascript/langgraph/interrupts.md
- https://docs.langchain.com/oss/javascript/langgraph/streaming.md
