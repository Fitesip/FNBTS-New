// src/app/api/users/[id]/owned-frames/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

interface UserFrame {
    frame_id: number;
}

export async function GET(
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

        // Получаем купленные рамки пользователя
        const [userFrames] = await connection.execute(
            'SELECT frame_id FROM user_frames WHERE user_id = ?',
            [userId]
        );

        const frames = userFrames as UserFrame[];
        const ownedFrames = frames.map(row => row.frame_id);

        return NextResponse.json({
            success: true,
            ownedFrames: ownedFrames || []
        });

    } catch (error) {
        console.error('Error fetching owned frames:', error);
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