// src/app/api/admin/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

interface Transaction {
    id: number
    user_id: number
    type: 'hleb&sfl' | 'hleb' | 'sfl' | 'points'
    amount: number
    currency_type: string
    description: string
    created_at: string
}

interface CountResult {
    total: number;
}

export async function GET(request: NextRequest) {
    console.log('🔍 API: Getting transactions for admin panel');

    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';
        const offset = (page - 1) * limit;

        console.log('📊 Query parameters:', { page, limit, offset, search });

        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Требуется авторизация'
            }, { status: 401 });
        }

        let transactions: Transaction[] = [];
        let total = 0;

        if (search) {
            if (!isNaN(parseInt(search))) {
                // Поиск по ID пользователя
                const [transactionsResult] = await pool.query(
                    `SELECT 
            id, user_id, type, amount, currency_type, description, datetime
          FROM transactions 
          WHERE user_id = ?
          ORDER BY datetime DESC, id DESC
          LIMIT ? OFFSET ?`,
                    [parseInt(search), limit, offset]
                ) as [Transaction[], unknown];

                const [countResult] = await pool.query(
                    'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?',
                    [parseInt(search)]
                ) as [CountResult[], unknown];

                transactions = transactionsResult || [];
                total = countResult[0]?.total || 0;

            } else {
                // Поиск по описанию
                const [transactionsResult] = await pool.query(
                    `SELECT 
            id, user_id, type, amount, currency_type, description, datetime
          FROM transactions 
          WHERE description LIKE ?
          ORDER BY datetime DESC, id DESC
          LIMIT ? OFFSET ?`,
                    [`%${search}%`, limit, offset]
                ) as [Transaction[], unknown];

                const [countResult] = await pool.query(
                    'SELECT COUNT(*) as total FROM transactions WHERE description LIKE ?',
                    [`%${search}%`]
                ) as [CountResult[], unknown];

                transactions = transactionsResult || [];
                total = countResult[0]?.total || 0;
            }
        } else {
            // Все транзакции без поиска
            const [transactionsResult] = await pool.query(
                `SELECT 
          id, user_id, type, amount, currency_type, description, datetime
        FROM transactions 
        ORDER BY datetime DESC, id DESC
        LIMIT ? OFFSET ?`,
                [limit, offset]
            ) as [Transaction[], unknown];

            const [countResult] = await pool.query(
                'SELECT COUNT(*) as total FROM transactions'
            ) as [CountResult[], unknown];

            transactions = transactionsResult || [];
            total = countResult[0]?.total || 0;
        }

        const response = {
            success: true,
            transactions,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };

        console.log('🎉 Successfully returning transactions:', transactions.length);
        return NextResponse.json(response);

    } catch (error) {
        console.error('💥 Error in admin transactions API:', error);

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