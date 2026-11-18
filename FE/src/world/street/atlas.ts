// วางสี่เหลี่ยมลงหน้า atlas แบบชั้นวาง (shelf) — logic ล้วน ผลคงที่ตามลำดับที่ให้มา

export interface AtlasRect {
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
}

export function packAtlas(sizes: { w: number; h: number }[], atlasSize: number): AtlasRect[] {
  let page = 0;
  let x = 0;
  let y = 0;
  let shelf = 0;
  return sizes.map(({ w, h }) => {
    if (w > atlasSize || h > atlasSize) throw new Error(`atlas item ${w}x${h} is larger than ${atlasSize}`);
    if (x + w > atlasSize) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    if (y + h > atlasSize) {
      page += 1;
      x = 0;
      y = 0;
      shelf = 0;
    }
    const r = { x, y, w, h, page };
    x += w;
    shelf = Math.max(shelf, h);
    return r;
  });
}
