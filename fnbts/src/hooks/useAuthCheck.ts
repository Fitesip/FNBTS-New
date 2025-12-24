// src/app/hooks/useAuthCheck.ts
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { tokenManager } from '@/lib/tokenUtils';

export function useAuthCheck() {
    const router = useRouter();
    const hasCheckedRef = useRef(false);

    useEffect(() => {
        if (hasCheckedRef.current) return;
        hasCheckedRef.current = true;

        const currentPath = window.location.pathname;
        const hasValidAccessToken = tokenManager.isAccessTokenValid();
        const hasRefreshToken = !!localStorage.getItem('refreshToken');

        console.log('🔐 ONE-TIME Auth check:', {
            path: currentPath,
            validToken: hasValidAccessToken,
            refreshToken: hasRefreshToken
        });

        // Правило 1: Если на странице логина/регистрации и есть валидные токены - в профиль
        if ((currentPath === '/auth/login' || currentPath === '/auth/register') && hasValidAccessToken && hasRefreshToken) {
            console.log('🚀 Redirect: auth page with valid tokens -> profile');
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    router.push(`/user/${payload.userId}`);
                    return;
                } catch {
                    router.push('/');
                    return;
                }
            }
        }

        // Правило 2: Если есть refresh token, но нет валидного access token - на refresh
        // ВНЕ ЗАВИСИМОСТИ ОТ ТЕКУЩЕЙ СТРАНИЦЫ
        if (hasRefreshToken && !hasValidAccessToken) {
            console.log('🔄 Redirect: has refresh token but no valid access token -> refresh page');

            // Если уже на refresh странице - не редиректим
            if (currentPath !== '/auth/refresh') {
                const redirectUrl = `/auth/refresh?redirect=${encodeURIComponent(currentPath)}`;
                router.push(redirectUrl);
                return;
            } else {
                console.log('📌 Already on refresh page, staying here');
                return;
            }
        }

        // Правило 3: Если на refresh странице и нет refresh токена - на логин
        if (currentPath === '/auth/refresh' && !hasRefreshToken) {
            console.log('❌ Redirect: no refresh token on refresh page -> login');
            router.push('/auth/login');
            return;
        }

        // Правило 4: Если нет токенов вообще и на защищенных страницах - на логин
        if (!hasValidAccessToken && !hasRefreshToken) {
            const protectedPaths = ['/user/', '/profile', '/dashboard'];
            const isOnProtectedPath = protectedPaths.some(path => currentPath.startsWith(path));

            if (isOnProtectedPath && currentPath !== '/auth/login') {
                console.log('🚫 Redirect: no tokens on protected page -> login');
                router.push('/auth/login');
                return;
            }
        }

        console.log('✅ No redirect needed - staying on:', currentPath);
    }, [router]);
}