import { AsyncLocalStorage } from "async_hooks";
import { type MapKey } from "../type/map";
import { Monitor } from "./monitor";
import { SingleChannel } from "./single-channel";
import {
  DeprecateCriticalSectionError,
  InterruptedError,
  MismatchCriticalSectionError,
  SynchronizationLockError,
} from "./error";

export class InnerCriticalSection implements Disposable {
  private constructor(
    monitor: Monitor,
    private readonly parent: InnerCriticalSection,
    private readonly root: CriticalSectionRoot,
  ) {
    this.monitorChannel = new SingleChannel(true, monitor);
  }

  private async acquireMonitor(abortSignal: AbortSignal): Promise<Monitor> {
    if (null === (this.parent as unknown)) {
      return await this.monitorChannel.acquire(abortSignal);
    } else if (this.parent.isExited) {
      return await Promise.race([
        this.monitorChannel.acquire(abortSignal),
        this.root.top.acquireMonitor(abortSignal),
      ]);
    } else {
      return await Promise.race([
        this.monitorChannel.acquire(abortSignal),
        this.parent.acquireMonitor(abortSignal),
      ]);
    }
  }

  private assertDeprecateCriticalSection() {
    if (this.isExited) {
      throw new DeprecateCriticalSectionError();
    }
  }

  private assertMismatchCriticalSectionError() {
    if (this !== this.root.current) {
      throw new MismatchCriticalSectionError();
    }
  }

  public static create<M extends Monitor>(
    monitor: M,
    root: CriticalSectionRoot,
  ): InnerCriticalSection {
    const section = new InnerCriticalSection(monitor, null!, root);

    return section;
  }

  public pulse(): void {
    this.assertDeprecateCriticalSection();
    this.assertMismatchCriticalSectionError();

    const [ok, monitor] = this.monitorChannel.getValue();
    if (ok) {
      monitor.pulse();
    } else {
      throw new SynchronizationLockError();
    }
  }

  public pulseAll(): void {
    this.assertDeprecateCriticalSection();
    this.assertMismatchCriticalSectionError();

    const [ok, monitor] = this.monitorChannel.getValue();
    if (ok) {
      monitor.pulseAll();
    } else {
      throw new SynchronizationLockError();
    }
  }

  public async reenter(
    abortSignal: AbortSignal | null = null,
  ): Promise<InnerCriticalSection> {
    this.assertDeprecateCriticalSection();
    this.assertMismatchCriticalSectionError();

    const abortController = new AbortController();

    if (abortSignal) {
      abortSignal.throwIfAborted();
      abortSignal.addEventListener("abort", () => {
        abortController.abort(abortSignal.reason);
      });
    }

    return await this.root.tryEnter(async () => {
      const monitor = await this.acquireMonitor(abortController.signal).finally(
        () => {
          abortController.abort();
        },
      );

      return new InnerCriticalSection(monitor, this, this.root);
    });
  }

  private releaseMonitor(monitor: Monitor) {
    if (this.parent.isExited) {
      this.root.top.monitorChannel.setValue(monitor);
    } else {
      this.parent.monitorChannel.setValue(monitor);
    }
  }

  public [Symbol.dispose](): void {
    if (this.isExited) {
      return;
    }

    for (let cs = this.root.current; this !== cs; cs = cs.parent) {
      if ((undefined as unknown) === cs || (null as unknown) === cs) {
        throw new MismatchCriticalSectionError();
      }
    }

    const [ok, monitor] = this.monitorChannel.getValue();
    if (ok) {
      this.monitorChannel.close();

      this.releaseMonitor(monitor);
    } else {
      this.monitorChannel.close(new InterruptedError());
    }

    this.root.exit(() => {
      this.exitController.abort(new InterruptedError());

      return this.parent;
    });
  }

  public async wait(readyTimeout = Infinity): Promise<boolean> {
    this.assertDeprecateCriticalSection();
    this.assertMismatchCriticalSectionError();

    const [ok, monitor] = this.monitorChannel.getValue();
    if (ok) {
      this.releaseMonitor(monitor);

      const hasPulse = await monitor.wait(
        this.exitController.signal,
        readyTimeout,
      );

      const abortController = new AbortController();

      await this.acquireMonitor(abortController.signal).finally(() => {
        abortController.abort();
      });

      return hasPulse;
    } else {
      throw new SynchronizationLockError();
    }
  }

  public get hasMonitor() {
    const [ok] = this.monitorChannel.getValue();
    return ok;
  }

  public get isExited() {
    return this.exitController.signal.aborted;
  }

  private readonly exitController = new AbortController();

  private readonly monitorChannel: SingleChannel<Monitor>;
}

export class CriticalSectionRoot {
  public constructor(private readonly key: MapKey) {
    this.top = InnerCriticalSection.create(new Monitor(), this);
  }

  public static async enter(key: MapKey): Promise<CriticalSection> {
    return (await this.tryEnter(key, Infinity))!;
  }

  public exit(exit: () => InnerCriticalSection) {
    const parent = exit();

    this.localStorage.getStore()!.current = parent;

    this.referenceCount--;

    if (0 === this.referenceCount) {
      CriticalSectionRoot.map.delete(this.key);
    }
  }

  public static async tryEnter(
    key: MapKey,
    timeout: number,
  ): Promise<CriticalSection | null> {
    const criticalSectionRoot = this.map.get(key);
    if (criticalSectionRoot) {
      const parent = criticalSectionRoot.current;

      switch (timeout) {
        case 0: {
          if (parent.hasMonitor) {
            return await parent.reenter();
          } else {
            return null;
          }
        }
        case Infinity: {
          return await parent.reenter();
        }
        default: {
          try {
            return await parent.reenter(AbortSignal.timeout(timeout));
          } catch (e) {
            if (e instanceof DOMException && "TimeoutError" === e.name) {
              return null;
            } else {
              throw e;
            }
          }
        }
      }
    } else {
      const criticalSectionRoot = new CriticalSectionRoot(key);

      this.map.set(key, criticalSectionRoot);

      const criticalSection = await criticalSectionRoot.top.reenter();

      return criticalSection;
    }
  }

  public async tryEnter(
    enter: () => Promise<InnerCriticalSection>,
  ): Promise<InnerCriticalSection> {
    this.referenceCount++;

    const criticalSection = await enter().catch((e) => {
      this.referenceCount--;

      throw e;
    });

    this.localStorage.enterWith({ current: criticalSection });

    return criticalSection;
  }

  public static tryGet(key: MapKey): CriticalSection | null {
    const criticalSectionRoot = this.map.get(key);

    if (criticalSectionRoot) {
      const criticalSection = criticalSectionRoot.current;
      if (criticalSection.hasMonitor) {
        return criticalSection;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  public get current(): InnerCriticalSection {
    return this.localStorage.getStore()?.current ?? this.top;
  }

  private readonly localStorage = new AsyncLocalStorage<{
    current: InnerCriticalSection;
  }>();

  private static readonly map = new Map<MapKey, CriticalSectionRoot>();

  private referenceCount = 0;

  public readonly top: InnerCriticalSection;
}

export interface CriticalSection extends Disposable {
  /**
   * Notifies a task in the waiting queue of a change in the locked key's state.
   */
  pulse: () => void;
  /**
   * Notifies all waiting tasks of a change in the key's state.
   */
  pulseAll: () => void;
  /**
   * Releases the lock on an key and blocks the current task until it reacquires the lock. If the specified time-out interval elapses, the task enters the ready queue.
   */
  wait: (readyTimeout?: number) => Promise<boolean>;
}
