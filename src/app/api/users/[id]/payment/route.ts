// src/app/api/users/[id]/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import crypto from "crypto";

// Типы для базы данных
interface PaymentTokenRequest {
    token: string;
}

interface DatabaseResult {
    affectedRows: number;
    insertId?: number;
}

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

export async function POST (
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const userId = parseInt(id);

        const data = await request.json();
        const token = data.token

        if (isNaN(userId)) {
            return new NextResponse('Invalid user ID', { status: 400 });
        }

        const connection = await pool.getConnection();

        try {
            const [rows] = await connection.execute(
                'SELECT token FROM payment_tokens WHERE userId = ? AND token = ?',
                [userId, token]
            ) as [PaymentTokenRequest[], unknown];

            if (rows.length === 0) {
                return new NextResponse('Forbidden', { status: 403 });
            }

            const [deleteToken] = await connection.execute(
                'DELETE FROM payment_tokens WHERE token = ?',
                [token]
            ) as [DatabaseResult[], unknown];

            if (deleteToken.length === 0) {
                return new NextResponse('Token not found', { status: 404 });
            }

            return NextResponse.json({
                success: true,
                message: 'Токен валидный'
            }, { status: 200 });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('GET /api/payment/ error:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                error: 'Требуется авторизация'
            }, { status: 401 });
        }

        const { id } = await params;
        const userId = parseInt(id);

        if (isNaN(userId)) {
            return NextResponse.json({
                error: 'Неверный ID пользователя'
            }, { status: 400 });
        }

        const paymentToken = crypto.randomBytes(32).toString('hex');

        // Обновляем запись в базе данных
        const connection = await pool.getConnection();

        try {
            const [result] = await connection.execute(
                'INSERT INTO payment_tokens (token, userId) VALUES (?, ?)',
                [paymentToken, userId]
            ) as [DatabaseResult, unknown];

            if (result.affectedRows === 0) {
                return NextResponse.json({
                    error: 'Что-то пошло не так'
                }, { status: 500 });
            }

            const [tokenId] = await connection.execute(
                'SELECT id FROM payment_tokens WHERE token = ?',
                [paymentToken]
            ) as [PaymentTokenRequest[], unknown];

            return NextResponse.json({
                success: true,
                data: {
                    token: paymentToken,
                    tokenId: tokenId[0]
                },
                message: 'Токен создан'
            }, { status: 200 });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('POST /api/payment error:', error);

        return NextResponse.json({
            error: 'Ошибка при создании токена'
        }, { status: 500 });
    }
}