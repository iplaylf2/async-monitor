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
      await delay(1000);

      console.log("while 1");

      const value = foo;

      section.pulseAll();
      await section.wait();

      foo = value + 1;

      console.log(`while 1: ${foo}`);
    });
  }
})();

void (async () => {
  while (true) {
    await enter(233, async (section) => {
      await delay(1000);

      console.log("while 2");

      const value = foo;

      section.pulseAll();
      await section.wait();

      console.log("to reentrance");
      await enter(233, () => {
        console.log("reentrance");
      });

      foo = value + 1;

      console.log(`while 2: ${foo}`);
    });
  }
})();
```
