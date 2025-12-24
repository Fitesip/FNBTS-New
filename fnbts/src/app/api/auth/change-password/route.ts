// src/app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import {hashPassword, verifyPassword} from '@/lib/auth';
import { User } from "@/types/database";

export async function POST(request: NextRequest) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { email, password, newPassword } = await request.json();

        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Требуется авторизация'
            }, { status: 401 });
        }

        if (!newPassword || !password) {
            return NextResponse.json(
                { success: false, error: 'Токен, старый и новый пароль обязательны' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { success: false, error: 'Пароль должен содержать минимум 6 символов' },
                { status: 400 }
            );
        }

        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        ) as [User[], unknown];

        if (rows.length === 0) {
            // Changed from returning null to returning a proper response
            return NextResponse.json(
                { success: false, error: 'Пользователь не найден' },
                { status: 404 }
            );
        }

        const user = rows[0];

        const isValidPassword = await verifyPassword(password, user.password);
        if (!isValidPassword) {
            return NextResponse.json(
                { success: false, error: 'Неверные учетные данные' },
                { status: 401 }
            );
        }

        const hashedPassword = await hashPassword(newPassword);

        // Обновляем пароль пользователя
        await connection.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, user.id]
        );

        await connection.commit();

        return NextResponse.json({
            success: true,
            message: 'Пароль успешно изменен'
        }, { status: 200 });

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