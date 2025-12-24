'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { tokenManager } from '@/lib/tokenUtils';

// Вынеси основную логику в отдельный компонент
function RefreshTokenContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const hasProcessedRef = useRef(false);

    useEffect(() => {
        // Выполняем ТОЛЬКО ОДИН РАЗ
        if (hasProcessedRef.current) return;
        hasProcessedRef.current = true;

        const refreshTokens = async () => {
            console.log('🔄 Starting token refresh...');

            const refreshToken = localStorage.getItem('refreshToken');
            const redirectTo = searchParams.get('redirect') || '/';

            if (!refreshToken) {
                console.log('❌ No refresh token');
                router.push('/auth/login');
                return;
            }

            try {
                const result = await tokenManager.refreshTokens();

                if (result && result.success) {
                    console.log('✅ Tokens refreshed successfully');
                    // Мгновенный редирект без задержки
                    router.push(redirectTo);
                } else {
                    throw new Error('Refresh failed');
                }
            } catch (error) {
                console.error('❌ Token refresh failed:', error);
                tokenManager.clearTokens();
                router.push('/auth/login');
            }
        };

        refreshTokens();
    }, [router, searchParams]);

    // Простой спиннер без лишней логики
    return (
        <div className="refresh-container">
            <div className="refresh-card">
                <div className="loading-spinner-large"></div>
                <h1>Обновление сессии</h1>
                <p>Пожалуйста, подождите...</p>
            </div>
        </div>
    );
}

// Основной компонент с Suspense
export default function RefreshTokenPage() {
    return (
        <Suspense fallback={
            <div className="refresh-container">
                <div className="refresh-card">
                    <div className="loading-spinner-large"></div>
                    <h1>Загрузка...</h1>
                    <p>Подготовка страницы</p>
                </div>
            </div>
        }>
            <RefreshTokenContent />
        </Suspense>
    );
}