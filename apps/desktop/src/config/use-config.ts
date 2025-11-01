import { useEffect } from "react";
import * as main from "../store/tinybase/main";
import { CONFIG_REGISTRY, type ConfigKey } from "./registry";

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

export function useConfigValue<T>(key: ConfigKey): T {
  const storedValue = main.UI.useValue(key, main.STORE_ID);
  const definition = CONFIG_REGISTRY[key];

  if (storedValue !== undefined) {
    if (key === "ignored_platforms" || key === "spoken_languages") {
      return tryParseJSON(storedValue, definition.default);
    }
    return storedValue as T;
  }

  return definition.default;
}

export function useConfigValues<K extends ConfigKey>(
  keys: readonly K[],
): Record<K, any> {
  const result = {} as Record<K, any>;

  for (const key of keys) {
    result[key] = useConfigValue(key);
  }

  return result;
}

export function useConfigSideEffects(keys?: ConfigKey[]) {
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
    for (const key of configsToWatch) {
      const definition = CONFIG_REGISTRY[key];
      if (definition.sideEffect) {
        const value = getConfig(key);
        definition.sideEffect(value, getConfig);
      }
    }
  }, [allValues]);
}
