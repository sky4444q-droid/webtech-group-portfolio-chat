// ข้อมูล Portfolio ที่หน้าเว็บใช้ — เริ่มจากข้อมูลชั่วคราว แล้วโหลดของจริงจากหลังบ้าน (GET /portfolio)

import { create } from "zustand";
import type { Portfolio } from "../types";
import { portfolio as fallback } from "../data/portfolio";
import { portfolioFromApi, type ApiPortfolio } from "../data/fromApi";
import { apiBase, isMockMode } from "../services/chatApi";

interface PortfolioState {
  data: Portfolio;
  source: "fallback" | "api";
  load: () => Promise<void>;
}

export const usePortfolio = create<PortfolioState>((set) => ({
  data: fallback,
  source: "fallback",
  load: async () => {
    if (isMockMode()) return;
    try {
      const res = await fetch(`${apiBase()}/portfolio`, { signal: AbortSignal.timeout(70_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      set({ data: portfolioFromApi((await res.json()) as ApiPortfolio), source: "api" });
    } catch (err) {
      console.warn("Portfolio: load from backend failed, using placeholder data", err);
    }
  },
}));
