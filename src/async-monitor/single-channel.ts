import { Lock } from "./lock";
import { nextTick } from "../utility/timer";

export class SingleChannel<T> {
  public constructor(
    private hasValue: boolean,
    private value: T | null,
  ) {
    if (hasValue) {
      this.lock = new Lock(false);
    } else {
      this.value = null;

      this.lock = new Lock();
    }
  }

  public async acquire(abortSignal: AbortSignal | null = null) {
    this.assertClosed();

    if (0 < this.acquireCount) {
      await nextTick();
    }

    let leave!: () => void;

    const interruptPromise = new Promise<void>((resolve, reject) => {
      if (abortSignal) {
        abortSignal.throwIfAborted();
        abortSignal.addEventListener("abort", () => {
          reject(abortSignal.reason);
        });
      }

      leave = resolve;
    });

    this.acquireCount++;

    try {
      while (!this.hasValue) {
        await Promise.race([this.lock.block, interruptPromise]);
      }
    } finally {
      this.acquireCount--;

      leave();
    }

    this.lock = new Lock();

    return this.removeValue() as T;
  }

  private assertClosed() {
    if (this.isClosed) {
      throw new ClosedError();
    }
  }

  public close(reason?: unknown) {
    if (this.isClosed) {
      return;
    }

    this.removeValue();

    if (0 !== this.acquireCount) {
      this.lock.interrupt(reason);
    }

    this._isClosed = true;
  }

  public getValue(): [false] | [true, T] {
    this.assertClosed();

    if (this.hasValue) {
      return [true, this.value!];
    } else {
      return [false];
    }
  }

  private removeValue() {
    const value = this.value;

    this.value = null;
    this.hasValue = false;

    return value;
  }

  public setValue(value: T) {
    this.assertClosed();

    if (this.hasValue) {
      throw new ExistValueError();
    } else {
      this.value = value;
      this.lock.unlock();
      this.hasValue = true;
    }
  }

  public get isClosed() {
    return this._isClosed;
  }

  private _isClosed = false;

  private acquireCount = 0;

  private lock: Lock;
}

export class SingleChannelError extends Error {}

export class ExistValueError extends SingleChannelError {}

export class ClosedError extends SingleChannelError {}
