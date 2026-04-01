import type { Version } from "@/types";
import { create } from "zustand";

type VersionStore = {
  version: Version;
  updateVersion: (v: Version) => void;
};

export const useVersionStore = create<VersionStore>((set) => ({
  version: "",
  updateVersion: (version) => set({ version }),
}));
