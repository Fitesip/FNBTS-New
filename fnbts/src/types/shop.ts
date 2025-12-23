export interface Frame {
    id: number;
    name: string;
    url: string;
    rarity: string;
    roles: string[];
    pointsRequired: number;
    isDefault: boolean;
    author?: string;
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
}

export interface Points {
    id: number;
    name: string;
    description: string;
    pointsAmount: number;
    cost: number;
}

export interface Codes {
    id: number;
    code: string;
    hleb: number;
    sfl: number;
    points: number;
}