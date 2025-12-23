// src/app/api/users/[id]/purchase-currency/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import {codes, frames} from "@/constants";

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

interface Code {
    code: string;
}

interface Wallet {
    id: number;
}

interface User {
    points: number;
    username?: string;
    id?: number;
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
        const { code } = body;

        const [userResult] = await connection.execute(
            'SELECT code FROM code_activations WHERE userId = ? AND code = ?',
            [userId, code]
        );

        const users = userResult as Code[];
        const user = users[0]

        if (user) {
            return NextResponse.json({
                success: false,
                error: 'Код уже активирован'
            }, { status: 400 });
        }

        // Начинаем транзакцию
        await connection.beginTransaction();
        const codeData = codes.find(f => f.code === code);
        if (!codeData) return NextResponse.json({
            success: false,
            error: 'Код не найден'
        }, {status: 404})

        try {
            // Обновляем баллы пользователя
            await connection.execute(
                'UPDATE users SET points = points + ? WHERE id = ?',
                [codeData.points, userId]
            );


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
                await connection.execute(
                    `UPDATE wallet
                     SET
                         hleb = hleb + ?,
                         sfl = sfl + ?,
                         username = COALESCE(?, username)
                     WHERE id = ?`,
                    [
                        codeData.hleb,
                        codeData.sfl,
                        userInfo.username || '',
                        userId
                    ]
                );
            }

            let currency_type = ''
            if (codeData.hleb > 0 && codeData.sfl > 0) {
                currency_type = 'hleb&sfl';
            }
            if (codeData.hleb > 0 && codeData.sfl == 0) {
                currency_type = 'hleb';
            }
            if (codeData.hleb == 0 && codeData.sfl > 0) {
                currency_type = 'sfl';
            }
            if (codeData.points > 0 && codeData.hleb == 0 && codeData.sfl > 0) {
                currency_type = 'sfl&points';
            }
            if (codeData.points > 0 && codeData.hleb > 0 && codeData.sfl == 0) {
                currency_type = 'hleb&points';
            }
            if (codeData.points > 0 && codeData.hleb > 0 && codeData.sfl > 0) {
                currency_type = 'hleb&sfl&points';
            }

            await connection.execute(
                'INSERT INTO code_activations (userId, code) VALUES (?, ?)',
                [userId, code]
            );
            // Записываем транзакцию в историю
            await connection.execute(
                `INSERT INTO transactions
                 (user_id, type, amount, currency_type, description)
                 VALUES (?, 'code_activation', ?, ?, ?)`,
                [
                    userId,
                    codeData.points,
                    currency_type,
                    `Активация промокода: ${codeData.points ? codeData.points + ' поинтов' : ''} ${codeData.hleb ? codeData.hleb + ' хлеба' : ''} ${codeData.sfl ? codeData.sfl + ' сфл' : ''}`,
                ]
            );

            await connection.commit();

            return NextResponse.json({
                success: true,
                message: 'Код успешно применён',
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
                error: 'Ошибка при активации кода'
            },
            { status: 500 }
        );
    } finally {
        if (connection) {
            connection.release();
        }
    }
}