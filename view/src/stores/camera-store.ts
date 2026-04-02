import { load, Store } from "@tauri-apps/plugin-store";
import { create } from "zustand";

const STORE_FILE = "camera.json";
const KEY_IP = "camera_ip";
const KEY_USERNAME = "camera_username";
const KEY_PASSWORD = "camera_password";

type CameraStore = {
  ip: string;
  username: string;
  password: string;
  isLoaded: boolean;
  store: Store | null;

  setIp: (ip: string) => Promise<void>;
  setUsername: (username: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  loadFromDisk: () => Promise<void>;
};

export const useCameraStore = create<CameraStore>((set, get) => ({
  ip: "",
  username: "",
  password: "",
  isLoaded: false,
  store: null,

  loadFromDisk: async () => {
    const store = await load(STORE_FILE, { autoSave: true, defaults: {} });

    const savedIp = await store.get<string>(KEY_IP);
    const savedUsername = await store.get<string>(KEY_USERNAME);
    const savedPassword = await store.get<string>(KEY_PASSWORD);

    set({ store, ip: savedIp ?? "", username: savedUsername ?? "", password: savedPassword ?? "", isLoaded: true });
  },

  setIp: async (ip: string) => {
    const store = get().store;
    if (store) {
      await store.set(KEY_IP, ip);
    }
    set({ ip });
  },

  setUsername: async (username: string) => {
    const store = get().store;
    if (store) {
      await store.set(KEY_USERNAME, username);
    }
    set({ username });
  },

  setPassword: async (password: string) => {
    const store = get().store;
    if (store) {
      await store.set(KEY_PASSWORD, password);
    }
    set({ password });
  },
}));
