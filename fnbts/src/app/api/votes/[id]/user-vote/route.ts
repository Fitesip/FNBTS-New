import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/news';
import pool from '@/lib/database';

interface VoteRecord {
    vote: 'yes' | 'no';
}

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}


export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const username = searchParams.get('username');

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

        if (!username) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Не указан ID пользователя'
                },
                { status: 400 }
            );
        }

        // Проверяем, голосовал ли пользователь в этом голосовании
        const [userVotes] = await pool.query(
            `SELECT vote FROM votes WHERE author = ? AND votepostid = ?`,
            [username, id]
        ) as [VoteRecord[], unknown];

        const hasVoted = userVotes.length > 0;
        const voteType = hasVoted ? userVotes[0].vote : null;

        const response: ApiResponse<{
            hasVoted: boolean;
            voteType: 'yes' | 'no' | null;
        }> = {
            success: true,
            data: {
                hasVoted,
                voteType
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('💥 Error checking user vote:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при проверке голоса пользователя'
            },
            { status: 500 }
        );
    }
}