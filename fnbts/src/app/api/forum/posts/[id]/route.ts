// src/api/forum/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, ForumPost } from '@/types/forum';
import pool from '@/lib/database';
import { RowDataPacket } from 'mysql2';

interface PostRow extends RowDataPacket, ForumPost {}

interface RouteParams {
    params: Promise<{
        id: string;
    }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const postId = parseInt(id);

        if (isNaN(postId)) {
            return NextResponse.json(
                { success: false, error: 'Неверный ID поста' },
                { status: 400 }
            );
        }

        const [posts] = await pool.execute<PostRow[]>(
            'SELECT * FROM forum WHERE id = ?',
            [postId]
        );

        if (posts.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Пост не найден' },
                { status: 404 }
            );
        }

        const response: ApiResponse<{ post: ForumPost }> = {
            success: true,
            data: {
                post: posts[0]
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error fetching post:', error);
        return NextResponse.json(
            { success: false, error: 'Ошибка при загрузке поста' },
            { status: 500 }
        );
    }
}