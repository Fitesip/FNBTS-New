// src/app/api/users/getId/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";

interface UserIdRow {
    id: number;
}

interface MySQLFieldPacket {
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

interface ApiResponse {
    success?: boolean;
    error?: string;
    id?: number;
}

export async function POST(
    request: NextRequest,
): Promise<NextResponse<ApiResponse>> {
    try {
        const body = await request.json();
        const { username } = body;

        if (!username || typeof username !== 'string') {
            return NextResponse.json({
                success: false,
                error: 'Username is required'
            }, { status: 400 });
        }

        const [rows] = await pool.execute(
            'SELECT id FROM users WHERE username = ?',
            [username]
        ) as [UserIdRow[], MySQLFieldPacket[]];

        if (rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'User not found'
            }, { status: 404 });
        }

        const user = rows[0];

        return NextResponse.json({
            id: user.id
        }, { status: 200 });

    } catch (error: unknown) {
        console.error('POST /api/users/getId error:', error);
        return NextResponse.json({
            success: false,
            error: 'Ошибка сервера, попробуйте позже'
        }, { status: 500 });
    }
}