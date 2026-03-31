import { load, Store } from "@tauri-apps/plugin-store";
import { create } from "zustand";

const STORE_FILE = "camera.json";
const KEY_IP = "camera_ip";

type CameraStore = {
  ip: string;
  isLoaded: boolean;
  store: Store | null;

  setIp: (ip: string) => Promise<void>;
  loadFromDisk: () => Promise<void>;
};

export const useCameraStore = create<CameraStore>((set, get) => ({
  ip: "",
  isLoaded: false,
  store: null,

  loadFromDisk: async () => {
    const store = await load(STORE_FILE, { autoSave: true, defaults: {} });

    const saved = await store.get<string>(KEY_IP);

    set({ store, ip: saved ?? "", isLoaded: true });
  },

  setIp: async (ip: string) => {
    const store = get().store;

    if (store) {
      await store.set(KEY_IP, ip);
    }

    set({ ip });
  },
}));
