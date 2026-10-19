export class Mutex {
  private locked = false;

  public lock(): Promise<void> {
    return new Promise(
      (resolve: (value: void | PromiseLike<void>) => void): void => {
        if (this.locked) {
          setTimeout((): void => {
            resolve(this.lock());
          }, 10);
        } else {
          this.locked = true;
          resolve();
        }
      },
    );
  }

  public unlock(): void {
    this.locked = false;
  }
}
