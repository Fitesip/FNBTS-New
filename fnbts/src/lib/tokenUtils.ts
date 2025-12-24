// src/lib/tokenUtils.ts
'use client';

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    success: boolean;
}

export interface UserPayload {
    id: number;
    username: string;
    email: string;
    exp: number;
    iat: number;
}

export class TokenManager {
    private static instance: TokenManager;

    static getInstance(): TokenManager {
        if (!TokenManager.instance) {
            TokenManager.instance = new TokenManager();
        }
        return TokenManager.instance;
    }

    // Декодирует JWT токен
    private decodeToken(token: string): UserPayload | null {
        try {
            const payload = token.split('.')[1];
            const decoded = atob(payload);
            return JSON.parse(decoded);
        } catch {
            return null;
        }
    }

    // Проверка валидности access token
    isAccessTokenValid(): boolean {
        if (typeof window === 'undefined') return false;

        const token = localStorage.getItem('accessToken');
        if (!token) return false;

        try {
            const payload = this.decodeToken(token);
            if (!payload) return false;

            const expiresAt = payload.exp * 1000;
            return Date.now() < expiresAt;
        } catch {
            return false;
        }
    }

    // Получает ID пользователя из текущего токена
    getUserId(): number | null {
        if (typeof window === 'undefined') return null;

        const token = localStorage.getItem('accessToken');
        if (!token) return null;

        const payload = this.decodeToken(token);
        return payload?.id || null;
    }

    // Получает данные пользователя из токена
    getUserData(): UserPayload | null {
        if (typeof window === 'undefined') return null;

        const token = localStorage.getItem('accessToken');
        if (!token) return null;

        return this.decodeToken(token);
    }

    // Обновление токенов с помощью refresh token
    async refreshTokens(): Promise<TokenResponse | null> {
        if (typeof window === 'undefined') return null;

        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return null;

        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
            });

            const data = await response.json();

            if (data.success && data.data) {
                const { accessToken, refreshToken: newRefreshToken } = data.data;

                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', newRefreshToken);

                return {
                    accessToken,
                    refreshToken: newRefreshToken,
                    success: true
                };
            } else {
                console.log('Token refresh failed:', data);
                this.clearTokens();
                return null;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            this.clearTokens();
            return null;
        }
    }

    // Автоматическое обновление токенов при необходимости
    async ensureValidToken(): Promise<string | null> {
        if (this.isAccessTokenValid()) {
            return localStorage.getItem('accessToken');
        }

        const result = await this.refreshTokens();
        return result ? result.accessToken : null;
    }

    // Очистка токенов
    clearTokens(): void {
        if (typeof window === 'undefined') return;

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }

    // Получение текущего access token с автоматическим обновлением
    async getValidAccessToken(): Promise<string | null> {
        return await this.ensureValidToken();
    }

    // Получение ID пользователя с автоматическим обновлением токена
    async getUserIdWithRefresh(): Promise<number | null> {
        const validToken = await this.getValidAccessToken();
        if (!validToken) return null;

        const payload = this.decodeToken(validToken);
        return payload?.id || null;
    }

    // Сохранение новых токенов
    setTokens(accessToken: string, refreshToken: string): void {
        if (typeof window === 'undefined') return;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
    }

    // Получение refresh token
    getRefreshToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('refreshToken');
    }

    // Получение access token (без проверки валидности)
    getAccessToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('accessToken');
    }
}

export const tokenManager = TokenManager.getInstance();