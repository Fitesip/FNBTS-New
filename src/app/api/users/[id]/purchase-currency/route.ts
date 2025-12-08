// src/app/api/users/[id]/purchase-currency/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

interface User {
    points: number;
    username?: string;
    id?: number;
}

interface Wallet {
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
        const { packageId, hleb, sfl, pointsCost, author } = body;

        // Проверяем достаточно ли баллов у пользователя
        const [userResult] = await connection.execute(
            'SELECT points FROM users WHERE id = ?',
            [userId]
        );

        const users = userResult as User[];
        const user = users[0];
        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Пользователь не найден'
            }, { status: 404 });
        }

        if (user.points < pointsCost) {
            return NextResponse.json({
                success: false,
                error: 'Недостаточно баллов'
            }, { status: 400 });
        }

        // Начинаем транзакцию
        await connection.beginTransaction();

        try {
            // Обновляем баллы пользователя
            await connection.execute(
                'UPDATE users SET points = points - ? WHERE id = ?',
                [pointsCost, userId]
            );

            let currency_type = ''
            if (hleb > 0 && sfl > 0) {
                currency_type = 'hleb&sfl';
            }
            if (hleb > 0 && sfl == 0) {
                currency_type = 'hleb';
            }
            if (hleb == 0 && sfl > 0) {
                currency_type = 'sfl';
            }

            if (author) {
                const royalty = Math.floor(pointsCost - (pointsCost * 0.8))
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
                 VALUES (?, 'currency_sale', ?, ?, ?)`,
                    [
                        authorId,
                        royalty,
                        currency_type,
                        `Продажа набора валюты #${packageId}: процент от продажи ${royalty} поинтов`,
                    ]
                );
            }

            // Проверяем существует ли кошелек пользователя
            const [walletResult] = await connection.execute(
                'SELECT id FROM wallet WHERE id = ?',
                [userId]
            );

            // Получаем данные пользователя для обновления username
            const [userData] = await connection.execute(
                'SELECT username FROM users WHERE id = ?',
                [userId]
            );
            const userInfoArray = userData as User[];
            const userInfo = userInfoArray[0];

            const wallets = walletResult as Wallet[];
            if (wallets.length === 0) {
                return NextResponse.json({
                    success: false,
                    error: 'Кошелёк не прикреплён к профилю'
                }, { status: 400 });
            } else {
                // Обновляем существующий кошелек
                await connection.execute(
                    `UPDATE wallet
                     SET
                         hleb = hleb + ?,
                         sfl = sfl + ?,
                         username = COALESCE(?, username)
                     WHERE id = ?`,
                    [
                        hleb,
                        sfl,
                        userInfo.username || '',
                        userId
                    ]
                );
            }


            // Записываем транзакцию в историю
            await connection.execute(
                `INSERT INTO transactions
                 (user_id, type, amount, currency_type, description)
                 VALUES (?, 'currency_purchase', ?, ?, ?)`,
                [
                    userId,
                    pointsCost,
                    currency_type,
                    `Покупка набора валюты #${packageId}: ${hleb} хлеба, ${sfl} СФЛ`
                ]
            );

            await connection.commit();

            return NextResponse.json({
                success: true,
                message: 'Валюта успешно приобретена',
                newBalance: {
                    points: user.points - pointsCost,
                    hleb: hleb,
                    sfl: sfl,
                }
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
                error: 'Ошибка при покупке валюты'
            },
            { status: 500 }
        );
    } finally {
        if (connection) {
            connection.release();
        }
    }
}