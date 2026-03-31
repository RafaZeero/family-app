import { create } from "zustand";
import type { ReactNode } from "react";

type HeaderStore = {
  content: ReactNode;
  badge: ReactNode;
  setContent: (node: ReactNode) => void;
  clearContent: () => void;
  setBadge: (node: ReactNode) => void;
  clearBadge: () => void;
};

export const useHeaderStore = create<HeaderStore>((set) => ({
  content: null,
  badge: null,
  setContent: (content) => set({ content }),
  clearContent: () => set({ content: null }),
  setBadge: (badge) => set({ badge }),
  clearBadge: () => set({ badge: null }),
}));
