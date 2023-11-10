import { delay } from "../utility/timer";
import { expression } from "../utility/function";

export class Monitor {
  public pulse(): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { done, value: one } = this.waitSet.entries().next();
    if (!(done ?? false)) {
      const [criticalSection, resolve] = one;
      this.waitSet.delete(criticalSection);

      resolve();
    }
  }

  public pulseAll(): void {
    for (const [criticalSection, resolve] of this.waitSet) {
      this.waitSet.delete(criticalSection);

      resolve();
    }
  }

  public async wait(
    criticalSection: AbortSignal,
    readyTimeout: number,
  ): Promise<boolean> {
    criticalSection.throwIfAborted();

    let reject!: (reason?: unknown) => void, resolve!: () => void;

    const readyPromise = new Promise<void>((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    const abortListener = () => {
      reject(criticalSection.reason);
    };

    criticalSection.addEventListener("abort", abortListener);

    const hasPulse = await expression(async () => {
      switch (readyTimeout) {
        case 0: {
          return true;
        }
        case Infinity: {
          this.waitSet.set(criticalSection, resolve);

          await readyPromise;

          return true;
        }
        default: {
          this.waitSet.set(criticalSection, resolve);

          return await Promise.race([
            readyPromise.then(() => true),
            delay(readyTimeout).then(() => {
              this.waitSet.delete(criticalSection);

              return false;
            }),
          ]);
        }
      }
    }).catch((e) => {
      this.waitSet.delete(criticalSection);

      throw e;
    });

    criticalSection.removeEventListener("abort", abortListener);

    return hasPulse;
  }

  private readonly waitSet = new Map<AbortSignal, () => void>();
}
