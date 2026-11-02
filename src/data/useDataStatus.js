/** React binding for the data source: re-renders when the snapshot or live data lands. */
import { useSyncExternalStore } from "react";
import { getStatus, subscribe } from "./dataSource";

export function useDataStatus() {
  return useSyncExternalStore(subscribe, getStatus, getStatus);
}
