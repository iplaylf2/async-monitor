# async-monitor

`async-monitor` is a nodejs library that provides a simple way to synchronize access to shared objects in asynchronous code blocks.

It is inspired by the [Monitor](https://learn.microsoft.com/en-us/dotnet/api/system.threading.monitor) class in .NET, which allows multiple threads to acquire and release exclusive locks on resources.

Since async-monitor uses AsyncLocalStorage and Symbol.dispose internally, it can only be used in nodejs 20+ environments.

## usage

```typescript
import { enter } from "async-monitor";

async function delay(timeout: number) {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, timeout);
  });
}

let foo = 0;

void (async () => {
  while (true) {
    await enter(233, async (section) => {
      console.log("while 1");

      section.pulseAll();
      await section.wait();

      const value = foo;
      await delay(500);

      foo = value + 1;

      console.log(`while 1: ${foo}`);
    });
  }
})();

void (async () => {
  while (true) {
    await enter(233, async (section) => {
      console.log("while 2");

      section.pulseAll();
      await section.wait();

      const value = foo;
      await delay(500);

      console.log("to reenter");
      await enter(233, () => {
        console.log("reenter");
      });

      foo = value + 1;

      console.log(`while 2: ${foo}`);
    });
  }
})();
```
