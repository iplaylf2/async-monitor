/* eslint-disable @typescript-eslint/no-empty-function */
export class Lock {
  public constructor(private _isLocked = true) {
    if (_isLocked) {
      this.block = new Promise<void>((resolve, reject) => {
        (this.unlock as unknown) = resolve;
        (this.interrupt as unknown) = reject;
      }).finally(() => {
        this._isLocked = false;
      });
    } else {
      this.block = Promise.resolve();
      this.unlock = () => {};
      this.interrupt = () => {};
    }
  }

  public get isLocked() {
    return this._isLocked;
  }

  public readonly block: Promise<void>;

  public readonly interrupt!: (reason?: unknown) => void;

  public readonly unlock!: () => void;
}
