// src/hooks/useChat.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Chat, Message, ChatUser } from '@/types/chat';
import { tokenManager } from '@/lib/tokenUtils';
import { useAuth } from '@/context/AuthContext';

interface ServerEvent {
    type: string;
    userId?: number;
    message?: Message;
    messageId?: number;
    chat?: Chat;
    error?: string;
}

interface LoadingState {
    chats: boolean;
    messages: boolean;
    currentChat: boolean;
}

export const useChat = (chatId?: number) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentChat, setCurrentChat] = useState<Chat | null>(null);
    const [loading, setLoading] = useState<LoadingState>({
        chats: true,
        messages: false,
        currentChat: false,
    });
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);

    const eventSourceRef = useRef<EventSource | null>(null);
    const { user } = useAuth();
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const chatsPollingRef = useRef<NodeJS.Timeout | null>(null);
    const messagesPollingRef = useRef<NodeJS.Timeout | null>(null);
    const lastChatsUpdateRef = useRef<number>(Date.now());
    const lastMessagesUpdateRef = useRef<number>(Date.now());
    const currentChatIdRef = useRef<number | null>(null);
    const messagesCacheRef = useRef<Message[]>([]);
    const lastEventTimeRef = useRef<number>(0);
    const loadedChatsCacheRef = useRef<Chat[]>([]);
    const chatsStableRef = useRef<Chat[]>([]);
    const isConnectingRef = useRef(false);

    const stableSetChats = useCallback((updater: (prev: Chat[]) => Chat[]) => {
        setChats(prev => {
            const newChats = updater(prev);

            // Сравниваем только важные поля для стабильности
            const hasSignificantChanges =
                prev.length !== newChats.length ||
                prev.some((chat, index) => {
                    const newChat = newChats[index];
                    if (!newChat) return true;

                    return (
                        chat.id !== newChat.id ||
                        chat.unread_count !== newChat.unread_count ||
                        chat.last_message?.id !== newChat.last_message?.id ||
                        chat.last_message?.message_text !== newChat.last_message?.message_text
                    );
                });

            if (hasSignificantChanges) {
                chatsStableRef.current = newChats;
                return newChats;
            }

            return prev;
        });
    }, []);

    // Функция для выполнения авторизованных запросов
    const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        try {
            const token = await tokenManager.getValidAccessToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    ...options.headers,
                },
            });

            if (response.status === 401) {
                await tokenManager.refreshTokens();
                return authFetch(url, options);
            }

            return response;
        } catch (err) {
            console.error('Auth fetch error:', err);
            throw err;
        }
    }, []);

    // Загрузка чатов с оптимизацией
    const loadChats = useCallback(async (force: boolean = false) => {
        try {
            if (force) {
                setLoading(prev => ({ ...prev, chats: true }));
            }

            const response = await authFetch('/api/chat');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                stableSetChats(() => result.data.chats);
                setError(null);
                lastChatsUpdateRef.current = Date.now();
            } else {
                setError(result.error || 'Failed to load chats');
            }
        } catch (err) {
            console.error('Error loading chats:', err);
            setError('Failed to load chats');
        } finally {
            if (force) {
                setLoading(prev => ({ ...prev, chats: false }));
            }
        }
    }, [authFetch, stableSetChats]);

    // Загрузка сообщений с оптимизацией
    const loadMessages = useCallback(async (id: number) => {
        try {
            setLoading(prev => ({ ...prev, messages: true }));
            const response = await authFetch(`/api/chat/${id}/messages`);
            const result = await response.json();
            if (result.success) {
                if (currentChatIdRef.current === id) {
                    // Мержим новые сообщения, чтобы UI не мерцал
                    const existingIds = new Set(messagesCacheRef.current.map(msg => msg.id));
                    const newMessages = result.data.messages.filter((msg: Message) => !existingIds.has(msg.id));
                    messagesCacheRef.current = [...messagesCacheRef.current, ...newMessages];
                    setMessages(messagesCacheRef.current);
                    lastMessagesUpdateRef.current = Date.now();
                }
                setError(null);
            } else {
                setError(result.error || 'Failed to load messages');
            }
        } catch (err) {
            console.error('Error loading messages:', err);
            setError('Failed to load messages');
        } finally {
            setLoading(prev => ({ ...prev, messages: false }));
        }
    }, [authFetch]);


    // Загрузка текущего чата
    const loadCurrentChat = useCallback(async (id: number) => {
        if (Date.now() - lastChatsUpdateRef.current < 1000) return;
        try {
            setLoading(prev => ({ ...prev, currentChat: true }));

            // Сначала проверяем кэш чатов
            const cachedChat = loadedChatsCacheRef.current.find(chat => chat.id === id);
            if (cachedChat) {
                setCurrentChat(cachedChat);
                setError(null);
                return;
            }

            // Если нет в кэше, загружаем с сервера
            const response = await authFetch(`/api/chat/${id}`);
            const result = await response.json();

            if (result.success) {
                setCurrentChat(result.data.chat);
                setError(null);
            } else {
                setError(result.error);
            }
        } catch (err) {
            console.error('Failed to load chat details:', err);
            setError('Failed to load chat details');
        } finally {
            setLoading(prev => ({ ...prev, currentChat: false }));
        }
    }, [authFetch]);

    // Поиск пользователей
    const searchUsers = useCallback(async (query: string): Promise<ChatUser[]> => {
        try {
            const response = await authFetch(`/api/chat/users/search?q=${encodeURIComponent(query)}`);
            const result = await response.json();

            if (result.success) {
                return result.data.users;
            }
            setError(result.error);
            return [];
        } catch (err) {
            console.error('Failed to search users:', err);
            return [];
        }
    }, [authFetch]);

    // Создание чата
    const createChat = useCallback(async (
        participantIds: number[],
        isGroup: boolean = false,
        groupName?: string
    ) => {
        try {
            const response = await authFetch('/api/chat', {
                method: 'POST',
                body: JSON.stringify({
                    participant_ids: participantIds,
                    is_group: isGroup,
                    group_name: groupName,
                }),
            });

            const result = await response.json();

            if (result.success) {
                const newChat = result.data.chat;
                await loadChats(true);
                return newChat;
            }
            setError(result.error);
            return null;
        } catch (err) {
            console.error('Failed to create chat:', err);
            setError('Failed to create chat');
            return null;
        }
    }, [authFetch, loadChats]);

    // Отметка сообщений как прочитанных
    const markMessagesAsRead = useCallback(async (messageIds: number[]) => {
        if (!currentChat || messageIds.length === 0 || !user) return;

        try {
            const response = await authFetch(`/api/chat/${currentChat.id}/read`, {
                method: 'POST',
                body: JSON.stringify({ message_ids: messageIds }),
            });

            if (!response.ok) {
                throw new Error('Failed to mark messages as read');
            }

            const result = await response.json();

            if (result.success) {
                setMessages(prev => prev.map(msg =>
                    messageIds.includes(msg.id)
                        ? { ...msg, is_read: true }
                        : msg
                ));

                stableSetChats(prev => prev.map(chat =>
                    chat.id === currentChat.id
                        ? { ...chat, unread_count: Math.max(0, chat.unread_count - messageIds.length) }
                        : chat
                ));
            }
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    }, [authFetch, currentChat, user, stableSetChats]);

    // Проверка новых чатов (только при необходимости)
    const checkForNewChats = useCallback(async () => {
        // Проверяем только если прошло достаточно времени с последнего обновления
        if (Date.now() - lastChatsUpdateRef.current < 2000) return;

        try {
            const response = await authFetch('/api/chat');
            const result = await response.json();

            if (result.success) {
                stableSetChats(prevChats => {
                    const newChats = result.data.chats;
                    const hasChanges =
                        prevChats.length !== newChats.length ||
                        prevChats.some((chat, index) => {
                            const newChat = newChats[index];
                            if (!newChat) return true;
                            return (
                                chat.unread_count !== newChat.unread_count ||
                                chat.last_message?.id !== newChat.last_message?.id ||
                                chat.last_message?.message_text !== newChat.last_message?.message_text
                            );
                        });

                    if (hasChanges) {
                        lastChatsUpdateRef.current = Date.now();
                        return newChats;
                    }
                    return prevChats;
                });
            }
        } catch (err) {
            console.error('Error checking for new chats:', err);
        }
    }, [authFetch, stableSetChats]);

    // Проверка новых сообщений в текущем чате
    const checkForNewMessages = useCallback(async () => {
        if (!currentChat || !user) return;

        // Дополнительная проверка по ref
        if (currentChatIdRef.current !== currentChat.id) return;

        if (Date.now() - lastMessagesUpdateRef.current < 1000) return;

        try {
            const response = await authFetch(
                `/api/chat/${currentChat.id}/messages?since=${lastMessagesUpdateRef.current}`
            );
            const result = await response.json();

            if (result.success && result.data.messages.length > 0) {
                setMessages(prev => {
                    // Проверяем что чат все еще активен
                    if (currentChatIdRef.current !== currentChat.id) return prev;

                    const existingIds = new Set(prev.map(msg => msg.id));
                    const newMessages = result.data.messages.filter((msg: Message) => !existingIds.has(msg.id));

                    if (newMessages.length === 0) return prev;

                    lastMessagesUpdateRef.current = Date.now();
                    return [...prev, ...newMessages];
                });
            }
        } catch (err) {
            console.error('Error checking for new messages:', err);
        }
    }, [authFetch, currentChat, user]);

    // Запуск периодической проверки чатов
    const startChatsPolling = useCallback(() => {
        if (chatsPollingRef.current) {
            clearInterval(chatsPollingRef.current);
        }

        // Увеличиваем интервал для чатов
        chatsPollingRef.current = setInterval(() => {
            checkForNewChats();
        }, 5000); // 5 секунд
    }, [checkForNewChats]);

    // Запуск периодической проверки сообщений
    const startMessagesPolling = useCallback(() => {
        if (messagesPollingRef.current) {
            clearInterval(messagesPollingRef.current);
        }

        // Проверяем через ref что чат активен
        if (!currentChatIdRef.current) return;

        messagesPollingRef.current = setInterval(() => {
            // Проверяем что чат все еще активен
            if (currentChatIdRef.current) {
                checkForNewMessages();
            }
        }, 3000);
    }, [checkForNewMessages]);

    // Остановка polling
    const stopPolling = useCallback(() => {
        if (chatsPollingRef.current) {
            clearInterval(chatsPollingRef.current);
            chatsPollingRef.current = null;
        }
        if (messagesPollingRef.current) {
            clearInterval(messagesPollingRef.current);
            messagesPollingRef.current = null;
        }
    }, []);

    // Обработка нового сообщения
    const handleNewMessage = useCallback((newMessage: Message) => {
        const isCurrentChatActive = currentChatIdRef.current === newMessage.chat_id;

        // Мержим сообщения без мерцаний
        messagesCacheRef.current = [
            ...messagesCacheRef.current.filter(msg => msg.id !== newMessage.id),
            newMessage
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        if (isCurrentChatActive) {
            setMessages([...messagesCacheRef.current]);
            if (user && newMessage.sender_id !== user.id) {
                markMessagesAsRead([newMessage.id]);
            }
        }

        // Обновляем список чатов
        stableSetChats(prev => prev.map(chat => {
            if (chat.id === newMessage.chat_id) {
                return {
                    ...chat,
                    last_message: newMessage,
                    unread_count: isCurrentChatActive ? 0 : chat.unread_count + 1,
                    updated_at: new Date().toISOString(),
                };
            }
            return chat;
        }));
    }, [user, markMessagesAsRead, stableSetChats]);

    // Обработка прочитанного сообщения
    const handleMessageRead = useCallback((messageId: number) => {
        setMessages(prev => prev.map(msg =>
            msg.id === messageId
                ? { ...msg, is_read: true }
                : msg
        ));

        stableSetChats(prev => prev.map(chat => {
            if (chat.last_message?.id === messageId) {
                return {
                    ...chat,
                    unread_count: Math.max(0, chat.unread_count - 1),
                };
            }
            return chat;
        }));
    }, [stableSetChats]);

    // Обработка обновления чата
    const handleChatUpdated = useCallback((updatedChat: Chat) => {
        stableSetChats(prev => prev.map(chat =>
            chat.id === updatedChat.id ? updatedChat : chat
        ));

        if (currentChat?.id === updatedChat.id) {
            setCurrentChat(updatedChat);
        }
    }, [currentChat, stableSetChats]);

    const updateChatLastMessage = useCallback((chatId: number, lastMessage: Message) => {
        stableSetChats(prev => prev.map(chat => {
            if (chat.id === chatId) {
                return {
                    ...chat,
                    last_message: lastMessage,
                    updated_at: new Date().toISOString(),
                };
            }
            return chat;
        }));

        // Обновляем кэш
        loadedChatsCacheRef.current = loadedChatsCacheRef.current.map(chat => {
            if (chat.id === chatId) {
                return {
                    ...chat,
                    last_message: lastMessage,
                    updated_at: new Date().toISOString(),
                };
            }
            return chat;
        });
    }, [stableSetChats]);

    // Обработка событий от сервера
    const handleServerEvent = useCallback((data: ServerEvent) => {
        // Debounce - игнорируем события чаще чем раз в 100мс
        const now = Date.now();
        if (now - lastEventTimeRef.current < 100) {
            return;
        }
        lastEventTimeRef.current = now;

        switch (data.type) {
            case 'CONNECTED':
                console.log('Successfully connected to chat server');
                loadChats(true);
                if (chatId) {
                    loadMessages(chatId);
                    loadCurrentChat(chatId);
                }
                break;

            case 'NEW_MESSAGE':
                if (data.message) {
                    handleNewMessage(data.message);
                    updateChatLastMessage(data.message.chat_id, data.message);
                }
                break;

            case 'MESSAGE_READ':
                if (data.messageId) {
                    handleMessageRead(data.messageId);
                }
                break;

            case 'CHAT_UPDATED':
                if (data.chat) {
                    handleChatUpdated(data.chat);
                }
                break;

            default:
                break;
        }
    }, [
        chatId,
        loadChats,
        loadMessages,
        loadCurrentChat,
        handleChatUpdated,
        handleMessageRead,
        handleNewMessage,
        updateChatLastMessage,
    ]);

    // Отправка сообщения
    const sendMessage = useCallback(async (messageText: string) => {
        if (!currentChat || !messageText.trim() || !user) return null;

        const tempMessage: Message = {
            id: -Date.now(),
            chat_id: currentChat.id,
            sender_id: user.id,
            message_text: messageText.trim(),
            message_type: 'text',
            created_at: new Date().toISOString(),
            is_read: true,
            sender: {
                id: user.id,
                username: user.username,
                photo: user.photo,
            },
        };

        try {
            setMessages(prev => [...prev, tempMessage]);

            const response = await authFetch(`/api/chat/${currentChat.id}/messages`, {
                method: 'POST',
                body: JSON.stringify({
                    message_text: messageText.trim(),
                    message_type: 'text',
                }),
            });

            const result = await response.json();

            if (result.success) {
                const serverMessage = result.data.message;

                setMessages(prev => prev.map(msg =>
                    msg.id === tempMessage.id ? serverMessage : msg
                ));

                lastMessagesUpdateRef.current = Date.now();
                return serverMessage;
            }
            setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
            setError(result.error);
            return null;
        } catch (err) {
            console.error('Failed to send message:', err);
            setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
            setError('Failed to send message');
            return null;
        }
    }, [authFetch, currentChat, user]);

    const sendMediaMessage = useCallback(async (
        file: File,
        messageType: 'image' | 'video' | 'file',
        text: string = '',
        chatId?: number // Добавляем опциональный параметр chatId
    ) => {
        // Используем переданный chatId или currentChat.id
        const targetChatId = chatId || currentChat?.id;

        if (!targetChatId || !file || !user) {
            console.log('sendMediaMessage: Missing required data', {
                targetChatId,
                file,
                user,
                currentChatId: currentChat?.id,
                providedChatId: chatId
            });
            return null;
        }

        console.log('sendMediaMessage: Starting upload', {
            targetChatId,
            fileType: file.type,
            fileSize: file.size,
            messageType,
            text
        });

        // Создаем временное сообщение для оптимистичного обновления
        const tempMessage: Message = {
            id: -Date.now(),
            chat_id: targetChatId, // Используем targetChatId
            sender_id: user.id,
            message_text: text || (messageType === 'image' ? '📷 Фото' : messageType === 'video' ? '🎥 Видео' : '📎 Файл'),
            message_type: messageType,
            file_url: URL.createObjectURL(file),
            file_name: file.name,
            file_size: file.size,
            created_at: new Date().toISOString(),
            is_read: true,
            sender: {
                id: user.id,
                username: user.username,
                photo: user.photo,
            },
        };

        try {
            // Оптимистичное обновление
            setMessages(prev => [...prev, tempMessage]);

            const formData = new FormData();
            if (text) formData.append('message_text', text);
            formData.append('message_type', messageType);
            formData.append('media_file', file);

            const token = await tokenManager.getValidAccessToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(`/api/chat/${targetChatId}/messages/media`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            console.log('sendMediaMessage: Response status', response.status);

            const result = await response.json();
            console.log('sendMediaMessage: Response result', result);

            if (result.success) {
                const serverMessage = result.data.message;

                // Заменяем временное сообщение на серверное
                setMessages(prev => prev.map(msg =>
                    msg.id === tempMessage.id ? serverMessage : msg
                ));

                // Очищаем временный URL
                if (tempMessage.file_url) {
                    URL.revokeObjectURL(tempMessage.file_url);
                }

                lastMessagesUpdateRef.current = Date.now();
                return serverMessage;
            }

            // Если ошибка - удаляем временное сообщение
            setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
            setError(result.error || 'Failed to send media message');
            return null;

        } catch (err) {
            console.error('Failed to send media message:', err);
            setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
            setError('Failed to send media message');
            return null;
        }
    }, [currentChat, user]);

    // Инициализация SSE соединения
    const initEventSource = useCallback(async () => {
        // Если уже подключаемся, выходим
        if (isConnectingRef.current) return;

        try {
            isConnectingRef.current = true;

            const token = await tokenManager.getValidAccessToken();
            if (!token) {
                console.log('No token available for SSE');
                isConnectingRef.current = false;
                return;
            }

            // Закрываем существующее соединение
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }

            // Очищаем предыдущий таймер
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            const eventSource = new EventSource(`/api/chat/events?token=${encodeURIComponent(token)}&t=${Date.now()}`);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log('SSE connected successfully');
                setIsConnected(true);
                isConnectingRef.current = false;
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data) as ServerEvent;
                    console.log('SSE message received:', data.type);
                    handleServerEvent(data);
                } catch (err) {
                    console.error('Error parsing server event:', err);
                }
            };

            eventSource.onerror = (err) => {
                console.error('SSE connection error:', err);
                setIsConnected(false);
                isConnectingRef.current = false;

                // Закрываем соединение
                if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                    eventSourceRef.current = null;
                }

                // Переподключаемся через 3 секунды
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('Attempting SSE reconnection...');
                    initEventSource();
                }, 3000);
            };
        } catch (err) {
            console.error('Error initializing SSE:', err);
            setIsConnected(false);
            isConnectingRef.current = false;

            reconnectTimeoutRef.current = setTimeout(() => {
                initEventSource();
            }, 5000);
        }
    }, [handleServerEvent]);

    // Автоматическое прочитывание сообщений при открытии чата
    useEffect(() => {
        if (currentChat && messages.length > 0 && user) {
            const unreadMessages = messages
                .filter((msg) => !msg.is_read && msg.sender_id !== user.id)
                .map((msg) => msg.id);

            if (unreadMessages.length > 0) {
                markMessagesAsRead(unreadMessages);
            }
        }
    }, [currentChat, messages, markMessagesAsRead, user]);

    // Управление polling при изменении состояния
    useEffect(() => {
        if (!user) return;

        // Запускаем polling для чатов
        startChatsPolling();

        // Запускаем polling для сообщений только если есть активный чат
        if (currentChat) {
            startMessagesPolling();
        }

        return () => {
            stopPolling();
        };
    }, [user, currentChat, startChatsPolling, startMessagesPolling, stopPolling]);

    useEffect(() => {
        if (currentChat && user) {
            startMessagesPolling();
        } else {
            // Останавливаем polling сообщений если чат не активен
            if (messagesPollingRef.current) {
                clearInterval(messagesPollingRef.current);
                messagesPollingRef.current = null;
            }
        }
    }, [currentChat, user, startMessagesPolling]);

    // Инициализация при монтировании
    useEffect(() => {
        if (!user) return;

        let mounted = true;

        const initialize = async () => {
            if (mounted) {
                await initEventSource();
                await loadChats();
            }
        };

        initialize();

        return () => {
            mounted = false;
            isConnectingRef.current = false;

            // Останавливаем все таймеры
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            // Закрываем SSE соединение
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }

            // Останавливаем polling
            stopPolling();

            // Сбрасываем состояния
            setIsConnected(false);
        };
    }, [user, initEventSource, loadChats, stopPolling]);

    // Загрузка сообщений и данных чата при изменении chatId
    useEffect(() => {
        if (chatId && user) {
            currentChatIdRef.current = chatId;
            // Не сбрасываем messages до загрузки
            loadMessages(chatId).then(() => {
                loadCurrentChat(chatId);
            });
        } else {
            currentChatIdRef.current = null;
            messagesCacheRef.current = [];
            setMessages([]);
            setCurrentChat(null);
        }
    }, [chatId, user, loadMessages, loadCurrentChat]);

    return {
        chats,
        messages,
        currentChat,
        loading,
        error,
        isConnected,
        sendMessage,
        sendMediaMessage,
        loadChats,
        loadMessages,
        checkForNewMessages: checkForNewChats,
        searchUsers,
        createChat,
    };
};

