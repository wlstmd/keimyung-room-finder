import { useEffect, useState } from "react";
import type { BuildingsData } from "../types";

export function useBuildings() {
  const [buildings, setBuildings] = useState<BuildingsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/buildings.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: BuildingsData) => {
        if (!cancelled) setBuildings(data);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { buildings, loading, error };
}
