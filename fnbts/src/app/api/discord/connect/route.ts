// src/app/api/discord/connect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import pool from "@/lib/database";

interface DiscordConnectRequest {
    userId: number;
    username: string; // username с сайта
}

interface Username {
    username: string;
}

// Генерация 6-значного кода
function generateVerificationCode(): string {
    return randomInt(100000, 999999).toString();
}

export async function POST(request: NextRequest) {
    try {
        const { username }: DiscordConnectRequest = await request.json();

        const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json(
                { success: false, error: 'Требуется авторизация' },
                { status: 401 }
            );
        }

        // Валидация входных данных
        if (!username) {
            return NextResponse.json({
                success: false,
                error: 'Все поля обязательны для заполнения'
            }, { status: 400 });
        }

        // Генерация кода подтверждения
        const verificationCode = generateVerificationCode();

        try {
            // 1. Проверяем, не привязан ли уже этот username к Discord в wallet
            const [existingWallet] = await pool.execute(
                'SELECT username FROM wallet WHERE username = ?',
                [username]
            ) as [Username[], unknown];

            if (existingWallet.length > 0 && existingWallet[0].username) {
                return NextResponse.json({
                    success: false,
                    error: 'Этот аккаунт уже привязан к Discord'
                }, { status: 409 });
            }

            // 2. Записываем данные в fnbts_discordconnect
            const [discordResult] = await pool.execute(
                `INSERT INTO discordconnect (username, code) 
                VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE 
                username = ?, code = ?`,
                       [username, verificationCode, username, verificationCode]
                   );

            return NextResponse.json({
                success: true,
                data: {
                    verificationCode,
                    username
                },
                message: `Код подтверждения создан. Используйте команду "/подтвердить ${username} ${verificationCode}" в Discord.`
            }, { status: 200 });

        }
        catch (error) {
            console.error('POST /api/discord/connect error:', error);
            return NextResponse.json({
                success: false,
                error: 'Ошибка при создании кода подтверждения'
            }, {status: 500});
        }
    }
    catch (error) {
        console.error('POST /api/discord/connect error:', error);
        return NextResponse.json({
            success: false,
            error: 'Ошибка при создании кода подтверждения'
        }, {status: 500});
    }
}