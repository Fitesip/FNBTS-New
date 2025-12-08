// src/app/api/users/[id]/subscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, CreateNewsRequest, News } from '@/types/news';
import pool from '@/lib/database';
import {Resend} from "resend";

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

interface Subs {
    userId: number;
    type: string;
    username: string;
    email: string;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    console.log('🔍 API: Getting all news');

    try {
        const { id } = await params;
        const userId = parseInt(id);

        const [subs] = await pool.query(
            `SELECT * FROM subscribtions WHERE userId = ?`,
            [userId],
        ) as [Subs[], unknown];


        const response: ApiResponse<{ subs: Subs[] }> = {
            success: true,
            data: {
                subs: subs || [],

            }
        };

        return NextResponse.json(response);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при получении подписок',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {

    try {
        const body: Subs = await request.json();

        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Требуется авторизация'
            }, { status: 401 });
        }

        // Валидация обязательных полей
        if (!body.userId || !body.type || !body.username || !body.email) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Все поля обязательны для заполнения'
                },
                { status: 400 }
            );
        }

        // Вставляем новую новость в базу данных
        const [result] = await pool.execute(
            `INSERT INTO subscribtions (userId, type, username, email)
             VALUES (?, ?, ?, ?)`,
            [
                body.userId,
                body.type,
                body.username,
                body.email,
            ]
        ) as [Subs[], unknown];

        const response: ApiResponse<{ news: News }> = {
            success: true,
        };

        return NextResponse.json(response, { status: 201 });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при подписке',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {

    try {
        const body: Subs = await request.json();

        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Требуется авторизация'
            }, { status: 401 });
        }

        // Валидация обязательных полей
        if (!body.userId || !body.type) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Все поля обязательны для заполнения'
                },
                { status: 400 }
            );
        }

        const [result] = await pool.execute(
            `DELETE FROM subscribtions WHERE userId = ? AND type = ?`,
            [
                body.userId,
                body.type
            ]
        ) as [Subs[], unknown];

        const response: ApiResponse<{ news: News }> = {
            success: true,
        };

        return NextResponse.json(response, { status: 201 });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при отписке',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            },
            { status: 500 }
        );
    }
}

