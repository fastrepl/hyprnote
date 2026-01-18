# Slack Internal App - Implementation Guide

This document provides a comprehensive guide for building the `apps/slack-internal` Slack application for Hyprnote. The app uses Bolt for JavaScript to build a Slack bot with code execution capabilities powered by Modal's sandboxed environments.

## Overview

The Slack Internal app is an internal tool that allows team members to execute code snippets directly from Slack. It leverages Modal's JavaScript SDK to run code in secure, isolated sandbox environments with Bun as the base runtime.

### Key Features

- Execute TypeScript/JavaScript code snippets from Slack messages or slash commands
- Secure sandboxed execution using Modal's infrastructure
- Support for Bun runtime in the sandbox
- Real-time output streaming back to Slack
- Error handling and timeout management

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Slack Framework | Bolt for JavaScript | Handle Slack events, commands, and interactions |
| Code Execution | Modal JS SDK | Sandboxed code execution in the cloud |
| Runtime | Bun | Fast JavaScript/TypeScript runtime in sandbox |
| Language | TypeScript | Type-safe development |

## Project Structure

```
apps/slack-internal/
├── src/
│   ├── index.ts              # Main entry point
│   ├── env.ts                # Environment configuration
│   ├── app.ts                # Bolt app initialization
│   ├── modal/
│   │   ├── client.ts         # Modal client setup
│   │   ├── sandbox.ts        # Sandbox creation and management
│   │   └── execute.ts        # Code execution logic
│   └── listeners/
│       ├── index.ts          # Register all listeners
│       ├── commands/
│       │   ├── index.ts
│       │   └── execute.ts    # /execute slash command
│       ├── messages/
│       │   ├── index.ts
│       │   └── code-block.ts # Handle code block messages
│       └── actions/
│           ├── index.ts
│           └── run-code.ts   # Button action to run code
├── package.json
├── tsconfig.json
├── manifest.json             # Slack app manifest
├── .env.sample
└── instruction.md            # This file
```

## Dependencies

```json
{
  "name": "@hypr/slack-internal",
  "type": "module",
  "scripts": {
    "dev": "bun --hot src/index.ts",
    "start": "bun src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@slack/bolt": "^4.6.0",
    "@t3-oss/env-core": "^0.13.10",
    "modal": "^0.6.0",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/bun": "^1.3.6",
    "typescript": "^5.9.3"
  }
}
```

## Environment Configuration

### Required Environment Variables

```bash
# Slack credentials
SLACK_BOT_TOKEN=xoxb-...        # Bot User OAuth Token
SLACK_APP_TOKEN=xapp-...        # App-Level Token with connections:write scope

# Modal credentials
MODAL_TOKEN_ID=ak-...           # Modal API token ID
MODAL_TOKEN_SECRET=as-...       # Modal API token secret
```

### Environment Schema (src/env.ts)

```typescript
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    SLACK_BOT_TOKEN: z.string().startsWith("xoxb-"),
    SLACK_APP_TOKEN: z.string().startsWith("xapp-"),
    MODAL_TOKEN_ID: z.string().startsWith("ak-"),
    MODAL_TOKEN_SECRET: z.string().startsWith("as-"),
  },
  runtimeEnv: process.env,
});
```

## Implementation Details

### 1. Main Entry Point (src/index.ts)

```typescript
import { app } from "./app";
import { registerListeners } from "./listeners";

registerListeners(app);

(async () => {
  try {
    await app.start();
    console.log("Slack Internal app is running!");
  } catch (error) {
    console.error("Failed to start app:", error);
    process.exit(1);
  }
})();
```

### 2. Bolt App Initialization (src/app.ts)

```typescript
import { App, LogLevel } from "@slack/bolt";
import { env } from "./env";

export const app = new App({
  token: env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: env.SLACK_APP_TOKEN,
  logLevel: process.env.NODE_ENV === "development" ? LogLevel.DEBUG : LogLevel.INFO,
});
```

