// อ่าน/เขียน localStorage อย่างปลอดภัย — ถ้าเบราว์เซอร์ไม่อนุญาต (เช่นโหมดส่วนตัว) เว็บยังทำงานต่อได้

const PREFIX = "vu:";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // ไม่ต้องทำอะไร — แค่จำค่าไม่ได้
  }
}
