// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, User } from '@/types/database';
import pool from '@/lib/database';

// Типы для базы данных
interface CountResult {
    total: number;
}

export async function GET(request: NextRequest) {
    console.log('🔍 API: Getting users for admin panel');

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

        let users: User[] = [];
        let total = 0;

        if (search) {
            // Поиск пользователей
            if (!isNaN(parseInt(search))) {
                console.log('🔍 Searching user by ID:', parseInt(search));

                // Поиск по ID
                const [usersResult] = await pool.query(
                    `SELECT 
                        id, username, email, regDate, role, userRank, 
                        status, photo, banner, frame, points, verify, email_verified, isBlocked
                    FROM users 
                    WHERE id = ?
                    ORDER BY id DESC
                    LIMIT ? OFFSET ?`,
                    [parseInt(search), limit, offset]
                ) as [User[], unknown];

                const [countResult] = await pool.query(
                    'SELECT COUNT(*) as total FROM users WHERE id = ?',
                    [parseInt(search)]
                ) as [CountResult[], unknown];

                users = usersResult || [];
                total = countResult[0]?.total || 0;

                console.log('✅ Found users by ID:', users.length);

            } else {
                console.log('🔍 Searching user by username:', search);

                // Поиск по username
                const [usersResult] = await pool.query(
                    `SELECT 
                        id, username, email, regDate, role, userRank, 
                        status, photo, banner, frame, points, verify, email_verified, isBlocked
                    FROM users 
                    WHERE username LIKE ?
                    ORDER BY id DESC
                    LIMIT ? OFFSET ?`,
                    [`%${search}%`, limit, offset]
                ) as [User[], unknown];

                const [countResult] = await pool.query(
                    'SELECT COUNT(*) as total FROM users WHERE username LIKE ?',
                    [`%${search}%`]
                ) as [CountResult[], unknown];

                users = usersResult || [];
                total = countResult[0]?.total || 0;

                console.log('✅ Found users by username:', users.length);
            }
        } else {
            // Все пользователи без поиска
            console.log('🔍 Getting all users');

            const [usersResult] = await pool.query(
                `SELECT 
                    id, username, email, regDate, role, userRank, 
                    status, photo, banner, frame, points, verify, email_verified, isBlocked
                FROM users 
                ORDER BY id DESC
                LIMIT ? OFFSET ?`,
                [limit, offset]
            ) as [User[], unknown];

            const [countResult] = await pool.query(
                'SELECT COUNT(*) as total FROM users'
            ) as [CountResult[], unknown];

            users = usersResult || [];
            total = countResult[0]?.total || 0;

            console.log('✅ Found all users:', users.length);
        }

        const response: ApiResponse<{
            users: User[],
            total: number,
            page: number,
            totalPages: number
        }> = {
            success: true,
            data: {
                users,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            }
        };

        console.log('🎉 Successfully returning users');
        return NextResponse.json(response);

    } catch (error) {
        console.error('💥 Error in admin users API:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при загрузке пользователей',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            },
            { status: 500 }
        );
    }
}