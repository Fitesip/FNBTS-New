// src/app/api/news/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, News } from '@/types/news';
import pool from '@/lib/database';
import { RowDataPacket } from 'mysql2';

interface NewsRow extends RowDataPacket, News {}

interface RouteParams {
    params: Promise<{
        id: string;
    }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const newsId = parseInt(id);

        if (isNaN(newsId)) {
            return NextResponse.json(
                { success: false, error: 'Неверный ID новости' },
                { status: 400 }
            );
        }

        const [news] = await pool.execute<NewsRow[]>(
            'SELECT * FROM news WHERE id = ?',
            [newsId]
        );

        if (news.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Новость не найдена' },
                { status: 404 }
            );
        }

        const response: ApiResponse<{ news: News }> = {
            success: true,
            data: {
                news: news[0]
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error fetching news:', error);
        return NextResponse.json(
            { success: false, error: 'Ошибка при загрузке новости' },
            { status: 500 }
        );
    }
}