### 3. Modal Client Setup (src/modal/client.ts)

```typescript
import { ModalClient } from "modal";

let modalClient: ModalClient | null = null;

export function getModalClient(): ModalClient {
  if (!modalClient) {
    modalClient = new ModalClient();
  }
  return modalClient;
}
```

### 4. Sandbox Management (src/modal/sandbox.ts)

The sandbox module handles creating and managing Modal sandboxes with Bun as the base image.

```typescript
import { ModalClient } from "modal";
import { getModalClient } from "./client";

const APP_NAME = "hypr-slack-internal";
const SANDBOX_TIMEOUT_SECONDS = 60;

export async function createBunSandbox() {
  const modal = getModalClient();
  
  const app = await modal.apps.fromName(APP_NAME, {
    createIfMissing: true,
  });
  
  // Use Bun as the base image with common utilities
  const image = modal.images
    .fromRegistry("oven/bun:1.1-alpine")
    .dockerfileCommands([
      "RUN apk add --no-cache curl git",
      "WORKDIR /app",
    ]);
  
  const sandbox = await modal.sandboxes.create(app, image, {
    timeout: SANDBOX_TIMEOUT_SECONDS,
  });
  
  return sandbox;
}

export async function terminateSandbox(sandbox: Awaited<ReturnType<typeof createBunSandbox>>) {
  try {
    await sandbox.terminate();
  } catch (error) {
    console.error("Failed to terminate sandbox:", error);
  }
}
```

### 5. Code Execution Logic (src/modal/execute.ts)

This is the core module that executes code in the Modal sandbox.

```typescript
import { createBunSandbox, terminateSandbox } from "./sandbox";

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}

export async function executeCode(code: string): Promise<ExecutionResult> {
  const startTime = Date.now();
  let sandbox: Awaited<ReturnType<typeof createBunSandbox>> | null = null;
  
  try {
    sandbox = await createBunSandbox();
    
    // Execute the code using Bun
    const process = await sandbox.exec(
      ["bun", "eval", code],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );
    
    // Read output streams
    const [stdout, stderr] = await Promise.all([
      process.stdout.readText(),
      process.stderr.readText(),
    ]);
    
    const exitCode = await process.wait();
    const executionTimeMs = Date.now() - startTime;
    
    return {
      success: exitCode === 0,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode,
      executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    return {
      success: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      executionTimeMs,
    };
  } finally {
    if (sandbox) {
      await terminateSandbox(sandbox);
    }
  }
}
```

### 6. Slash Command Handler (src/listeners/commands/execute.ts)

```typescript
import type { App } from "@slack/bolt";
import { executeCode } from "../../modal/execute";

export function registerExecuteCommand(app: App) {
  app.command("/execute", async ({ command, ack, respond, logger }) => {
    await ack();
    
    const code = command.text.trim();
    
    if (!code) {
      await respond({
        response_type: "ephemeral",
        text: "Please provide code to execute. Usage: `/execute console.log('Hello!')`",
      });
      return;
    }
    
    // Send initial message
    await respond({
      response_type: "in_channel",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:hourglass_flowing_sand: Executing code...`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "```" + code + "```",
          },
        },
      ],
    });
    
    try {
      const result = await executeCode(code);
      
      const statusEmoji = result.success ? ":white_check_mark:" : ":x:";
      const blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${statusEmoji} *Execution ${result.success ? "completed" : "failed"}* (${result.executionTimeMs}ms)`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Code:*\n```" + code + "```",
          },
        },
      ];
      
      if (result.stdout) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Output:*\n```" + result.stdout.slice(0, 2900) + "```",
          },
        });
      }
      
      if (result.stderr) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Errors:*\n```" + result.stderr.slice(0, 2900) + "```",
          },
        });
      }
      
      await respond({
        response_type: "in_channel",
        replace_original: true,
        blocks,
      });
    } catch (error) {
      logger.error("Execution error:", error);
      await respond({
        response_type: "ephemeral",
        text: `Failed to execute code: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });
}
```

### 7. Message Handler for Code Blocks (src/listeners/messages/code-block.ts)

This handler detects code blocks in messages and offers to execute them.

```typescript
import type { App } from "@slack/bolt";

