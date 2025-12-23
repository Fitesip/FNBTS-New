export interface AvatarFrame {
    id: string;
    name: string;
    preview: string;
    frameClass: string;
    price?: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    unlocked: boolean;
}

export interface UserCustomization {
    avatarFrame: string | null;
    // Можно добавить другие настройки персонализации позже
}