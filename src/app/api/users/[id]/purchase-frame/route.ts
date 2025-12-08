// src/app/api/users/[id]/purchase-frame/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

interface User {
    points: number;
    id?: number;
}

interface UserFrame {
    id: number;
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
        const { frameId, pointsCost, author } = body;

        if (!frameId || pointsCost === undefined) {
            return NextResponse.json({
                success: false,
                error: 'Missing frameId or pointsCost'
            }, { status: 400 });
        }

        // Начинаем транзакцию
        await connection.beginTransaction();

        try {
            // Проверяем текущие баллы пользователя
            const [userRows] = await connection.execute(
                'SELECT points FROM users WHERE id = ?',
                [userId]
            );

            const users = userRows as User[];
            if (users.length === 0) {
                await connection.rollback();
                return NextResponse.json({
                    success: false,
                    error: 'User not found'
                }, { status: 404 });
            }

            const currentPoints = users[0].points;
            if (currentPoints < pointsCost) {
                await connection.rollback();
                return NextResponse.json({
                    success: false,
                    error: 'Insufficient points'
                }, { status: 400 });
            }

            // Проверяем, не куплена ли уже рамка
            const [existingFrames] = await connection.execute(
                'SELECT id FROM user_frames WHERE user_id = ? AND frame_id = ?',
                [userId, frameId]
            );

            const frames = existingFrames as UserFrame[];
            if (frames.length > 0) {
                await connection.rollback();
                return NextResponse.json({
                    success: false,
                    error: 'Frame already purchased'
                }, { status: 400 });
            }

            // Списываем баллы
            await connection.execute(
                'UPDATE users SET points = points - ? WHERE id = ?',
                [pointsCost, userId]
            );

            // Добавляем рамку пользователю
            await connection.execute(
                'INSERT INTO user_frames (user_id, frame_id, purchased_at) VALUES (?, ?, NOW())',
                [userId, frameId]
            );

            await connection.execute(
                `INSERT INTO transactions
                 (user_id, type, amount, currency_type, description)
                 VALUES (?, 'frame_purchase', ?, ?, ?)`,
                [
                    userId,
                    pointsCost,
                    'frame',
                    `Покупка рамки #${frameId}`
                ]
            );

            if (author) {
                const royalty = Math.floor(pointsCost - (pointsCost * 0.6))
                const [userData] = await connection.execute(
                    'SELECT id FROM users WHERE username = ?',
                    [author]
                );
                const userInfoArray = userData as User[];
                const userInfo = userInfoArray[0];
                const authorId = userInfo.id
                if (!authorId) {
                    return NextResponse.json({
                        success: false,
                        message: 'Не удалось записать роялти автора'
                    }, {status: 500})
                }
                await connection.execute(
                    'UPDATE users SET points = points + ? WHERE id = ?',
                    [royalty, authorId]
                );
                await connection.execute(
                    `INSERT INTO transactions
                 (user_id, type, amount, currency_type, description)
                 VALUES (?, 'frame_sale', ?, ?, ?)`,
                    [
                        authorId,
                        royalty,
                        'frame',
                        `Продажа рамки #${frameId}: процент от продажи ${royalty} поинтов`,
                    ]
                );
            }

            await connection.commit();

            return NextResponse.json({
                success: true,
                message: 'Frame purchased successfully',
                newPoints: currentPoints - pointsCost
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Error purchasing frame:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error'
            },
            { status: 500 }
        );
    } finally {
        if (connection) {
            connection.release();
        }
    }
}