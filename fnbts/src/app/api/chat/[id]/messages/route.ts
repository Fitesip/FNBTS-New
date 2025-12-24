// src/app/api/chat/chats/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/server-auth';

// Типы для базы данных
interface ChatParticipant {
    user_id: number;
}

interface Message {
    id: number;
    chat_id: number;
    sender_id: number;
    message_text: string;
    message_type: string;
    file_url?: string;
    created_at: string;
    is_read: boolean;
    sender_username?: string;
    sender_photo?: string;
}

interface MessageWithSender extends Message {
    username: string;
    photo?: string;
}

interface DatabaseResult {
    insertId: number;
    affectedRows: number;
}

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

// GET /api/chat/chats/[id]/messages - получить сообщения чата
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getUserIdFromRequest(request);
        const { id } = await params;
        const chatId = parseInt(id);
        const { searchParams } = new URL(request.url);
        const since = searchParams.get('since'); // timestamp в миллисекундах

        if (isNaN(chatId)) {
            return NextResponse.json(
                { success: false, error: 'Неверный ID чата' },
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

        let query = `
            SELECT
                m.*,
                u.username as sender_username,
                u.photo as sender_photo
            FROM messages m
                     LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.chat_id = ?
        `;
        const queryParams: (string | number | Date)[] = [chatId];

        // Если передан since, фильтруем сообщения созданные после этого времени
        if (since) {
            const sinceDate = new Date(parseInt(since));
            query += ' AND m.created_at > ?';
            queryParams.push(sinceDate);
        }

        query += ' ORDER BY m.created_at ASC';

        const [messages] = await pool.execute(query, queryParams) as [Message[], unknown];

        const formattedMessages = messages.map((msg: Message) => ({
            id: msg.id,
            chat_id: msg.chat_id,
            sender_id: msg.sender_id,
            message_text: msg.message_text,
            message_type: msg.message_type,
            file_url: msg.file_url,
            created_at: msg.created_at,
            is_read: msg.is_read,
            sender: {
                id: msg.sender_id,
                username: msg.sender_username || '',
                photo: msg.sender_photo || ''
            }
        }));

        return NextResponse.json({
            success: true,
            data: {
                messages: formattedMessages,
                count: formattedMessages.length,
                since: since || null
            }
        });

    } catch (error) {
        console.error('Error loading messages:', error);
        return NextResponse.json(
            { success: false, error: 'Ошибка при загрузке сообщений' },
            { status: 500 }
        );
    }
}

// POST /api/chat/chats/[id]/messages - отправить сообщение
export async function POST(request: NextRequest, { params }: RouteParams) {
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
        const body = await request.json();
        const { message_text, message_type = 'text' } = body;

        if (!message_text?.trim()) {
            return NextResponse.json(
                { success: false, error: 'Message text is required' },
                { status: 400 }
            );
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Проверяем что пользователь участник чата
            const [participant] = await connection.execute(
                'SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?',
                [chatId, userId]
            ) as [ChatParticipant[], unknown];

            if (participant.length === 0) {
                await connection.rollback();
                return NextResponse.json(
                    { success: false, error: 'Access denied' },
                    { status: 403 }
                );
            }

            // Сохраняем сообщение
            const [messageResult] = await connection.execute(
                `INSERT INTO messages (chat_id, sender_id, message_text, message_type)
                 VALUES (?, ?, ?, ?)`,
                [chatId, userId, message_text.trim(), message_type]
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

            return NextResponse.json({
                success: true,
                data: {
                    message: {
                        id: message.id,
                        chat_id: message.chat_id,
                        sender_id: message.sender_id,
                        message_text: message.message_text,
                        message_type: message.message_type,
                        created_at: message.created_at,
                        is_read: false,
                        sender: {
                            id: message.sender_id,
                            username: message.username,
                            photo: message.photo || ''
                        }
                    }
                }
            }, { status: 201 });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Send message error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to send message' },
            { status: 500 }
        );
    }
}