import { NextRequest, NextResponse } from 'next/server';
import {
    verifyRefreshToken,
    generateTokens,
    findValidRefreshToken,
    rotateRefreshToken,
    revokeRefreshToken
} from '@/lib/auth';
import { ApiResponse } from '@/types/database';
import { AuthResponse } from '@/types/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const refreshToken = body.refreshToken;

        if (!refreshToken) {
            return NextResponse.json(
                { success: false, error: 'Refresh token обязателен' },
                { status: 400 }
            );
        }

        // Проверяем валидность токена в базе данных
        const tokenInDb = await findValidRefreshToken(refreshToken);
        if (!tokenInDb) {
            return NextResponse.json(
                { success: false, error: 'Невалидный refresh token' },
                { status: 401 }
            );
        }

        // Верифицируем JWT токен
        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) {
            await revokeRefreshToken(refreshToken); // Отзываем невалидный токен
            return NextResponse.json(
                { success: false, error: 'Невалидный refresh token' },
                { status: 401 }
            );
        }

        // Генерируем новые токены
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

        // Обновляем refresh токен в базе (ротация)
        const isRotated = await rotateRefreshToken(refreshToken, newRefreshToken);
        if (!isRotated) {
            return NextResponse.json(
                { success: false, error: 'Ошибка обновления сессии' },
                { status: 500 }
            );
        }

        const response: ApiResponse<AuthResponse> = {
            success: true,
            message: 'Токены обновлены',
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: null, // Здесь можно добавить данные пользователя если нужно
                message: 'Токены обновлены'
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Refresh token error:', error);
        return NextResponse.json(
            { success: false, error: 'Ошибка сервера' },
            { status: 500 }
        );
    }
}