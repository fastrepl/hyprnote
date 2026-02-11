export type ToolScope =
  | "chat-general"
  | "chat-support"
  | "enhancing"
  | (string & {});

interface ToolEntry<TTool> {
  id: symbol;
  scopes: ToolScope[];
  key: string;
  tool: TTool;
}

export interface ToolRegistry<TTool = any> {
  register(scopes: ToolScope | ToolScope[], key: string, tool: TTool): symbol;
  unregister(id: symbol): void;
  getTools(scope?: ToolScope): Record<string, TTool>;
  invoke(scope: ToolScope, key: string, input: unknown): Promise<unknown>;
  clear(): void;
}

export function createToolRegistry<TTool = any>(): ToolRegistry<TTool> {
  const entries = new Map<symbol, ToolEntry<TTool>>();
  const scopeIndex = new Map<ToolScope, Map<string, symbol>>();

  const indexTool = (entry: ToolEntry<TTool>) => {
    for (const scope of entry.scopes) {
      const scopedIndex = scopeIndex.get(scope) ?? new Map<string, symbol>();
      scopedIndex.set(entry.key, entry.id);
      scopeIndex.set(scope, scopedIndex);
    }
  };

  const removeFromIndex = (entry: ToolEntry<TTool>) => {
    for (const scope of entry.scopes) {
      const scopedIndex = scopeIndex.get(scope);
      if (!scopedIndex) {
        continue;
      }

      scopedIndex.delete(entry.key);
      if (scopedIndex.size === 0) {
        scopeIndex.delete(scope);
      }
    }
  };

  return {
    register(scopes, key, tool) {
      const scopeArray = Array.isArray(scopes) ? scopes : [scopes];
      const id = Symbol(`${scopeArray.join(",")}:${key}`);
      const entry: ToolEntry<TTool> = {
        id,
        scopes: scopeArray,
        key,
        tool,
      };
      entries.set(id, entry);
      indexTool(entry);
      return id;
    },

    unregister(id) {
      const entry = entries.get(id);
      if (!entry) {
        return;
      }

      entries.delete(id);
      removeFromIndex(entry);
    },

    getTools(scope) {
      return Array.from(entries.values())
        .filter((entry) => (scope ? entry.scopes.includes(scope) : true))
        .reduce<Record<string, TTool>>((acc, entry) => {
          acc[entry.key] = entry.tool;
          return acc;
        }, {});
    },

    async invoke(scope, key, input) {
      const scopedIndex = scopeIndex.get(scope);
      const id = scopedIndex?.get(key);
      if (!id) {
        throw new Error(`Tool "${key}" not found in scope "${scope}"`);
      }

      const entry = entries.get(id);
      if (!entry) {
        throw new Error(`Tool "${key}" not found in scope "${scope}"`);
      }

      const execute = (entry.tool as any)?.execute;
      if (typeof execute !== "function") {
        throw new Error(
          `Tool "${key}" in scope "${scope}" does not implement execute()`,
        );
      }

      return await execute(input);
    },

    clear() {
      entries.clear();
      scopeIndex.clear();
    },
  };
}
