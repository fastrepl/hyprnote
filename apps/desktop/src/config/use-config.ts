import { useEffect } from "react";

import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/main";
import { CONFIG_REGISTRY, type ConfigKey } from "./registry";

type ConfigValueType<K extends ConfigKey> = (typeof CONFIG_REGISTRY)[K]["default"];

function tryParseJSON<T>(value: any, fallback: T): T {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function useConfigValue<K extends ConfigKey>(key: K): ConfigValueType<K> {
  const storedValue = main.UI.useValue(key, main.STORE_ID);
  const definition = CONFIG_REGISTRY[key];

  if (storedValue !== undefined) {
    if (key === "ignored_platforms" || key === "spoken_languages") {
      return tryParseJSON(storedValue, definition.default) as ConfigValueType<K>;
    }
    return storedValue as ConfigValueType<K>;
  }

  return definition.default as ConfigValueType<K>;
}

export function useConfigValues<K extends ConfigKey>(keys: readonly K[]): { [P in K]: ConfigValueType<P> } {
  const result = {} as { [P in K]: ConfigValueType<P> };

  for (const key of keys) {
    result[key] = useConfigValue(key);
  }

  return result;
}

export function useConfigSideEffects(keys?: ConfigKey[]) {
  const active = useListener((state) => state.live.status === "running_active");
  const configsToWatch = keys ?? (Object.keys(CONFIG_REGISTRY) as ConfigKey[]);

  const allValues = main.UI.useValues(main.STORE_ID);

  const getConfig = <K extends ConfigKey>(key: K): any => {
    const storedValue = allValues[key];
    const definition = CONFIG_REGISTRY[key];

    if (storedValue !== undefined) {
      if (key === "ignored_platforms" || key === "spoken_languages") {
        return tryParseJSON(storedValue, definition.default);
      }
      return storedValue;
    }

    return definition.default;
  };

  useEffect(() => {
    // TODO: hack to avoid restarting server while in meeting.
    if (active) {
      return;
    }

    for (const key of configsToWatch) {
      const definition = CONFIG_REGISTRY[key];
      if (definition && "sideEffect" in definition && definition.sideEffect) {
        const value = getConfig(key);
        (definition.sideEffect as any)(value, getConfig);
      }
    }
  }, [allValues, active]);
}
