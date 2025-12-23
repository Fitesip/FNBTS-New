// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { User, CreateUserRequest, ApiResponse } from '@/types/database';

interface MySQLResult {
    insertId: number;
    affectedRows: number;
    warningStatus: number;
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

interface MySQLError extends Error {
    code: string;
    errno: number;
    sqlState: string;
    sqlMessage: string;
}

export async function GET(): Promise<NextResponse<ApiResponse<User[]>>> {
    try {
        const [rows] = await pool.execute('SELECT * FROM users') as [User[], MySQLFieldPacket[]];

        return NextResponse.json({
            success: true,
            data: rows
        });
    } catch (error: unknown) {
        console.error('GET /api/users error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch users'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<User>>> {
    try {
        const body: CreateUserRequest = await request.json();
        const { name, email } = body;

        if (!name || !email) {
            return NextResponse.json({
                success: false,
                error: 'Name and email are required'
            }, { status: 400 });
        }

        const [result] = await pool.execute(
            'INSERT INTO users (username, email) VALUES (?, ?)',
            [name, email]
        ) as unknown as [MySQLResult, MySQLFieldPacket[]];

        // Получаем созданного пользователя
        const [newUser] = await pool.execute(
            'SELECT * FROM users WHERE id = ?',
            [result.insertId]
        ) as [User[], MySQLFieldPacket[]];

        return NextResponse.json({
            success: true,
            data: newUser[0],
            message: 'User created successfully'
        }, { status: 201 });
    } catch (error: unknown) {
        console.error('POST /api/users error:', error);

        // Type guard to check if it's a MySQL error
        const isMySQLError = (err: unknown): err is MySQLError => {
            return typeof err === 'object' && err !== null && 'code' in err;
        };

        if (isMySQLError(error) && error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({
                success: false,
                error: 'Email already exists'
            }, { status: 409 });
        }

        return NextResponse.json({
            success: false,
            error: 'Failed to create user'
        }, { status: 500 });
    }
}