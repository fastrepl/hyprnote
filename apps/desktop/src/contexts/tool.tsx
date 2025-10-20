import { createContext, useCallback, useContext, useMemo, useRef } from "react";

export interface ToolRegistry {
  getForTransport(): Record<string, any>;
  invoke(key: string, input: any): Promise<any>;
  getTool(key: string): any;
  getAllTools(): Array<{ key: string; tool: any }>;
  register(key: string, tool: any): void;
}

interface ToolRegistryContextValue {
  registry: ToolRegistry;
}

const ToolRegistryContext = createContext<ToolRegistryContextValue | null>(null);

export function ToolRegistryProvider({ children }: { children: React.ReactNode }) {
  const toolsRef = useRef<Map<string, any>>(new Map());

  const register = useCallback((key: string, tool: any) => {
    toolsRef.current.set(key, tool);
  }, []);

  const getForTransport = useCallback((): Record<string, any> => {
    const tools: Record<string, any> = {};
    toolsRef.current.forEach((tool, key) => {
      tools[key] = tool;
    });
    return tools;
  }, []);

  const invoke = useCallback(async (key: string, input: any): Promise<any> => {
    const tool = toolsRef.current.get(key);
    if (!tool) {
      throw new Error(`Tool "${key}" not found in registry`);
    }

    if (!tool.execute) {
      throw new Error(`Tool "${key}" does not have an execute function`);
    }

    return await tool.execute(input);
  }, []);

  const getTool = useCallback((key: string): any => {
    return toolsRef.current.get(key);
  }, []);

  const getAllTools = useCallback((): Array<{ key: string; tool: any }> => {
    return Array.from(toolsRef.current.entries()).map(([key, tool]) => ({ key, tool }));
  }, []);

  const registry: ToolRegistry = useMemo(
    () => ({
      getForTransport,
      invoke,
      getTool,
      getAllTools,
      register,
    }),
    [getForTransport, invoke, getTool, getAllTools, register],
  );

  const value = useMemo(() => ({ registry }), [registry]);

  return <ToolRegistryContext.Provider value={value}>{children}</ToolRegistryContext.Provider>;
}

export function useToolRegistry(): ToolRegistry {
  const context = useContext(ToolRegistryContext);
  if (!context) {
    throw new Error("useToolRegistry must be used within ToolRegistryProvider");
  }
  return context.registry;
}
