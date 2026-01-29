import { PostHog } from "posthog-node";

export interface PostHogClientConfig {
  apiKey: string;
  host?: string;
  flushAt?: number;
  flushInterval?: number;
}

export interface EventProperties {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | string[]
    | number[];
}

export class PostHogClient {
  private client: PostHog;

  constructor(config: PostHogClientConfig) {
    this.client = new PostHog(config.apiKey, {
      host: config.host ?? "https://us.i.posthog.com",
      flushAt: config.flushAt ?? 20,
      flushInterval: config.flushInterval ?? 10000,
    });
  }

  capture(
    distinctId: string,
    event: string,
    properties?: EventProperties,
  ): void {
    this.client.capture({
      distinctId,
      event,
      properties,
    });
  }

  identify(distinctId: string, properties?: EventProperties): void {
    this.client.identify({
      distinctId,
      properties,
    });
  }

  alias(distinctId: string, alias: string): void {
    this.client.alias({
      distinctId,
      alias,
    });
  }

  groupIdentify(
    groupType: string,
    groupKey: string,
    properties?: EventProperties,
  ): void {
    this.client.groupIdentify({
      groupType,
      groupKey,
      properties,
    });
  }

  async flush(): Promise<void> {
    await this.client.flush();
  }

  async shutdown(): Promise<void> {
    await this.client.shutdown();
  }
}

export function createPostHogClient(
  config: PostHogClientConfig,
): PostHogClient {
  return new PostHogClient(config);
}
