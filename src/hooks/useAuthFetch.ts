'use client';

import { tokenManager } from '@/lib/tokenUtils';

export function useAuthFetch() {
    const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
        let accessToken = await tokenManager.getValidAccessToken();

        if (!accessToken) {
            throw new Error('No valid access token available');
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        // Если токен истек во время запроса, пробуем обновить и повторить
        if (response.status === 401) {
            const newToken = await tokenManager.refreshTokens();
            if (newToken) {
                accessToken = newToken.accessToken;
                // Повторяем запрос с новым токеном
                return fetch(url, {
                    ...options,
                    headers: {
                        ...options.headers,
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
            } else {
                throw new Error('Authentication failed');
            }
        }

        return response;
    };

    return { authFetch };
}