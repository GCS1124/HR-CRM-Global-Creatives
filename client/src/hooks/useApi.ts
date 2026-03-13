import { useCallback, useEffect, useState } from "react";

export function useApi<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
