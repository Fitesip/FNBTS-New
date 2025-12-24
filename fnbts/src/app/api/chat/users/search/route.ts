// src/app/api/chat/users/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/server-auth';

// Типы для базы данных
interface User {
    id: number;
    username: string;
    photo?: string;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

interface SearchResponse {
    users: User[];
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<SearchResponse>>> {
    try {
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';

        if (!query.trim()) {
            return NextResponse.json({
                success: true,
                data: { users: [] }
            });
        }

        const connection = await pool.getConnection();

        try {
            console.log('🔍 Searching user with query:', query);
            console.log('👤 Current user ID:', userId);

            // Ищем пользователя по точному или частичному совпадению username
            const [users] = await connection.execute(
                `SELECT
                     id,
                     username,
                     photo
                 FROM users
                 WHERE username LIKE ?
                   AND id != ?
                 ORDER BY username
                 LIMIT 1`,
                [`%${query}%`, userId]
            ) as [User[], unknown];

            console.log('✅ Found users:', users);

            return NextResponse.json({
                success: true,
                data: {
                    users: users.map((user: User) => ({
                        id: user.id,
                        username: user.username,
                        photo: user.photo || ''
                    }))
                }
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('💥 Search users error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json(
            { success: false, error: 'Search failed: ' + errorMessage },
            { status: 500 }
        );
    }
}