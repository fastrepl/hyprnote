import { useEffect, useState } from "react";

export const useQuery = <T, TDeps extends readonly unknown[] = readonly []>(
  params:
    & {
      enabled?: boolean;
      deps?: TDeps;
      refetchInterval?: number;
    }
    & (
      TDeps extends readonly [] ? { queryFn: () => Promise<T> }
        : { queryFn: (...args: TDeps) => Promise<T> }
    ),
) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (params.enabled === false) {
      return;
    }

    const execute = async () => {
      try {
        const result = await (params.queryFn as any)(...(params.deps ?? []));
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setData(null);
      }
    };

    execute();

    if (params.refetchInterval) {
      const intervalId = setInterval(execute, params.refetchInterval);
      return () => clearInterval(intervalId);
    }
  }, [params.enabled, params.refetchInterval, ...(params.deps ?? [])]);

  return {
    data,
    error,
  };
};
