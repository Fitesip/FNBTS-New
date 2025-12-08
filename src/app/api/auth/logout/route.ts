import { NextRequest, NextResponse } from 'next/server';
import { revokeAllUserTokens, revokeRefreshToken, verifyAccessToken } from '@/lib/auth';
import { ApiResponse } from '@/types/database';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { refreshToken } = body;
        const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');

        console.log('Logout request:', {
            hasRefreshToken: !!refreshToken,
            hasAccessToken: !!accessToken
        });

        let revoked = false;

        if (refreshToken) {
            // Отзываем конкретный refresh token
            revoked = await revokeRefreshToken(refreshToken);
            console.log('Refresh token revoked:', revoked);
        }

        if (accessToken && !revoked) {
            // Если нет refresh token, но есть access token, находим и отзываем все токены пользователя
            const decoded = verifyAccessToken(accessToken);
            if (decoded) {
                revoked = await revokeAllUserTokens(decoded.userId);
                console.log('All user tokens revoked:', revoked);
            } else {
                console.log('Invalid access token');
            }
        }

        // Если ни один из методов не сработал, все равно считаем выход успешным
        const response: ApiResponse = {
            success: true,
            message: 'Успешный выход'
        };

        return NextResponse.json(response, { status: 200 });

    } catch (error) {
        console.error('Logout error:', error);

        // Даже при ошибке считаем выход успешным на клиенте
        const response: ApiResponse = {
            success: true,
            message: 'Сессия завершена'
        };

        return NextResponse.json(response, { status: 200 });
    }
}