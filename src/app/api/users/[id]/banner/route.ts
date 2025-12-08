// src/app/api/users/[id]/banner/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { ApiResponse } from '@/types/database';
import path from 'path';
import { writeFile, readFile, access, mkdir, unlink } from 'fs/promises';
import sharp from "sharp";

// Типы для базы данных
interface UserBanner {
    banner: string;
}

interface DatabaseResult {
    affectedRows: number;
    insertId?: number;
}

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

// Вспомогательная функция для проверки существования директории
async function ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
        await access(dirPath);
    } catch {
        await mkdir(dirPath, { recursive: true });
    }
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
                'SELECT banner FROM users WHERE id = ?',
                [userId]
            ) as [UserBanner[], unknown];

            if (rows.length === 0) {
                return new NextResponse('User not found', { status: 404 });
            }

            const user = rows[0];

            if (!user.banner) {
                return new NextResponse('Banner not found', { status: 404 });
            }

            const filePath = path.join(process.cwd(), 'public', user.banner);
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

            const ext = path.extname(user.banner).toLowerCase();
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
        console.error('GET /api/users/[id]/banner error:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
    try {
        const { id } = await params;
        const userId = parseInt(id);

        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({
                success: false,
                error: 'Требуется авторизация'
            }, { status: 401 });
        }

        if (isNaN(userId)) {
            return NextResponse.json({
                success: false,
                error: 'Неверный ID пользователя'
            }, { status: 400 });
        }

        // Получаем form data
        const formData = await request.formData();
        const file = formData.get('banner') as File;

        if (!file) {
            return NextResponse.json({
                success: false,
                error: 'Файл не найден'
            }, { status: 400 });
        }

        // Проверяем тип файла
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({
                success: false,
                error: 'Файл должен быть изображением'
            }, { status: 400 });
        }

        // Проверяем размер файла (максимум 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json({
                success: false,
                error: 'Размер файла не должен превышать 5MB'
            }, { status: 400 });
        }

        // Создаем уникальное имя файла
        const fileExtension = path.extname(file.name);
        const fileName = `user-${userId}-banner-${Date.now()}${fileExtension}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');

        // Создаем папку если её нет
        await ensureDirectoryExists(uploadDir);

        const filePath = path.join(uploadDir, fileName);

        // Конвертируем File в Buffer и сохраняем
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Путь для сохранения в БД (относительный от public)
        const dbFilePath = `/uploads/${fileName}`;

        // Обновляем запись в базе данных
        const connection = await pool.getConnection();

        try {
            const [result] = await connection.execute(
                'UPDATE users SET banner = ? WHERE id = ?',
                [dbFilePath, userId]
            ) as [DatabaseResult, unknown];

            if (result.affectedRows === 0) {
                // Удаляем загруженный файл если пользователь не найден
                await unlink(filePath).catch(console.error);

                return NextResponse.json({
                    success: false,
                    error: 'Пользователь не найден'
                }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                data: { bannerPath: dbFilePath },
                message: 'Баннер успешно загружен'
            }, { status: 200 });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('POST /api/users/[id]/banner error:', error);

        return NextResponse.json({
            success: false,
            error: 'Ошибка при загрузке баннера'
        }, { status: 500 });
    }
}