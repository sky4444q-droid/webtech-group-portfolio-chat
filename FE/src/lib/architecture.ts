// แยกข้อความ Architecture ("A → B -> C") เป็นขั้น ๆ เพื่อวาดไดอะแกรมกล่อง-ลูกศร

export function parseArchitecture(text: string): string[] {
  return text
    .split(/→|->/)
    .map((s) => s.trim())
    .filter(Boolean);
}
