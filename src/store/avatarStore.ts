// src/store/avatarStore.ts
import { create } from 'zustand';

interface AvatarStore {
    versions: { [userId: string]: string };
    updateVersion: (userId: string) => void;
    getVersion: (userId: string) => string;
}

export const useAvatarStore = create<AvatarStore>((set, get) => ({
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