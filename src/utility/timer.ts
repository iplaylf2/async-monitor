export async function delay(timeout: number) {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, timeout);
  });
}