// Regex to match code blocks with optional language specifier
const CODE_BLOCK_REGEX = /```(?:typescript|ts|javascript|js)?\n?([\s\S]*?)```/;

export function registerCodeBlockMessage(app: App) {
  app.message(CODE_BLOCK_REGEX, async ({ message, say, logger }) => {
    try {
      // Only respond to messages from users (not bots)
      if ("bot_id" in message) return;
      if (!("text" in message) || !message.text) return;
      
      const match = message.text.match(CODE_BLOCK_REGEX);
      if (!match || !match[1]) return;
      
      const code = match[1].trim();
      if (!code) return;
      
      await say({
        thread_ts: message.ts,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "I detected a code block. Would you like me to execute it?",
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Run Code",
                },
                style: "primary",
                action_id: "run_code",
                value: Buffer.from(code).toString("base64"),
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Cancel",
                },
                action_id: "cancel_run",
              },
            ],
          },
        ],
      });
    } catch (error) {
      logger.error("Error handling code block message:", error);
    }
  });
}
```

### 8. Button Action Handler (src/listeners/actions/run-code.ts)

```typescript
import type { App } from "@slack/bolt";
import { executeCode } from "../../modal/execute";

export function registerRunCodeAction(app: App) {
  app.action("run_code", async ({ action, ack, respond, logger }) => {
    await ack();
    
    if (action.type !== "button" || !action.value) {
      return;
    }
    
    const code = Buffer.from(action.value, "base64").toString("utf-8");
    
    await respond({
      replace_original: true,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:hourglass_flowing_sand: Executing code...`,
          },
        },
      ],
    });
    
    try {
      const result = await executeCode(code);
      
      const statusEmoji = result.success ? ":white_check_mark:" : ":x:";
      const blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${statusEmoji} *Execution ${result.success ? "completed" : "failed"}* (${result.executionTimeMs}ms)`,
          },
        },
      ];
      
      if (result.stdout) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Output:*\n```" + result.stdout.slice(0, 2900) + "```",
          },
        });
      }
      
      if (result.stderr) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Errors:*\n```" + result.stderr.slice(0, 2900) + "```",
          },
        });
      }
      
      await respond({
        replace_original: true,
        blocks,
      });
    } catch (error) {
      logger.error("Execution error:", error);
      await respond({
        replace_original: true,
        text: `Failed to execute code: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });
  
  app.action("cancel_run", async ({ ack, respond }) => {
    await ack();
    await respond({
      delete_original: true,
    });
  });
}
```

### 9. Listener Registration (src/listeners/index.ts)

```typescript
import type { App } from "@slack/bolt";
import { registerExecuteCommand } from "./commands/execute";
import { registerCodeBlockMessage } from "./messages/code-block";
import { registerRunCodeAction } from "./actions/run-code";

export function registerListeners(app: App) {
  // Commands
  registerExecuteCommand(app);
  
  // Messages
  registerCodeBlockMessage(app);
  
  // Actions
  registerRunCodeAction(app);
}
```

## Slack App Manifest

Create a `manifest.json` file for easy app configuration:

```json
{
  "_metadata": {
    "major_version": 1,
    "minor_version": 1
  },
  "display_information": {
    "name": "Hyprnote Code Runner",
    "description": "Execute code snippets in a secure sandbox",
    "background_color": "#1a1a2e"
  },
  "features": {
    "bot_user": {
      "display_name": "Code Runner",
      "always_online": true
    },
    "slash_commands": [
      {
        "command": "/execute",
        "description": "Execute TypeScript/JavaScript code",
        "usage_hint": "console.log('Hello, World!')",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "channels:history",
        "chat:write",
        "commands",
        "groups:history",
        "im:history",
        "mpim:history"
      ]
    }
  },
  "settings": {
    "event_subscriptions": {
      "bot_events": [
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim"
      ]
    },
    "interactivity": {
      "is_enabled": true
    },
    "org_deploy_enabled": false,
    "socket_mode_enabled": true,
    "token_rotation_enabled": false
  }
}
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "noEmit": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Implementation Plan

### Phase 1: Project Setup
1. Create directory structure under `apps/slack-internal/`
2. Initialize `package.json` with dependencies
3. Set up TypeScript configuration
4. Create environment configuration with `@t3-oss/env-core`

### Phase 2: Slack Integration
1. Initialize Bolt app with Socket Mode
2. Create listener registration system
3. Implement `/execute` slash command
4. Test basic Slack connectivity

### Phase 3: Modal Integration
1. Set up Modal client
2. Create sandbox with Bun image
3. Implement code execution logic
4. Handle stdout/stderr streaming
5. Implement proper cleanup and error handling

### Phase 4: Advanced Features
1. Add code block detection in messages
2. Implement interactive buttons for code execution
3. Add execution timeout handling
4. Implement output truncation for Slack limits

### Phase 5: Polish and Documentation
1. Add proper logging
2. Create `.env.sample` file
3. Update this instruction document
4. Add error messages and user feedback

## Security Considerations

1. **Sandboxed Execution**: All code runs in isolated Modal sandboxes, preventing access to the host system.

2. **Timeout Limits**: Sandboxes have a 60-second timeout to prevent runaway processes.

3. **No Network Access by Default**: Consider restricting network access in sandboxes for additional security.

4. **Output Truncation**: Outputs are truncated to prevent Slack message size limits from being exceeded.

5. **Internal Use Only**: This app is designed for internal team use and should not be exposed publicly.

## Modal Sandbox Configuration Options

The Modal JS SDK provides several configuration options for sandboxes:

```typescript
// Example: Sandbox with GPU support
const gpuSandbox = await modal.sandboxes.create(app, image, {
  gpu: "T4",
  timeout: 300,
});

// Example: Sandbox with secrets
const secretSandbox = await modal.sandboxes.create(app, image, {
  secrets: [
    await modal.secrets.fromName("my-secret", {
      requiredKeys: ["API_KEY"],
    }),
  ],
});

// Example: Sandbox with volume mount
const volumeSandbox = await modal.sandboxes.create(app, image, {
  volumes: {
    "/data": await modal.volumes.fromName("my-volume"),
  },
});
```

## Testing

### Manual Testing Steps

1. Start the app locally:
   ```bash
   pnpm -F slack-internal dev
   ```

2. Test the slash command:
   - In Slack, type `/execute console.log("Hello, World!")`
   - Verify the output appears in the channel

3. Test code block detection:
   - Post a message with a code block:
     ````
     ```typescript
     const sum = (a: number, b: number) => a + b;
     console.log(sum(2, 3));
     ```
     ````
   - Click the "Run Code" button
   - Verify the output appears

4. Test error handling:
   - Execute code with a syntax error
   - Verify the error message is displayed

## References

### Modal Documentation
- [Modal JS SDK](https://github.com/modal-labs/libmodal/tree/main/modal-js)
- [Modal Sandboxes Guide](https://modal.com/docs/guide/sandboxes)
- [Modal JS Examples](https://github.com/modal-labs/libmodal/tree/main/modal-js/examples)

### Slack Documentation
- [Bolt for JavaScript](https://docs.slack.dev/tools/bolt-js/getting-started)
- [Slack App Manifest](https://api.slack.com/reference/manifests)
- [Bolt JS Starter Template](https://github.com/slack-samples/bolt-js-starter-template)

### Related Examples
- [Vercel AI SDK Code Execution](https://github.com/vercel-labs/ai-sdk-tool-code-execution)
- [Modal Sandbox Agent Example](https://github.com/modal-labs/libmodal/blob/main/modal-js/examples/sandbox-agent.ts)
