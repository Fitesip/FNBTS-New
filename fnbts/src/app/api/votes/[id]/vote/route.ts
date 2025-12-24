import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/news';
import pool from '@/lib/database';

interface VoteRequest {
    username: string;
    vote: 'yes' | 'no';
}

interface VoteRecord {
    id: number;
    user_id: number;
    vote_id: number;
    vote_type: 'yes' | 'no';
}

interface VotePost {
    id: number;
    title: string;
    description: string;
    datefrom: Date;
    dateto: Date;
    voteyes: number;
    voteno: number;
    created_at: Date;
    updated_at: Date;
}

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const body: VoteRequest = await request.json();

        const postId = parseInt(id);
        if (isNaN(postId)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Неверный ID голосования'
                },
                { status: 400 }
            );
        }

        if (!body.username || !body.vote) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Необходимо указать username и vote'
                },
                { status: 400 }
            );
        }

        // Проверяем существование голосования
        const [votes] = await pool.query(
            `SELECT * FROM votesposts WHERE id = ?`,
            [id]
        ) as [VotePost[], unknown];

        if (votes.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Голосование не найдено'
                },
                { status: 404 }
            );
        }

        // Проверяем, не голосовал ли уже пользователь
        const [existingVotes] = await pool.query(
            `SELECT * FROM votes WHERE author = ? AND votepostid = ?`,
            [body.username, id]
        ) as [VoteRecord[], unknown];

        if (existingVotes.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Вы уже проголосовали в этом опросе'
                },
                { status: 400 }
            );
        }

        // Проверяем, активно ли еще голосование
        const voteData = votes[0];
        const now = new Date();
        const voteEnd = new Date(voteData.dateto);

        if (now > voteEnd) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Голосование завершено'
                },
                { status: 400 }
            );
        }

        // Записываем голос
        await pool.execute(
            `INSERT INTO votes (author, votepostid, vote) VALUES (?, ?, ?)`,
            [body.username, id, body.vote]
        );

        // Обновляем счетчики
        const voteColumn = body.vote === 'yes' ? 'voteyes' : 'voteno';
        await pool.execute(
            `UPDATE votesposts SET ${voteColumn} = ${voteColumn} + 1 WHERE id = ?`,
            [id]
        );

        // Получаем обновленные данные голосования
        const [updatedVotes] = await pool.query(
            `SELECT * FROM votesposts WHERE id = ?`,
            [id]
        ) as [VotePost[], unknown];

        const response: ApiResponse<{ vote: VotePost }> = {
            success: true,
            data: {
                vote: updatedVotes[0]
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('💥 Error processing vote:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при обработке голоса'
            },
            { status: 500 }
        );
    }
}