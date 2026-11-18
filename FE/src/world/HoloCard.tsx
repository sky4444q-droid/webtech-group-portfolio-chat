// การ์ด Hologram ลอยในฉาก (HTML ซ้อนในฉาก เพื่อให้ภาษาไทยแสดงถูก) มีเส้นสแกนและสั่นไหวเบา ๆ

import { Html } from "@react-three/drei";
import type { ReactNode } from "react";
import type { Vec3 } from "../config/districts";

export function HoloCard({
  position,
  color,
  children,
  wide = false,
  className = "",
}: {
  position: Vec3;
  color: string;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <Html position={position} center distanceFactor={7} zIndexRange={[25, 0]} occlude={false}>
      <div className={`holo-card ${wide ? "holo-card-wide" : ""} ${className}`} style={{ "--holo": color } as React.CSSProperties}>
        <div className="holo-scan" aria-hidden="true" />
        {children}
      </div>
    </Html>
  );
}
