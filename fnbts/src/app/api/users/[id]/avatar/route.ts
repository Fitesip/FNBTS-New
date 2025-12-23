// src/app/api/users/[id]/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import path from 'path';
import { writeFile, readFile, mkdir, access, unlink } from 'fs/promises';
import sharp from 'sharp';
import { createCanvas } from 'canvas';

// Типы для базы данных
interface User {
    photo: string;
    username: string;
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

async function createGradientAvatar(userId: number, username: string): Promise<string> {
    const size = 200;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Генерируем детерминированный градиент на основе userId
    const hue = (userId * 137.508) % 360; // Золотой угол для распределения цветов
    const saturation = 70 + (userId % 30); // 70-100%
    const lightness = 50 + ((userId * 7) % 20); // 50-70%

    // Создаем градиент
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
    gradient.addColorStop(1, `hsl(${hue + 80}, ${saturation - 10}%, ${lightness - 10}%)`);

    // Заполняем фон градиентом
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Добавляем первую букву имени пользователя
    const initial = username.charAt(0).toUpperCase();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${size * 0.4}px FNBTS`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, size / 2, size / 2);

    // Создаем директорию для стандартных аватаров
    const avatarsDir = path.join(process.cwd(), 'public', 'standardUserAvatars');
    await ensureDirectoryExists(avatarsDir);

    // Сохраняем изображение
    const fileName = `user-${userId}-avatar.png`;
    const filePath = path.join(avatarsDir, fileName);
    const buffer = canvas.toBuffer('image/png');
    await writeFile(filePath, buffer);

    return `/standardUserAvatars/${fileName}`;
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
                'SELECT photo, username FROM users WHERE id = ?',
                [userId]
            ) as [User[], unknown];

            if (rows.length === 0) {
                return new NextResponse('User not found', { status: 404 });
            }

            const user = rows[0];

            if (!user.photo) {
                const username = user.username || `User${userId}`;
                const avatarPath = await createGradientAvatar(userId, username);
                user.photo = avatarPath;
                // Сохраняем путь к созданному аватару в БД
                await connection.execute(
                    'UPDATE users SET photo = ? WHERE id = ?',
                    [avatarPath, userId]
                );
            }

            const filePath = path.join(process.cwd(), 'public', user.photo);
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

            const ext = path.extname(user.photo).toLowerCase();
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
        console.error('GET /api/users/[id]/avatar error:', error);
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

        if (isNaN(userId)) {
            return NextResponse.json({
                error: 'Неверный ID пользователя'
            }, { status: 400 });
        }

        // Получаем form data
        const formData = await request.formData();
        const file = formData.get('photo') as File;

        if (!file) {
            return NextResponse.json({
                error: 'Файл не найден'
            }, { status: 400 });
        }

        // Проверяем тип файла
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({
                error: 'Файл должен быть изображением'
            }, { status: 400 });
        }

        // Проверяем размер файла (максимум 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json({
                error: 'Размер файла не должен превышать 5MB'
            }, { status: 400 });
        }

        // Создаем уникальное имя файла
        const fileExtension = path.extname(file.name);
        const fileName = `user-${userId}-${Date.now()}${fileExtension}`;
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
                'UPDATE users SET photo = ? WHERE id = ?',
                [dbFilePath, userId]
            ) as [DatabaseResult, unknown];

            if (result.affectedRows === 0) {
                // Удаляем загруженный файл если пользователь не найден
                await unlink(filePath).catch(console.error);

                return NextResponse.json({
                    error: 'Пользователь не найден'
                }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                data: { photoPath: dbFilePath },
                message: 'Изображение успешно загружено'
            }, { status: 200 });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('POST /api/users/[id]/avatar error:', error);

        return NextResponse.json({
            error: 'Ошибка при загрузке изображения'
        }, { status: 500 });
    }
}