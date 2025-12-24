// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { ApiResponse, User } from '@/types/database';
import pool from "@/lib/database";

// Тип для пользователя без пароля
type UserWithoutPassword = Omit<User, 'password'>;

// Предполагаем, что у вас есть функция для поиска пользователя по ID
async function findUserById(id: number): Promise<UserWithoutPassword | null> {
    try {
        const [rows] = await pool.execute(
            'SELECT id, email, username, status, regDate, role, email_verified, points, isBlocked, discordConnected FROM users WHERE id = ?',
            [id]
        ) as [UserWithoutPassword[], unknown];

        if (rows.length === 0) {
            return null;
        }

        return rows[0];
    } catch (error) {
        console.error('Error finding user by ID:', error);
        return null;
    }
}


export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Токен не предоставлен' },
                { status: 401 }
            );
        }

        const decoded = verifyAccessToken(token);
        if (!decoded) {
            return NextResponse.json(
                { success: false, error: 'Неверный токен' },
                { status: 401 }
            );
        }

        // Получение данных пользователя
        const user = await findUserById(decoded.userId);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Пользователь не найден' },
                { status: 404 }
            );
        }

        const response: ApiResponse<{ user: UserWithoutPassword }> = {
            success: true,
            data: { user }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Me endpoint error:', error);
        return NextResponse.json(
            { success: false, error: 'Ошибка сервера' },
            { status: 500 }
        );
    }
}