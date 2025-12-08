import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/news';
import pool from '@/lib/database';

interface VoteResult {
    id: number;
    title: string;
    datefrom: Date;
    dateto: Date;
    votes_for: number;
    votes_against: number;
    total_votes: number;
}

interface VoteResponse {
    vote: VoteResult;
    statistics: {
        forPercent: number;
        againstPercent: number;
        total: number;
    };
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

        const [votes] = await pool.query(
            `SELECT
                 id,
                 title,
                 datefrom,
                 dateto,
                 COALESCE(voteyes, 0) as votes_for,
                 COALESCE(voteno, 0) as votes_against,
                 (COALESCE(voteyes, 0) + COALESCE(voteno, 0)) as total_votes
             FROM votesposts WHERE id = ?`,
            [id]
        ) as [VoteResult[], unknown];

        if (votes.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Голосование не найдено'
                },
                { status: 404 }
            );
        }

        const voteData = votes[0];

        // Рассчитываем проценты
        const total = voteData.total_votes;
        const forPercent = total > 0 ? Math.round((voteData.votes_for / total) * 100) : 0;
        const againstPercent = total > 0 ? Math.round((voteData.votes_against / total) * 100) : 0;

        const response: ApiResponse<VoteResponse> = {
            success: true,
            data: {
                vote: voteData,
                statistics: {
                    forPercent,
                    againstPercent,
                    total
                }
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('💥 Error fetching vote results:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при загрузке результатов'
            },
            { status: 500 }
        );
    }
}