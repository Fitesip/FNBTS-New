// src/hooks/useSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { Message } from '@/types/chat';
import { MessagesReadData } from '@/types/socket';

export const useSocket = () => {
    const socketRef = useRef<Socket | null>(null);
    const { user } = useAuth();

    const connect = useCallback(() => {
        if (!user || socketRef.current?.connected) return;

        socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
            path: '/api/socket',
        });

        socketRef.current.emit('authenticate', user.id);

        socketRef.current.on('connect', () => {
            console.log('Connected to WebSocket');
        });

        socketRef.current.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
        });

        socketRef.current.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }, [user]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    }, []);

    const joinChat = useCallback((chatId: number) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('join_chat', chatId);
        }
    }, []);

    const leaveChat = useCallback((chatId: number) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('leave_chat', chatId);
        }
    }, []);

    const sendMessage = useCallback((data: {
        chat_id: number;
        message_text: string;
        message_type?: 'text' | 'image' | 'file';
        file_url?: string;
    }) => {
        if (socketRef.current?.connected && user) {
            socketRef.current.emit('send_message', {
                ...data,
                sender_id: user.id,
            });
        }
    }, [user]);

    const markAsRead = useCallback((messageIds: number[], chatId: number) => {
        if (socketRef.current?.connected && user) {
            socketRef.current.emit('mark_as_read', {
                message_ids: messageIds,
                user_id: user.id,
                chat_id: chatId,
            });
        }
    }, [user]);

    const onNewMessage = useCallback((callback: (message: Message) => void) => {
        if (socketRef.current) {
            socketRef.current.on('new_message', callback);
        }

        // Функция для отписки
        return () => {
            if (socketRef.current) {
                socketRef.current.off('new_message', callback);
            }
        };
    }, []);

    const onChatUpdated = useCallback((callback: (chatId: number) => void) => {
        if (socketRef.current) {
            socketRef.current.on('chat_updated', callback);
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.off('chat_updated', callback);
            }
        };
    }, []);

    const onMessagesRead = useCallback((callback: (data: MessagesReadData) => void) => {
        if (socketRef.current) {
            socketRef.current.on('messages_read', callback);
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.off('messages_read', callback);
            }
        };
    }, []);

    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        connected: socketRef.current?.connected || false,
        joinChat,
        leaveChat,
        sendMessage,
        markAsRead,
        onNewMessage,
        onChatUpdated,
        onMessagesRead,
    };
};