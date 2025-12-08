// src/app/api/users/[id]/ban/route.ts
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database'
import { ApiResponse } from '@/types/database'

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

interface DatabaseResult {
    affectedRows: number;
    changedRows: number;
}

export async function POST(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
    try {
        const { id } = await params
        const userId = parseInt(id)

        const authHeader = request.headers.get('authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Требуется авторизация'
            }, { status: 401 })
        }

        if (isNaN(userId)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid user ID'
            }, { status: 400 })
        }

        const data = await request.json()
        const banned = data.isBlocked as string

        if (!banned) {
            return NextResponse.json({
                success: false,
                error: 'Необходимо указать статус блокировки'
            }, { status: 400 })
        }

        const bannedValue = banned === 'true';

        const [result] = await pool.execute(
            'UPDATE users SET isBlocked = ? WHERE id = ?',
            [bannedValue, userId]
        ) as [DatabaseResult, unknown]

        if (result.affectedRows === 0) {
            return NextResponse.json({
                success: false,
                error: 'Пользователь не найден'
            }, { status: 404 })
        }

        const action = bannedValue ? 'заблокирован' : 'разблокирован'

        return NextResponse.json({
            success: true,
            message: `Пользователь успешно ${action}!`
        }, { status: 200 })

    } catch (error: unknown) {
        console.error('POST /api/users/[id]/ban error:', error)
        return NextResponse.json({
            success: false,
            error: 'Ошибка сервера, попробуйте позже'
        }, { status: 500 })
    }
}