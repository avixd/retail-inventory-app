/**
 * Load snapshot files for the month-end currently selected in the header.
 * Analytics views (forecast, replenishment, ABC-XYZ, site KPIs) read the
 * published month files directly, so they follow the "As of" selector.
 *
 *   const { loading, files } = useMonthFiles(["forecast-accuracy.json", "abc-xyz.json"]);
 */
import { useEffect, useState } from "react";
import { snapshotFile } from "./dataSource";
import { useDataStatus } from "./useDataStatus";

export function useMonthFiles(names) {
  const { month } = useDataStatus();
  const key = names.join("|");
  const [state, setState] = useState({ key: null, files: {} });

  useEffect(() => {
    let cancelled = false;
    Promise.all(key.split("|").map(async (n) => [n, await snapshotFile(month, n)])).then((pairs) => {
      if (!cancelled) setState({ key: `${month}:${key}`, files: Object.fromEntries(pairs) });
    });
    return () => { cancelled = true; };
  }, [month, key]);

  const loading = state.key !== `${month}:${key}`;
  return { loading, month, files: loading ? {} : state.files };
}

/** Items of a paged API payload, or the payload itself if it's already a list. */
export const itemsOf = (x) => (Array.isArray(x) ? x : x?.items ?? []);
