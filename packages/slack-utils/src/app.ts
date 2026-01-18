import { App, LogLevel } from "@slack/bolt";

export interface CreateSlackAppOptions {
  token: string;
  appToken: string;
  logLevel?: LogLevel;
}

export function createSlackApp(options: CreateSlackAppOptions): App {
  return new App({
    token: options.token,
    socketMode: true,
    appToken: options.appToken,
    logLevel:
      options.logLevel ??
      (process.env.NODE_ENV === "development" ? LogLevel.DEBUG : LogLevel.INFO),
  });
}
