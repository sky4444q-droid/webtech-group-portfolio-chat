// รอฟอนต์เว็บโหลด (มีเวลาหมด) — ป้ายวาดด้วยฟอนต์สำรองก่อน แล้ววาดใหม่ครั้งเดียวเมื่อพร้อม

export function whenFontsReady(
  timeoutMs: number,
  fonts: { ready: Promise<unknown> } | undefined = typeof document !== "undefined" ? document.fonts : undefined,
): Promise<"ready" | "timeout" | "unsupported"> {
  if (!fonts) return Promise.resolve("unsupported");
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("timeout"), timeoutMs);
    fonts.ready.then(
      () => {
        clearTimeout(timer);
        resolve("ready");
      },
      () => {
        clearTimeout(timer);
        resolve("timeout");
      },
    );
  });
}
