// src/app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';

interface Transaction {
    id: number
    user_id: number
    type: string
    amount: number
    currency_type: string
    description: string
    datetime: string
}

interface CountResult {
    total: number;
}

export async function GET(request: NextRequest) {
    console.log('🔍 API: Getting transactions for user');

    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Требуется авторизация'
            }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = verifyAccessToken(token);

        if (!decoded || !decoded.userId) {
            return NextResponse.json({
                success: false,
                error: 'Неверный токен авторизации'
            }, { status: 401 });
        }

        const userId = decoded.userId;

        // Получаем транзакции только для текущего пользователя
        const [transactionsResult] = await pool.query(
            `SELECT 
                id, user_id, type, amount, currency_type, description, datetime
            FROM transactions 
            WHERE user_id = ?
            ORDER BY datetime DESC, id DESC
            LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        ) as [Transaction[], unknown];

        // Получаем общее количество транзакций пользователя
        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?',
            [userId]
        ) as [CountResult[], unknown];

        const transactions = transactionsResult || [];
        const total = countResult[0]?.total || 0;

        const response = {
            success: true,
            transactions,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };

        console.log(`🎉 Successfully returning ${transactions.length} transactions for user ${userId}`);
        return NextResponse.json(response);

    } catch (error) {
        console.error('💥 Error in transactions API:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при загрузке транзакций',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            },
            { status: 500 }
        );
    }
}