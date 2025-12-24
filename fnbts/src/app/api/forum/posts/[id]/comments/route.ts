// src/app/api/forum/posts/[id]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/forum';
import pool from '@/lib/database';

// Типы для базы данных
interface Comment {
    id: number;
    author: string;
    text: string;
    postID: number;
    count: number;
    date: string;
    time: string;
    answerTo?: number | null;
    answerToUser?: string | null;
}

interface DatabaseResult {
    insertId: number;
    affectedRows: number;
}

interface CreateCommentRequest {
    author: string;
    text: string;
    authorId: number;
    answerTo?: number | null;
    answerToUser?: string | null;
}

interface RouteParams {
    params: Promise<{
        id: string;
    }>
}

interface PointsResult {
    points: number;
}

// GET - получение комментариев для поста
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const postId = parseInt(id);
        console.log('🔍 Fetching comments for post:', postId);

        if (isNaN(postId)) {
            return NextResponse.json(
                { success: false, error: 'Неверный ID поста' },
                { status: 400 }
            );
        }

        // Получаем комментарии из базы данных
        const [comments] = await pool.execute(
            `SELECT * FROM answers WHERE postID = ? ORDER BY date DESC, time DESC`,
            [postId]
        ) as [Comment[], unknown];

        console.log('✅ Comments found:', comments?.length || 0);

        const response: ApiResponse<{ comments: Comment[] }> = {
            success: true,
            data: {
                comments: comments || []
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('💥 Error fetching comments:', error);

        const errorDetails = error instanceof Error ? {
            message: error.message,
            stack: error.stack
        } : {};

        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при загрузке комментариев',
                details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
            },
            { status: 500 }
        );
    }
}

// POST - создание нового комментария
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const postId = parseInt(id);
        const { author, text, authorId = null, answerTo = null, answerToUser = null } = await request.json() as CreateCommentRequest;

        if (isNaN(postId)) {
            return NextResponse.json(
                { success: false, error: 'Неверный ID поста' },
                { status: 400 }
            );
        }

        if (!author || !text) {
            return NextResponse.json(
                { success: false, error: 'Все поля обязательны для заполнения' },
                { status: 400 }
            );
        }

        // Генерируем текущую дату и время
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0];

        console.log('📊 Inserting comment with data:', {
            author, text, postId, date, time, answerTo
        });

        // Вставляем комментарий в базу данных
        const [result] = await pool.execute(
            `INSERT INTO answers (author, text, postID, authorId, date, time, answerTo, answerToUser)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                author,
                text,
                postId,
                authorId,
                date,
                time,
                answerTo, // Может быть null (корневой) или number (ответ)
                answerToUser,
            ]
        ) as [DatabaseResult, unknown];

        const [points] = await pool.execute(
            'SELECT points FROM users WHERE username = ?',
            [author]
        ) as [PointsResult[], unknown];

        const userPoints = points[0].points + 1;

        const [setUserPoints] = await pool.execute(
            'UPDATE users SET points = ? WHERE username = ?',
            [userPoints, author]
        ) as [PointsResult[], unknown];

        console.log('✅ Comment created successfully, ID:', result.insertId);

        const response: ApiResponse<{ commentId: number }> = {
            success: true,
            message: answerTo ? 'Ответ добавлен' : 'Комментарий успешно добавлен',
            data: {
                commentId: result.insertId
            }
        };

        return NextResponse.json(response, { status: 201 });

    } catch (error) {
        console.error('💥 Error creating comment:', error);

        let errorMessage = 'Ошибка при создании комментария';

        if (error instanceof Error) {
            const errorMessageLower = error.message.toLowerCase();

            if (errorMessageLower.includes('referenced') || errorMessageLower.includes('foreign key')) {
                errorMessage = 'Родительский комментарий не найден';
            } else if (errorMessageLower.includes('database') || errorMessageLower.includes('sql')) {
                errorMessage = 'Ошибка базы данных';
            }
        }

        return NextResponse.json(
            {
                success: false,
                error: errorMessage
            },
            { status: 500 }
        );
    }
}