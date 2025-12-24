// src/app/api/users/[id]/admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/database';
import pool from '@/lib/database';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

interface DatabaseResult {
    affectedRows: number;
    changedRows: number;
}

interface UserRecord {
    id: number;
}

export async function POST(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
    console.log('🔧 API: Admin updating user');

    try {
        const { id } = await params;
        const userId = parseInt(id);

        console.log('📝 Updating user ID:', userId);

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
                error: 'Неверный ID пользователя'
            }, { status: 400 });
        }

        const formData = await request.formData();
        const points = formData.get('points') as string;
        const role = formData.get('role') as string;

        console.log('📥 Received update data:', { points, role });

        // Валидация данных
        if (!points || !role) {
            return NextResponse.json({
                success: false,
                error: 'Необходимо указать points и role'
            }, { status: 400 });
        }

        const pointsValue = parseInt(points);
        if (isNaN(pointsValue) || pointsValue < 0) {
            return NextResponse.json({
                success: false,
                error: 'Points должны быть положительным числом'
            }, { status: 400 });
        }

        const validRoles = ['Игрок', 'Креатор', 'Администратор', 'Гл. Администратор'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({
                success: false,
                error: 'Некорректная роль'
            }, { status: 400 });
        }

        // Проверяем существование пользователя
        const [userCheck] = await pool.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        ) as [UserRecord[], unknown];

        if (userCheck.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Пользователь не найден'
            }, { status: 404 });
        }

        // Обновляем пользователя
        console.log('🚀 Executing user update...');
        const [result] = await pool.execute(
            'UPDATE users SET points = ?, role = ? WHERE id = ?',
            [pointsValue, role, userId]
        ) as [DatabaseResult, unknown];

        console.log('✅ Update result:', result);

        if (result.affectedRows === 0) {
            return NextResponse.json({
                success: false,
                error: 'Не удалось обновить пользователя'
            }, { status: 500 });
        }

        const response: ApiResponse = {
            success: true,
            message: 'Данные пользователя успешно обновлены!'
        };

        console.log('🎉 User updated successfully');
        return NextResponse.json(response);

    } catch (error) {
        console.error('💥 Error in admin user update API:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при обновлении пользователя',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            },
            { status: 500 }
        );
    }
}