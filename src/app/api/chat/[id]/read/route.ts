// src/app/api/chat/chats/[id]/read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { getUserIdFromRequest } from "@/lib/server-auth";

// Типы для базы данных
interface ChatParticipant {
    user_id: number;
}

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json(
                { success: false, error: 'Требуется авторизация' },
                { status: 401 }
            );
        }

        const userId = await getUserIdFromRequest(request);
        const { id } = await params;
        const chatId = parseInt(id);

        if (isNaN(chatId)) {
            return NextResponse.json(
                { success: false, error: 'Неверный ID чата' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { message_ids } = body;

        if (!message_ids || !Array.isArray(message_ids)) {
            return NextResponse.json(
                { success: false, error: 'Неверные ID сообщений' },
                { status: 400 }
            );
        }

        // Проверяем, что пользователь является участником чата
        const [userInChat] = await pool.execute(
            'SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?',
            [chatId, userId]
        ) as [ChatParticipant[], unknown];

        if (userInChat.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Доступ запрещен' },
                { status: 403 }
            );
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Добавляем записи о прочтении
            for (const messageId of message_ids) {
                await connection.execute(
                    `INSERT IGNORE INTO message_reads (message_id, user_id)
                     VALUES (?, ?)`,
                    [messageId, userId]
                );
            }

            // Обновляем статус is_read в messages
            if (message_ids.length > 0) {
                const placeholders = message_ids.map(() => '?').join(',');
                await connection.execute(
                    `UPDATE messages
                     SET is_read = true
                     WHERE id IN (${placeholders})`,
                    message_ids
                );
            }

            await connection.commit();

            return NextResponse.json({
                success: true,
                message: 'Сообщения отмечены как прочитанные'
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error marking messages as read:', error);
        return NextResponse.json(
            { success: false, error: 'Ошибка при отметке сообщений как прочитанных' },
            { status: 500 }
        );
    }
}