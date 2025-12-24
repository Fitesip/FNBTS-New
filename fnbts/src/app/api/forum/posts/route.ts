// src/app/api/forum/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, CreatePostRequest, ForumPost } from '@/types/forum';
import pool from '@/lib/database';

// Типы для базы данных
interface DatabaseResult {
    insertId: number;
    affectedRows: number;
}

interface CountResult {
    total: number;
}

interface PointsResult {
    points: number;
}

export async function GET(request: NextRequest) {
    console.log('🔍 API: Getting all posts');

    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        console.log('📊 Query parameters:', { page, limit, offset });

        // Получаем посты с пагинацией
        console.log('🚀 Executing posts query...');
        const [posts] = await pool.query(
            `SELECT * FROM forum
             ORDER BY date DESC, time DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        ) as [ForumPost[], unknown];

        console.log('✅ Posts query successful, found:', posts?.length || 0);

        // Получаем общее количество постов для пагинации
        console.log('🚀 Executing count query...');
        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM forum'
        ) as [CountResult[], unknown];

        const total = countResult[0]?.total || 0;
        console.log('✅ Total posts count:', total);

        const response: ApiResponse<{ posts: ForumPost[], total: number, page: number }> = {
            success: true,
            data: {
                posts: posts || [],
                total,
                page
            }
        };

        console.log('🎉 Successfully returning posts');
        return NextResponse.json(response);

    } catch (error) {
        console.error('💥 Error in posts API:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при загрузке постов',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    console.log('📝 API: Creating new post');

    try {
        const body: CreatePostRequest = await request.json();

        console.log('📥 Received post data:', body);

        // Валидация обязательных полей
        if (!body.author || !body.title || !body.text) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Все поля обязательны для заполнения'
                },
                { status: 400 }
            );
        }

        // Проверка длины заголовка и текста
        if (body.title.length > 200) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Заголовок не должен превышать 200 символов'
                },
                { status: 400 }
            );
        }

        if (body.text.length > 5000) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Текст поста не должен превышать 5000 символов'
                },
                { status: 400 }
            );
        }

        // Генерируем текущую дату и время, если не переданы
        const now = new Date();
        const date = body.date || now.toISOString().split('T')[0]; // "YYYY-MM-DD"
        const time = body.time || now.toTimeString().split(' ')[0]; // "HH:MM:SS"

        console.log('📊 Prepared data:', {
            author: body.author,
            title: body.title,
            text: body.text,
            date,
            time
        });

        // Вставляем новый пост в базу данных
        const [result] = await pool.execute(
            `INSERT INTO forum (author, title, text, date, time, likes, likeAuthors)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                body.author,
                body.title,
                body.text,
                date,
                time,
                0, // начальное количество лайков
                '[]' // пустой массив лайков в JSON
            ]
        ) as [DatabaseResult, unknown];

        console.log('✅ Post created successfully, ID:', result.insertId);

        const [points] = await pool.execute(
            'SELECT points FROM users WHERE username = ?',
            [body.author]
        ) as [PointsResult[], unknown];

        const userPoints = points[0].points + 1;

        const [setUserPoints] = await pool.execute(
            'UPDATE users SET points = ? WHERE username = ?',
            [userPoints, body.author]
        ) as [PointsResult[], unknown];

        // Получаем созданный пост для возврата
        const [posts] = await pool.execute(
            'SELECT * FROM forum WHERE id = ?',
            [result.insertId]
        ) as [ForumPost[], unknown];

        const createdPost = posts[0];

        if (!createdPost) {
            throw new Error('Failed to retrieve created post');
        }

        const response: ApiResponse<{ post: ForumPost }> = {
            success: true,
            data: {
                post: createdPost
            }
        };

        return NextResponse.json(response, { status: 201 });

    } catch (error) {
        console.error('💥 Error creating post:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при создании поста',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            },
            { status: 500 }
        );
    }
}