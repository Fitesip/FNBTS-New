// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { User, ApiResponse } from '@/types/database';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

interface MySQLFieldPacket {
    catalog: string;
    db: string;
    table: string;
    orgTable: string;
    name: string;
    orgName: string;
    charsetNr: number;
    length: number;
    type: number;
    flags: number;
    decimals: number;
    default?: unknown;
    zeroFill: boolean;
    protocol41: boolean;
}

interface QueryResult {
    affectedRows: number;
    changedRows: number;
}

export async function POST(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse<ApiResponse<User>>> {
    try {
        const { id } = await params;
        const userId = parseInt(id);

        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Требуется авторизация'
            }, { status: 401 });
        }

        if (isNaN(userId)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid user ID'
            }, { status: 400 });
        }

        const formData = await request.formData();
        const status = formData.get('status') as string;

        if (!status) {
            return NextResponse.json({
                success: false,
                error: 'Неизвестная ошибка'
            }, { status: 400 });
        }

        const [result] = await pool.execute(
            'UPDATE users SET status = ? WHERE id = ?',
            [status, userId]
        ) as unknown as [QueryResult, MySQLFieldPacket[]];

        if (result.affectedRows === 0) {
            return NextResponse.json({
                success: false,
                error: 'Пользователь не найден'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Статус успешно изменён!'
        }, { status: 200 });

    } catch (error: unknown) {
        console.error('POST /api/users/[id] error:', error);
        return NextResponse.json({
            success: false,
            error: 'Ошибка сервера, попробуйте позже'
        }, { status: 500 });
    }
}