// src/app/api/users/[id]/purchase-currency/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    let connection;
    try {
        connection = await pool.getConnection();
        const { id } = await params;
        const userId = parseInt(id);

        if (isNaN(userId)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid user ID'
            }, { status: 400 });
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Требуется авторизация'
            }, { status: 401 });
        }

        const body = await request.json();
        const { points, packageId } = body;

        // Начинаем транзакцию
        await connection.beginTransaction();

        try {
            // Обновляем баллы пользователя
            await connection.execute(
                'UPDATE users SET points = points + ? WHERE id = ?',
                [points, userId]
            );


            // Записываем транзакцию в историю
            await connection.execute(
                `INSERT INTO transactions
                 (user_id, type, amount, currency_type, description)
                 VALUES (?, 'points_purchase', ?, 'points', ?)`,
                [
                    userId,
                    points,
                    `Покупка набора поинтов #${packageId}: ${points} поинтов`
                ]
            );

            await connection.commit();

            return NextResponse.json({
                success: true,
                message: 'Поинты успешно приобретены',
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Currency purchase error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при покупке поинтов'
            },
            { status: 500 }
        );
    } finally {
        if (connection) {
            connection.release();
        }
    }
}