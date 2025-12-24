// src/app/api/auth/verify-reset-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

// Типы для базы данных
interface PasswordResetToken {
    id: number;
    user_id: number;
    token: string;
    expires_at: Date;
    used: boolean;
    created_at: Date;
}

interface ResetTokenWithUser extends PasswordResetToken {
    username: string;
}

interface ApiResponse {
    success: boolean;
    data?: {
        username: string;
    };
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Токен обязателен' },
                { status: 400 }
            );
        }

        // Проверяем токен в базе
        const [tokens] = await pool.execute(
            `SELECT pt.*, u.username
             FROM password_reset_tokens pt
                      JOIN users u ON pt.user_id = u.id
             WHERE pt.token = ? AND pt.used = FALSE AND pt.expires_at > NOW()`,
            [token]
        ) as [ResetTokenWithUser[], unknown];

        if (tokens.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Ссылка для сброса пароля недействительна или устарела' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                username: tokens[0].username
            }
        });

    } catch (error) {
        console.error('Verify reset token error:', error);
        return NextResponse.json(
            { success: false, error: 'Ошибка сервера' },
            { status: 500 }
        );
    }
}