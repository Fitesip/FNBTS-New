// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

interface WalletUser {
    id: number;
    discordID: string;
    username: string;
    hleb: number;
    sfl: number;
    rating: number;
    creditHleb: number;
    creditSfl: number;
    vaultHleb: number;
    vaultSfl: number;
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

export async function POST(
    request: NextRequest,
) {
    try {
        const body = await request.json();
        const { username } = body;

        if (!username) {
            return NextResponse.json({
                error: 'Invalid username'
            }, { status: 400 });
        }

        const connection = await pool.getConnection();

        try {
            const [rows] = await connection.execute(
                'SELECT id, discordID, username, hleb, sfl, rating, creditHleb, creditSfl, vaultHleb, vaultSfl FROM wallet WHERE username = ?',
                [username]
            ) as [WalletUser[], MySQLFieldPacket[]];

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

        } finally {
            connection.release();
        }

    } catch (error: unknown) {
        console.error('POST /api/users wallet error:', error);
        return NextResponse.json({
            error: 'Ошибка сервера, попробуйте позже'
        }, { status: 500 });
    }
}