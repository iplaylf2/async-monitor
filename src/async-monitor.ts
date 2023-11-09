import { type MapKey } from "./type/map";
import {
  type CriticalSection,
  CriticalSectionRoot,
} from "./async-monitor/critical-section";

/**
 * Acquires an exclusive lock on the specified key.
 */
export async function enter(key: MapKey): Promise<CriticalSection> {
  return await CriticalSectionRoot.enter(key);
}

/**
 * Attempts, for the specified amount of time, to acquire an exclusive lock on the specified key.
 */
export async function tryEnter(
  key: MapKey,
  timeout: number,
): Promise<CriticalSection | null> {
  return await CriticalSectionRoot.tryEnter(key, timeout);
}

export function tryGet(key: MapKey): CriticalSection | null {
  return CriticalSectionRoot.tryGet(key);
}
