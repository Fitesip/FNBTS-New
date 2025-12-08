// src/types/database.ts
export interface User {
    id: number;
    username: string;
    password: string;
    email: string;
    regDate: Date;
    role: string;
    userRank: string;
    status: string;
    photo: string;
    banner: string;
    frame: string;
    points: number;
    verify: boolean;
    confirmCode: string;
    email_verified: boolean;
    isBlocked: boolean;
    discordConnected: boolean;
}

export interface UserWithoutSensitiveData {
    id: number;
    username: string;
    email: string;
    regDate: Date;
    role: string;
    userRank: string;
    status: string;
    photo: string;
    banner: string;
    frame: string;
    points: number;
    verify: number;
}

export interface RefreshToken {
    id: number;
    user_id: number;
    token: string;
    expires_at: Date;
    created_at: Date;
    is_revoked: boolean;
}

export interface CreateUserRequest {
    name: string;
    email: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}