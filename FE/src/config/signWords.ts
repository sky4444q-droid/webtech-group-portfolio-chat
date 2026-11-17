// คำบนป้ายนีออนตามบุคลิกถนน — ร้านสมมติ/คำทั่วไปที่ความหมายถูกต้อง ห้ามชื่อแบรนด์จริงและห้ามข้อมูลทีม
// ja = ญี่ปุ่น · zh = จีน · th = ไทย · en = อังกฤษ · vertical = ป้ายแนวตั้ง (เฉพาะอักษรจีน/ญี่ปุ่น)

export type SignLang = "ja" | "zh" | "th" | "en";
export interface SignWord {
  text: string;
  lang: SignLang;
  vertical?: boolean;
}

const ja = (text: string, vertical = false): SignWord => ({ text, lang: "ja", vertical });
const zh = (text: string, vertical = false): SignWord => ({ text, lang: "zh", vertical });
const th = (text: string): SignWord => ({ text, lang: "th" });
const en = (text: string): SignWord => ({ text, lang: "en" });

export const SIGN_WORDS: Record<"food" | "gallery" | "office" | "shrine" | "nexus", SignWord[]> = {
  // ซอยอาหาร (Gate)
  food: [
    ja("ラーメン", true), ja("夜市", true), ja("酒場", true), ja("居酒屋", true), ja("寿司"), ja("焼き鳥", true), ja("うどん"),
    zh("营业中"), zh("饺子", true), zh("面馆", true), zh("茶餐厅"), zh("小吃"),
    th("ข้าวมันไก่"), th("ก๋วยเตี๋ยว"), th("ข้าวผัด"), th("ชานมไข่มุก"), th("เปิด 24 ชม."),
    en("NOODLE BAR"), en("OPEN 24H"), en("HOT POT"), en("DUMPLINGS"), en("NIGHT MARKET"),
  ],
  // ถนนแกลเลอรี (Projects)
  gallery: [
    ja("展示", true), ja("美術館", true), ja("作品"), ja("未来", true), ja("電脳", true), ja("光"),
    zh("画廊", true), zh("艺术"), zh("设计", true), zh("数字", true), zh("展览"),
    th("แกลเลอรี"), th("นิทรรศการ"), th("ผลงาน"), th("ศิลปะดิจิทัล"), th("ออกแบบ"),
    en("GALLERY"), en("EXHIBIT"), en("NEW WORKS"), en("PIXEL LAB"), en("SHOWCASE"), en("DESIGN"),
  ],
  // ถนนสำนักงาน (Team)
  office: [
    ja("事務所", true), ja("電脳", true), ja("会議室"), ja("受付", true), ja("研究所", true), ja("修理"),
    zh("办公室", true), zh("科技"), zh("网络", true), zh("服务台"), zh("维修", true),
    th("ร้านซ่อมไซบอร์ก"), th("ร้านซ่อมคอม"), th("ห้องประชุม"), th("ประชาสัมพันธ์"), th("สำนักงาน"),
    en("OFFICE"), en("RECEPTION"), en("REPAIR SHOP"), en("DATA CENTER"), en("CO-WORKING"), en("PRINT SHOP"),
  ],
  // ซอยแคบ (Sanctuary) — บรรยากาศเงียบ ไม่ใช้คำทางศาสนา
  shrine: [
    ja("薬局", true), ja("茶屋", true), ja("静か"), ja("夢", true), ja("月"), ja("灯", true),
    zh("药房", true), zh("茶馆", true), zh("安静"), zh("月光"), zh("书店", true),
    th("ร้านน้ำชา"), th("ร้านยา"), th("ร้านหนังสือ"), th("เงียบสงบ"), th("ซอยแสงจันทร์"),
    en("TEA HOUSE"), en("PHARMACY"), en("BOOKS"), en("QUIET"), en("MOONLIGHT"), en("HERBS"),
  ],
  // สี่แยกกลางเมือง
  nexus: [
    ja("電脳", true), ja("交差点"), ja("入口", true), ja("出口", true), ja("案内", true), ja("駐車場"),
    zh("营业中"), zh("欢迎光临", true), zh("停车场", true), zh("地铁站"), zh("便利店", true),
    th("ทางเข้า"), th("ทางออก"), th("สี่แยก"), th("ร้านสะดวกซื้อ"), th("จุดนัดพบ"),
    en("CROSSING"), en("OPEN 24H"), en("ARCADE"), en("KARAOKE"), en("CYBER CAFE"), en("EXIT"),
  ],
};

/** ชื่อแบรนด์จริงที่ห้ามปรากฏบนป้าย (ตรวจด้วยเทส) */
export const BANNED_WORDS = ["coca", "pepsi", "sony", "nike", "7-eleven", "mcdonald", "kfc", "starbucks", "samsung", "apple", "google", "toyota", "nintendo", "uniqlo"];
