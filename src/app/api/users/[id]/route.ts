// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { UserWithoutSensitiveData } from '@/types/database';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

interface MySQLFieldPacket {
    // Define the structure based on your MySQL driver
    // These are typical properties for mysql2 field packets
    catalog: string;
    db: string;
    table: string;
    orgTable: string;
    name: string;
    orgName: string;
    charsetNr: number;
    length: number;
    type: number;
    flags: number;
    decimals: number;
    default?: unknown;
    zeroFill: boolean;
    protocol41: boolean;
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const userId = parseInt(id);
        if (isNaN(userId)) {
            return NextResponse.json({
                error: 'Invalid user ID'
            }, { status: 400 });
        }

        const [rows] = await pool.execute(
            'SELECT id, username, email, regDate, role, userRank, status, photo, banner, frame, points, verify, email_verified, isBlocked FROM users WHERE id = ?',
            [userId]
        ) as [UserWithoutSensitiveData[], MySQLFieldPacket[]];

        if (rows.length === 0) {
            return NextResponse.json({
                error: 'Такого пользователя не существует!'
            }, { status: 404 });
        }

        const user = rows[0];

        return NextResponse.json(user, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            }
        });

    } catch (error: unknown) {
        console.error('GET /api/users/[id] error:', error);
        return NextResponse.json({
            error: 'Ошибка сервера, попробуйте позже'
        }, { status: 500 });
    }
}