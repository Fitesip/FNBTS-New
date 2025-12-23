export interface Frame {
    id: number;
    name: string;
    url: string;
    rarity: string;
    roles: string[];
    pointsRequired: number;
    isDefault: boolean;
    author?: string;
    sale?: boolean;
    oldPrice?: number;
}

export interface CurrencyPackage {
    id: number;
    name: string;
    description: string;
    hleb: number;
    sfl: number;
    pointsCost: number;
    popular?: boolean;
    author?: string;
    frameId?: number;
    sale?: boolean;
    oldPrice?: number;
}

export interface Points {
    id: number;
    name: string;
    description: string;
    pointsAmount: number;
    cost: number;
    sale?: boolean;
    oldPrice?: number;
}

export interface Codes {
    id: number;
    code: string;
    hleb: number;
    sfl: number;
    points: number;
}