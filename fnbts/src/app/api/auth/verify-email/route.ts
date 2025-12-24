// src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

// Типы для базы данных
interface User {
    id: number;
    username: string;
    email_verified: boolean | string;
}

interface ApiResponse {
    success: boolean;
    message?: string;
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
    try {
        const { code } = await request.json();

        if (!code) {
            return NextResponse.json(
                { success: false, error: 'Код подтверждения обязателен' },
                { status: 400 }
            );
        }

        // Ищем пользователя с таким кодом подтверждения
        const [users] = await pool.execute(
            'SELECT id, username, email_verified FROM users WHERE confirmCode = ?',
            [code]
        ) as [User[], unknown];

        if (users.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Неверный код подтверждения' },
                { status: 400 }
            );
        }

        const user = users[0];

        // Если email уже подтвержден
        if (user.email_verified) {
            return NextResponse.json(
                { success: false, error: 'Email уже подтвержден' },
                { status: 400 }
            );
        }

        // Подтверждаем email и очищаем код
        await pool.execute(
            'UPDATE users SET email_verified = TRUE, confirmCode = NULL WHERE id = ?',
            [user.id]
        );

        return NextResponse.json({
            success: true,
            message: 'Email успешно подтвержден!'
        });

    } catch (error) {
        console.error('Verify email error:', error);
        return NextResponse.json(
            { success: false, error: 'Ошибка сервера' },
            { status: 500 }
        );
    }
}