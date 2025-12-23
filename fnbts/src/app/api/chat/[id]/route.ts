// src/app/api/chat/chats/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { getUserIdFromRequest } from "@/lib/server-auth";

// Типы для базы данных
interface ChatParticipant {
    user_id: number;
}

interface Chat {
    id: number;
    created_at: string;
    updated_at: string;
    is_group: boolean;
    group_name?: string;
    group_photo?: string;
}

interface ParticipantWithUser {
    id: number;
    chat_id: number;
    user_id: number;
    joined_at: string;
    username: string;
    photo?: string;
}

interface UnreadCount {
    count: number;
}

interface DatabaseResult {
    affectedRows: number;
    insertId?: number;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface RouteParams {
    params: Promise<{
        id: string;
    }>
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse<ApiResponse>> {
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

        // Получаем информацию о чате
        const [chats] = await pool.execute(
            `SELECT * FROM chats WHERE id = ?`,
            [chatId]
        ) as [Chat[], unknown];

        if (chats.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Чат не найден' },
                { status: 404 }
            );
        }

        // Получаем участников
        const [participants] = await pool.execute(
            `SELECT
                 cp.*,
                 u.username,
                 u.photo
             FROM chat_participants cp
                      INNER JOIN users u ON cp.user_id = u.id
             WHERE cp.chat_id = ?`,
            [chatId]
        ) as [ParticipantWithUser[], unknown];

        // Получаем количество непрочитанных сообщений
        const [unreadCount] = await pool.execute(
            `SELECT COUNT(*) as count
             FROM messages m
             WHERE m.chat_id = ?
               AND m.sender_id != ?
               AND m.id NOT IN (
                 SELECT message_id FROM message_reads mr
                 WHERE mr.user_id = ?
             )`,
            [chatId, userId, userId]
        ) as [UnreadCount[], unknown];

        const chat = chats[0];
        const chatWithParticipants = {
            ...chat,
            participants: participants.map((p: ParticipantWithUser) => ({
                id: p.id,
                chat_id: p.chat_id,
                user_id: p.user_id,
                joined_at: p.joined_at,
                user: {
                    id: p.user_id,
                    username: p.username,
                    photo: p.photo || ''
                }
            })),
            unread_count: unreadCount[0]?.count || 0
        };

        return NextResponse.json({
            success: true,
            data: { chat: chatWithParticipants }
        });

    } catch (error) {
        console.error('Error fetching chat:', error);
        return NextResponse.json(
            { success: false, error: 'Ошибка при загрузке чата' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse<ApiResponse>> {
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

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Удаляем пользователя из участников чата
            const [result] = await connection.execute(
                'DELETE FROM chat_participants WHERE chat_id = ? AND user_id = ?',
                [chatId, userId]
            ) as [DatabaseResult, unknown];

            if (result.affectedRows === 0) {
                await connection.rollback();
                return NextResponse.json(
                    { success: false, error: 'Пользователь не является участником чата' },
                    { status: 404 }
                );
            }

            // Проверяем, остались ли участники в чате
            const [remainingParticipants] = await connection.execute(
                'SELECT COUNT(*) as count FROM chat_participants WHERE chat_id = ?',
                [chatId]
            ) as [{ count: number }[], unknown];

            // Если участников не осталось, удаляем чат и все сообщения
            if (remainingParticipants[0].count === 0) {
                await connection.execute('DELETE FROM messages WHERE chat_id = ?', [chatId]);
                await connection.execute('DELETE FROM chats WHERE id = ?', [chatId]); // Исправлено: было chat, должно быть chats
            }

            await connection.commit();

            return NextResponse.json({
                success: true,
                message: 'Чат успешно удален'
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error deleting chat:', error);
        return NextResponse.json(
            { success: false, error: 'Ошибка при удалении чата' },
            { status: 500 }
        );
    }
}