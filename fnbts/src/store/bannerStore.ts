// src/store/bannerStore.ts
import { create } from 'zustand';

interface BannerStore {
    versions: { [userId: string]: string };
    updateVersion: (userId: string) => void;
    getVersion: (userId: string) => string;
}

export const useBannerStore = create<BannerStore>((set, get) => ({
    versions: {},
    updateVersion: (userId: string) => {
        set((state) => ({
            versions: {
                ...state.versions,
                [userId]: Date.now().toString(),
            },
        }));
    },
    getVersion: (userId: string) => {
        const state = get();
        return state.versions[userId] || '1';
    },
}));