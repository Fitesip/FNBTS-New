import { User } from './database';

export interface LoginData {
    email: string;
    password: string;
}

export interface RegisterData {
    username: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    message: string;
    accessToken: string;
    refreshToken: string;
    user: Omit<User, 'password'> | null;
}

export interface AuthContextType {
    user: Omit<User, 'password'> | null;
    login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
    register: (username: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
    loading: boolean;
    checkAuth: () => Promise<boolean>;
}

export interface JwtPayload {
    userId: number;
    iat?: number;
    exp?: number;
}

// src/types/auth.ts
export interface PasswordResetRequest {
    email: string;
    login: string;
}

export interface PasswordResetToken {
    id: number;
    user_id: number;
    token: string;
    expires_at: string;
    used: boolean;
    created_at: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}