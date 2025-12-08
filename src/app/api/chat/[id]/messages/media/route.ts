import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/server-auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Конфигурация
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 15 * 1024 * 1024;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
];

const ALLOWED_VIDEO_TYPES = [
    'video/mp4', 'video/mpeg', 'video/ogg', 'video/webm', 'video/quicktime'
];

interface ChatParticipant {
    user_id: number;
}

interface DatabaseResult {
    insertId: number;
    affectedRows: number;
}

interface MessageWithSender {
    id: number;
    chat_id: number;
    sender_id: number;
    message_text: string;
    message_type: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    file_duration?: number;
    thumbnail_url?: string;
    created_at: string;
    is_read: boolean;
    username: string;
    photo?: string;
}

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

// Создаем директорию если не существует
async function ensureDir(dir: string) {
    if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    let connection;

    try {
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const chatId = parseInt(id);

        if (isNaN(chatId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid chat ID' },
                { status: 400 }
            );
        }

        connection = await pool.getConnection();

        // Проверяем, что пользователь является участником чата
        const [userInChat] = await connection.execute(
            'SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?',
            [chatId, userId]
        ) as [ChatParticipant[], unknown];

        if (userInChat.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        const formData = await request.formData();
        const messageText = formData.get('message_text') as string;
        const messageType = formData.get('message_type') as 'image' | 'video' | 'file';
        const mediaFile = formData.get('media_file') as File;

        if (!mediaFile) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        // Валидация типа и размера
        let maxSize = MAX_FILE_SIZE;
        let allowedTypes: string[] = [];

        switch (messageType) {
            case 'image':
                maxSize = MAX_IMAGE_SIZE;
                allowedTypes = ALLOWED_IMAGE_TYPES;
                break;
            case 'video':
                maxSize = MAX_VIDEO_SIZE;
                allowedTypes = ALLOWED_VIDEO_TYPES;
                break;
            case 'file':
                maxSize = MAX_FILE_SIZE;
                break;
        }

        if (allowedTypes.length > 0 && !allowedTypes.includes(mediaFile.type)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid ${messageType} format. Allowed: ${allowedTypes.join(', ')}`
                },
                { status: 400 }
            );
        }

        if (mediaFile.size > maxSize) {
            return NextResponse.json(
                {
                    success: false,
                    error: `File too large. Maximum ${maxSize / 1024 / 1024}MB`
                },
                { status: 400 }
            );
        }

        await connection.beginTransaction();

        try {
            // Создаем уникальное имя файла
            const fileExtension = mediaFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
            const uploadDir = join(process.cwd(), 'public', 'uploads', 'chat');

            // Создаем директорию если не существует
            await ensureDir(uploadDir);

            const filePath = join(uploadDir, fileName);

            // Сохраняем файл на диск
            const arrayBuffer = await mediaFile.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            await writeFile(filePath, buffer);

            // Создаем URL для доступа к файлу
            const fileUrl = `/api/uploads/chat/${fileName}`;

            // Сохраняем сообщение в базе данных
            const [messageResult] = await connection.execute(
                `INSERT INTO messages (chat_id, sender_id, message_text, message_type, file_url, file_name, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    chatId,
                    userId,
                    messageText || '',
                    messageType,
                    fileUrl,
                    mediaFile.name,
                    mediaFile.size
                ]
            ) as [DatabaseResult, unknown];

            // Обновляем время чата
            await connection.execute(
                'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [chatId]
            );

            await connection.commit();

            // Получаем данные сообщения с информацией об отправителе
            const [messages] = await connection.execute(
                `SELECT
            m.*,
            u.username,
            u.photo
         FROM messages m
         INNER JOIN users u ON m.sender_id = u.id
         WHERE m.id = ?`,
                [messageResult.insertId]
            ) as [MessageWithSender[], unknown];

            const message = messages[0];

            // Форматируем ответ
            const messageResponse = {
                id: message.id,
                chat_id: message.chat_id,
                sender_id: message.sender_id,
                message_text: message.message_text,
                message_type: message.message_type,
                file_url: message.file_url,
                file_name: message.file_name,
                file_size: message.file_size,
                file_duration: message.file_duration,
                thumbnail_url: message.thumbnail_url,
                created_at: message.created_at,
                is_read: message.is_read,
                sender: {
                    id: message.sender_id,
                    username: message.username,
                    photo: message.photo || ''
                }
            };

            return NextResponse.json({
                success: true,
                data: {
                    message: messageResponse
                }
            }, { status: 201 });

        } catch (error) {
            await connection.rollback();
            console.error('Database error:', error);
            throw error;
        }

    } catch (error) {
        console.error('Media upload error:', error);

        if (connection) {
            await connection.rollback();
        }

        return NextResponse.json(
            { success: false, error: 'Upload failed: ' + (error as Error).message },
            { status: 500 }
        );
    } finally {
        if (connection) {
            connection.release();
        }
    }
}