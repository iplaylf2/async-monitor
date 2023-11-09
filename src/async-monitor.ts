import { type MapKey } from "./type/map";
import {
  type CriticalSection,
  CriticalSectionRoot,
} from "./async-monitor/critical-section";

/**
 * Acquires an exclusive lock on the specified key.
 */
export async function enter<T>(
  key: MapKey,
  scope: (criticalSection: CriticalSection) => Promise<T> | T,
): Promise<T> {
  return await CriticalSectionRoot.enter(key, scope);
}

/**
 * Attempts, for the specified amount of time, to acquire an exclusive lock on the specified key.
 */
export async function tryEnter<T>(
  key: MapKey,
  timeout: number,
  scope: (criticalSection: CriticalSection | null) => Promise<T> | T,
): Promise<T> {
  return await CriticalSectionRoot.tryEnter(key, timeout, scope);
}

export function tryGet(key: MapKey): CriticalSection | null {
  return CriticalSectionRoot.tryGet(key);
}
