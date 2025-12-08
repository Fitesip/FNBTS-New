// src/app/api/forum/posts/[id]/like/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/forum';
import pool from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';

// Типы для базы данных
interface ForumPost {
    id: number;
    likes: number | string;
    dislikes: number | string;
    likeAuthors?: string;
    dislikeAuthors?: string;
}

interface User {
    username: string;
}

interface LikeActionRequest {
    action: 'like' | 'dislike';
}

interface LikeActionResponse {
    likes: number;
    dislikes: number;
    likeAuthors: string[];
    dislikeAuthors: string[];
    userLiked: boolean;
    userDisliked: boolean;
    action: string;
}

interface RouteParams {
    params: Promise<{
        id: string;
    }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        // Проверяем авторизацию
        const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json(
                { success: false, error: 'Требуется авторизация' },
                { status: 401 }
            );
        }

        const decoded = verifyAccessToken(accessToken);
        if (!decoded) {
            return NextResponse.json(
                { success: false, error: 'Невалидный токен' },
                { status: 401 }
            );
        }

        const userId = decoded.userId;
        console.log('✅ User authenticated:', userId);

        const { id } = await params;
        const postId = parseInt(id);

        if (isNaN(postId)) {
            return NextResponse.json(
                { success: false, error: 'Неверный ID поста' },
                { status: 400 }
            );
        }

        const { action } = await request.json() as LikeActionRequest;
        console.log('📝 Processing action:', action, 'for post:', postId);

        if (!action || (action !== 'like' && action !== 'dislike')) {
            return NextResponse.json(
                { success: false, error: 'Неверное действие' },
                { status: 400 }
            );
        }

        // Получаем текущий пост
        const [posts] = await pool.query(
            'SELECT * FROM forum WHERE id = ?',
            [postId]
        ) as [ForumPost[], unknown];

        if (posts.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Пост не найден' },
                { status: 404 }
            );
        }

        const post = posts[0];

        // Парсим массивы лайков и дизлайков
        let likeAuthors: string[] = [];
        let dislikeAuthors: string[] = [];

        try {
            likeAuthors = post.likeAuthors ? JSON.parse(post.likeAuthors) : [];
        } catch {
            likeAuthors = [];
        }

        try {
            dislikeAuthors = post.dislikeAuthors ? JSON.parse(post.dislikeAuthors) : [];
        } catch {
            dislikeAuthors = [];
        }

        // Получаем имя пользователя
        const [users] = await pool.query(
            'SELECT username FROM users WHERE id = ?',
            [userId]
        ) as [User[], unknown];

        if (users.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Пользователь не найден' },
                { status: 404 }
            );
        }

        const username = users[0].username;
        console.log('👤 Username for action:', username);

        let newLikes = typeof post.likes === 'string' ? parseInt(post.likes) || 0 : post.likes;
        let newDislikes = typeof post.dislikes === 'string' ? parseInt(post.dislikes) || 0 : post.dislikes;
        const newLikeAuthors = [...likeAuthors];
        const newDislikeAuthors = [...dislikeAuthors];

        const userLiked = newLikeAuthors.includes(username);
        const userDisliked = newDislikeAuthors.includes(username);

        console.log('📊 Current state:', {
            userLiked,
            userDisliked,
            likes: newLikes,
            dislikes: newDislikes
        });

        // Логика обработки действий
        if (action === 'like') {
            if (userLiked) {
                // Убираем лайк
                const userIndex = newLikeAuthors.indexOf(username);
                if (userIndex > -1) {
                    newLikeAuthors.splice(userIndex, 1);
                    newLikes = Math.max(0, newLikes - 1);
                    console.log('💔 Removing like from:', username);
                }
            } else {
                // Добавляем лайк
                newLikeAuthors.push(username);
                newLikes += 1;
                console.log('❤️ Adding like from:', username);

                // Если был дизлайк - убираем его
                if (userDisliked) {
                    const dislikeIndex = newDislikeAuthors.indexOf(username);
                    if (dislikeIndex > -1) {
                        newDislikeAuthors.splice(dislikeIndex, 1);
                        newDislikes = Math.max(0, newDislikes - 1);
                        console.log('💔 Removing dislike (replaced with like)');
                    }
                }
            }
        } else if (action === 'dislike') {
            if (userDisliked) {
                // Убираем дизлайк
                const userIndex = newDislikeAuthors.indexOf(username);
                if (userIndex > -1) {
                    newDislikeAuthors.splice(userIndex, 1);
                    newDislikes = Math.max(0, newDislikes - 1);
                    console.log('💔 Removing dislike from:', username);
                }
            } else {
                // Добавляем дизлайк
                newDislikeAuthors.push(username);
                newDislikes += 1;
                console.log('👎 Adding dislike from:', username);

                // Если был лайк - убираем его
                if (userLiked) {
                    const likeIndex = newLikeAuthors.indexOf(username);
                    if (likeIndex > -1) {
                        newLikeAuthors.splice(likeIndex, 1);
                        newLikes = Math.max(0, newLikes - 1);
                        console.log('💔 Removing like (replaced with dislike)');
                    }
                }
            }
        }

        // Обновляем пост в базе
        await pool.query(
            'UPDATE forum SET likes = ?, likeAuthors = ?, dislikes = ?, dislikeAuthors = ? WHERE id = ?',
            [
                newLikes,
                JSON.stringify(newLikeAuthors),
                newDislikes,
                JSON.stringify(newDislikeAuthors),
                postId
            ]
        );

        console.log('✅ Action completed:', {
            postId,
            action,
            newLikes,
            newDislikes,
            likeCount: newLikeAuthors.length,
            dislikeCount: newDislikeAuthors.length
        });

        const response: ApiResponse<LikeActionResponse> = {
            success: true,
            message: action === 'like'
                ? (userLiked ? 'Лайк удален' : 'Лайк добавлен')
                : (userDisliked ? 'Дизлайк удален' : 'Дизлайк добавлен'),
            data: {
                likes: newLikes,
                dislikes: newDislikes,
                likeAuthors: newLikeAuthors,
                dislikeAuthors: newDislikeAuthors,
                userLiked: newLikeAuthors.includes(username),
                userDisliked: newDislikeAuthors.includes(username),
                action
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('💥 Error in like/dislike API:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при обработке оценки',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            },
            { status: 500 }
        );
    }
}

// OPTIONS метод для CORS
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}