// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateTokens, saveRefreshToken, revokeAllUserTokens } from '@/lib/auth';
import { ApiResponse, User } from '@/types/database';
import { AuthResponse } from '@/types/auth';
import pool from "@/lib/database";


// Предполагаем, что у вас есть функция для поиска пользователя
async function findUserByEmail(email: string): Promise<User | null> {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        ) as [User[], unknown];

        if (rows.length === 0) {
            return null;
        }

        return rows[0];
    } catch (error) {
        console.error('Error finding user by email:', error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'Email и пароль обязательны' },
                { status: 400 }
            );
        }

        // Поиск пользователя
        const user = await findUserByEmail(email);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Неверные учетные данные' },
                { status: 401 }
            );
        }

        // Проверка пароля
        const isValidPassword = await verifyPassword(password, user.password);
        if (!isValidPassword) {
            return NextResponse.json(
                { success: false, error: 'Неверные учетные данные' },
                { status: 401 }
            );
        }

        await revokeAllUserTokens(user.id);

        // Генерация токенов
        const { accessToken, refreshToken } = generateTokens(user.id);

        const isTokenSaved = await saveRefreshToken(user.id, refreshToken);
        if (!isTokenSaved) {
            return NextResponse.json(
                { success: false, error: 'Ошибка создания сессии' },
                { status: 500 }
            );
        }

        // Убираем пароль из ответа с использованием деструктуризации
        const { password: __, ...userWithoutPassword } = user;

        const response: ApiResponse<AuthResponse> = {
            success: true,
            message: 'Успешный вход',
            data: {
                accessToken,
                refreshToken,
                user: userWithoutPassword,
                message: 'Успешный вход'
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, error: 'Ошибка сервера' },
            { status: 500 }
        );
    }
}