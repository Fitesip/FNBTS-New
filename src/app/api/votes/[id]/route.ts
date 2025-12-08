import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/news';
import pool from '@/lib/database';

interface VoteResult {
    id: number;
    title: string;
    datefrom: string;
    dateto: string;
    votes_for: number;
    votes_against: number;
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
            `SELECT * FROM votesposts WHERE id = ?`,
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

        const response: ApiResponse<{ vote: VoteResult }> = {
            success: true,
            data: {
                vote: votes[0]
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('💥 Error fetching vote:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при загрузке голосования'
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest,
                             { params }: RouteParams) {
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
            `UPDATE votesposts SET status = 'close' WHERE id = ?`,
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

        const response: ApiResponse<{ vote: VoteResult }> = {
            success: true,
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('💥 Error fetching vote:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при загрузке голосования'
            },
            { status: 500 }
        );
    }
}