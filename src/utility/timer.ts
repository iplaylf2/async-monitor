export async function delay(timeout: number) {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, timeout);
  });
}

export async function nextTick() {
  await new Promise((resolve) => {
    process.nextTick(resolve);
  });
}
