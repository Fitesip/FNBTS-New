// src/app/api/users/[id]/frame/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import path from 'path';
import { readFile } from 'fs/promises';
import sharp from "sharp";

// Типы для базы данных
interface UserFrame {
    frame: string;
}

interface DatabaseResult {
    affectedRows: number;
}

interface ApplyFrameRequest {
    frameUrl: string;
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
        const userId = parseInt(id);
        const url = new URL(request.url);
        const width = url.searchParams.get('width') ? parseInt(url.searchParams.get('width')!) : null;
        const height = url.searchParams.get('height') ? parseInt(url.searchParams.get('height')!) : null;
        const quality = url.searchParams.get('quality') ? parseInt(url.searchParams.get('quality')!) : 80;

        if (isNaN(userId)) {
            return new NextResponse('Invalid user ID', { status: 400 });
        }

        const connection = await pool.getConnection();

        try {
            const [rows] = await connection.execute(
                'SELECT frame FROM users WHERE id = ?',
                [userId]
            ) as [UserFrame[], unknown];

            if (rows.length === 0) {
                return new NextResponse('User not found', { status: 404 });
            }

            const user = rows[0];

            if (!user.frame) {
                return new NextResponse('Frame not found', { status: 404 });
            }

            const filePath = path.join(process.cwd(), 'public/', user.frame);
            let imageBuffer: Buffer;

            if (width || height) {
                const sharpInstance = sharp(filePath);

                if (width && height) {
                    sharpInstance.resize(width, height);
                } else if (width) {
                    sharpInstance.resize(width);
                } else if (height) {
                    sharpInstance.resize(null, height);
                }

                imageBuffer = await sharpInstance
                    .jpeg({ quality })
                    .png({ quality: Math.floor(quality * 0.9) })
                    .toBuffer();
            } else {
                // Возвращаем оригинальное изображение
                imageBuffer = await readFile(filePath);
            }

            const ext = path.extname(user.frame).toLowerCase();
            const mimeTypes: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            };

            const contentType = mimeTypes[ext] || 'application/octet-stream';

            // Convert Buffer to Uint8Array
            const uint8Array = new Uint8Array(imageBuffer);

            return new NextResponse(uint8Array, {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': imageBuffer.length.toString(),
                    'Cache-Control': 'public, max-age=86400',
                },
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('GET /api/users/[id]/frame error:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                error: 'Требуется авторизация'
            }, { status: 401 });
        }

        const { id } = await params;
        const userId = parseInt(id);
        const body = await request.json() as ApplyFrameRequest;
        const { frameUrl } = body;

        if (isNaN(userId)) {
            return NextResponse.json({
                success: false,
                error: 'Неверный ID пользователя'
            }, { status: 400 });
        }

        const connection = await pool.getConnection();

        try {
            const [result] = await connection.execute(
                'UPDATE users SET frame = ? WHERE id = ?',
                [frameUrl, userId]
            ) as [DatabaseResult, unknown];

            if (result.affectedRows === 0) {
                return NextResponse.json({
                    success: false,
                    error: 'Пользователь не найден'
                }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                message: 'Рамка успешно применена'
            }, { status: 200 });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('POST /api/users/[id]/frame error:', error);

        return NextResponse.json({
            success: false,
            error: 'Ошибка при применении рамки'
        }, { status: 500 });
    }
}