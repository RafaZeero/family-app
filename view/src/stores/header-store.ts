import { create } from "zustand";
import type { ReactNode } from "react";

type HeaderStore = {
  content: ReactNode;
  setContent: (node: ReactNode) => void;
  clearContent: () => void;
};

export const useHeaderStore = create<HeaderStore>((set) => ({
  content: null,
  setContent: (content) => set({ content }),
  clearContent: () => set({ content: null }),
}));
