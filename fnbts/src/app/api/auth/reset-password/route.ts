// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { hashPassword } from '@/lib/auth';

// Типы для базы данных
interface PasswordResetToken {
    id: number;
    user_id: number;
    token: string;
    expires_at: Date;
    used: boolean;
    created_at: Date;
}

interface ResetTokenRow extends PasswordResetToken {
    user_id: number;
}

export async function POST(request: NextRequest) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { token, newPassword } = await request.json();

        if (!token || !newPassword) {
            return NextResponse.json(
                { success: false, error: 'Токен и новый пароль обязательны' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { success: false, error: 'Пароль должен содержать минимум 6 символов' },
                { status: 400 }
            );
        }

        // Проверяем и получаем токен
        const [tokens] = await connection.execute(
            `SELECT pt.*, u.id as user_id
             FROM password_reset_tokens pt
                      JOIN users u ON pt.user_id = u.id
             WHERE pt.token = ? AND pt.used = FALSE AND pt.expires_at > NOW()`,
            [token]
        ) as [ResetTokenRow[], unknown];

        if (tokens.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Ссылка для сброса пароля недействительна или устарела' },
                { status: 400 }
            );
        }

        const resetToken = tokens[0];
        const hashedPassword = await hashPassword(newPassword);

        // Обновляем пароль пользователя
        await connection.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, resetToken.user_id]
        );

        // Помечаем токен как использованный
        await connection.execute(
            'UPDATE password_reset_tokens SET used = TRUE WHERE id = ?',
            [resetToken.id]
        );

        // Отзываем все активные сессии пользователя (опционально)
        await connection.execute(
            'DELETE FROM refresh_tokens WHERE user_id = ?',
            [resetToken.user_id]
        );

        await connection.commit();

        return NextResponse.json({
            success: true,
            message: 'Пароль успешно изменен'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Reset password error:', error);
        return NextResponse.json(
            { success: false, error: 'Ошибка сервера' },
            { status: 500 }
        );
    } finally {
        connection.release();
    }
}