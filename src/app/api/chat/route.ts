// src/app/api/chat/chats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/server-auth';

// Типы для базы данных
interface Chat {
    id: number;
    created_at: string;
    updated_at: string;
    is_group: boolean;
    group_name?: string;
    group_photo?: string;
    unread_count?: number;
}

interface ChatWithUnread extends Chat {
    unread_count: number;
}

interface Participant {
    id: number;
    chat_id: number;
    user_id: number;
    joined_at: string;
    username: string;
    photo?: string;
}

interface Message {
    id: number;
    message_text: string;
    created_at: string;
    message_type: string;
    file_url: string;
    file_name: string;
    file_size: number;
    sender_username?: string;
}

interface DatabaseResult {
    insertId: number;
    affectedRows: number;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface CreateChatRequest {
    participant_ids: number[];
    is_group?: boolean;
    group_name?: string;
}

// GET /api/chat/chat - получить список чатов пользователя
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
    try {
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const connection = await pool.getConnection();

        try {
            // Получаем чаты пользователя
            const [chats] = await connection.execute(
                `SELECT
                     c.*,
                     (SELECT COUNT(*) FROM messages m
                      WHERE m.chat_id = c.id
                        AND m.sender_id != ?
                        AND NOT EXISTS (
                          SELECT 1 FROM message_reads mr
                          WHERE mr.message_id = m.id AND mr.user_id = ?
                      )) as unread_count
                 FROM chats c
                          INNER JOIN chat_participants cp ON c.id = cp.chat_id
                 WHERE cp.user_id = ?
                 ORDER BY c.updated_at DESC`,
                [userId, userId, userId]
            ) as [ChatWithUnread[], unknown];

            // Для каждого чата получаем участников и последнее сообщение
            const chatsWithDetails = await Promise.all(
                chats.map(async (chat: ChatWithUnread) => {
                    const [participants] = await connection.execute(
                        `SELECT
                             cp.*,
                             u.username,
                             u.photo
                         FROM chat_participants cp
                                  INNER JOIN users u ON cp.user_id = u.id
                         WHERE cp.chat_id = ?`,
                        [chat.id]
                    ) as [Participant[], unknown];

                    const [lastMessage] = await connection.execute(
                        `SELECT
                             m.id,
                             m.message_text,
                             m.message_type,
                             m.file_url,    
                             m.file_name,   
                             m.file_size,   
                             m.created_at,
                             u.username as sender_username
                         FROM messages m
                             INNER JOIN users u ON m.sender_id = u.id
                         WHERE m.chat_id = ?
                         ORDER BY m.created_at DESC
                            LIMIT 1`,
                        [chat.id]
                    ) as [Message[], unknown];

                    return {
                        ...chat,
                        participants: participants.map((p: Participant) => ({
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
                        last_message: lastMessage[0] ? {
                            id: lastMessage[0].id,
                            message_text: lastMessage[0].message_text,
                            message_type: lastMessage[0].message_type,
                            file_url: lastMessage[0].file_url,
                            file_name: lastMessage[0].file_name,
                            file_size: lastMessage[0].file_size,
                            created_at: lastMessage[0].created_at,
                            sender: {
                                username: lastMessage[0].sender_username || ''
                            }
                        } : null
                    };
                })
            );

            return NextResponse.json({
                success: true,
                data: {
                    chats: chatsWithDetails
                }
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Get chat error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to load chat' },
            { status: 500 }
        );
    }
}

// POST /api/chat/chat - создать новый чат
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
    try {
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json() as CreateChatRequest;
        const { participant_ids, is_group = false, group_name } = body;

        if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Participants are required' },
                { status: 400 }
            );
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Для личных чатов проверяем существование
            if (!is_group && participant_ids.length === 1) {
                const [existingChats] = await connection.execute(
                    `SELECT c.id
                     FROM chats c
                              INNER JOIN chat_participants cp1 ON c.id = cp1.chat_id
                              INNER JOIN chat_participants cp2 ON c.id = cp2.chat_id
                     WHERE cp1.user_id = ? AND cp2.user_id = ?
                       AND c.is_group = false`,
                    [userId, participant_ids[0]]
                ) as [{ id: number }[], unknown];

                if (existingChats.length > 0) {
                    return NextResponse.json({
                        success: false,
                        error: 'Chat already exists',
                        chat_id: existingChats[0].id
                    }, { status: 409 });
                }
            }

            // Создаем чат
            const [chatResult] = await connection.execute(
                `INSERT INTO chats (is_group, group_name)
                 VALUES (?, ?)`,
                [is_group, group_name || null]
            ) as [DatabaseResult, unknown];

            const chatId = chatResult.insertId;

            // Добавляем участников (текущий пользователь + выбранные)
            const allParticipants = [userId, ...participant_ids];

            for (const participantId of allParticipants) {
                await connection.execute(
                    `INSERT INTO chat_participants (chat_id, user_id)
                     VALUES (?, ?)`,
                    [chatId, participantId]
                );
            }

            await connection.commit();

            return NextResponse.json({
                success: true,
                data: {
                    chat: { id: chatId }
                }
            }, { status: 201 });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Create chat error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create chat' },
            { status: 500 }
        );
    }
}