// src/app/components/Messenger.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/context/AuthContext';
import UserPhoto from './UserPhoto';
import CreateChatModal from './CreateChatModal';
import {ChatParticipant} from "@/types/chat";

export default function Messenger() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedChat, setSelectedChat] = useState<number | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const { user } = useAuth();
    const {
        chats,
        messages,
        currentChat,
        loading,
        error,
        isConnected,
        sendMessage,
        loadChats,
        loadMessages
    } = useChat(selectedChat || undefined);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Загрузка сообщений при выборе чата
    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat);
        }
    }, [selectedChat, loadMessages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newMessage.trim() || !selectedChat || isSending) return;

        setIsSending(true);
        try {
            await sendMessage(newMessage.trim());
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleChatCreated = (chatId: number) => {
        setSelectedChat(chatId);
        setShowCreateModal(false);
        loadChats();
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // Автоматическая прокрутка к последнему сообщению
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (!user) {
        return (
            <div className="fixed bottom-4 right-4">
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600"
                >
                    💬
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Кнопка мессенджера */}
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 relative transition-colors"
                >
                    💬
                    {chats.some(chat => chat.unread_count > 0) && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {chats.reduce((total, chat) => total + chat.unread_count, 0)}
                        </span>
                    )}
                </button>
            </div>

            {/* Окно мессенджера */}
            {isOpen && (
                <div className="fixed bottom-20 right-4 w-80 h-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
                    <div className="bg-blue-500 text-white p-3 rounded-t-lg flex justify-between items-center shrink-0">
                        <h3 className="font-semibold">Мессенджер</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="text-white hover:text-gray-200 text-lg font-bold transition-colors"
                            >
                                +
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white hover:text-gray-200 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                        {!selectedChat ? (
                            <div className="flex-1 overflow-y-auto">
                                {loading ? (
                                    <div className="p-4 text-center text-gray-500">Загрузка...</div>
                                ) : chats.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">
                                        <p>Нет чатов</p>
                                        <button
                                            onClick={() => setShowCreateModal(true)}
                                            className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                                        >
                                            Создать чат
                                        </button>
                                    </div>
                                ) : (
                                    chats.map(chat => (
                                        <div
                                            key={chat.id}
                                            onClick={() => setSelectedChat(chat.id)}
                                            className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors"
                                        >
                                            <UserPhoto
                                                username={chat.is_group ? chat.group_name : chat.participants.find(p => p.user_id !== user.id)?.user.username}
                                                className="size-8 shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center gap-2">
                                                    <p className="font-medium text-sm truncate">
                                                        {chat.is_group
                                                            ? chat.group_name
                                                            : chat.participants.find(p => p.user_id !== user.id)?.user.username
                                                        }
                                                    </p>
                                                    {chat.unread_count > 0 && (
                                                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 shrink-0">
                                                            {chat.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {chat.last_message?.message_text}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="p-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50 shrink-0">
                                    <button
                                        onClick={() => setSelectedChat(null)}
                                        className="text-gray-500 hover:text-gray-700 transition-colors shrink-0"
                                    >
                                        ←
                                    </button>

                                    {/* Показываем индикатор загрузки если выбран чат но данные еще не загружены */}
                                    {selectedChat && !currentChat ? (
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="size-8 bg-gray-300 rounded-full animate-pulse shrink-0"></div>
                                            <div className="h-4 bg-gray-300 rounded animate-pulse flex-1 max-w-32"></div>
                                        </div>
                                    ) : currentChat?.is_group ? (
                                        // Групповой чат
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="size-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                                {currentChat.group_name ? currentChat.group_name.charAt(0).toUpperCase() : 'Г'}
                                            </div>
                                            <span className="font-medium truncate">
                                                {currentChat.group_name || 'Групповой чат'}
                                            </span>
                                        </div>
                                    ) : currentChat && Array.isArray(currentChat.participants) && currentChat.participants.length > 0 ? (
                                        // Личный чат с данными участников
                                        (() => {
                                            const otherParticipant = currentChat.participants.find((p: ChatParticipant) => p.user_id !== user?.id);
                                            return otherParticipant ? (
                                                <div className={`flex items-center gap-3`}>
                                                    <UserPhoto
                                                        username={otherParticipant.user?.username || 'User'}
                                                        className="size-8"
                                                        withUsername={true}
                                                    />
                                                    <p>{otherParticipant.user?.username}</p>
                                                </div>

                                            ) : (
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="size-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm shrink-0">
                                                        ?
                                                    </div>
                                                    <span className="font-medium truncate">Чат</span>
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        // Заглушка если нет данных
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="size-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm shrink-0">
                                                ?
                                            </div>
                                            <span className="font-medium truncate">Чат</span>
                                        </div>
                                    )}
                                </div>

                                {/* Индикаторы состояния */}
                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 mx-3 mt-2">
                                        <div className="flex items-center">
                                            <div className="text-red-500 mr-2">⚠️</div>
                                            <div>
                                                <p className="text-red-800 font-medium text-sm">Ошибка</p>
                                                <p className="text-red-600 text-xs">{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isConnected && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mx-3 mt-2">
                                        <div className="flex items-center">
                                            <div className="text-yellow-500 mr-2">🔌</div>
                                            <p className="text-yellow-800 text-sm">Подключение...</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                                    {messages.length === 0 ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="text-center text-gray-500">
                                                <div className="text-4xl mb-3">💬</div>
                                                <p>Нет сообщений</p>
                                                <p className="text-sm">Начните общение первым!</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {messages.map((message, index) => {
                                                const showDate = index === 0 ||
                                                    new Date(message.created_at).toDateString() !==
                                                    new Date(messages[index - 1].created_at).toDateString();

                                                return (
                                                    <div key={message.id}>
                                                        {showDate && (
                                                            <div className="flex justify-center my-6">
                                                                <span className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 border">
                                                                    {formatDate(message.created_at)}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div
                                                            className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                                                        >
                                                            <div
                                                                className={`max-w-[85%] p-3 rounded-lg ${
                                                                    message.sender_id === user.id
                                                                        ? 'bg-blue-500 text-white rounded-br-none'
                                                                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                                                }`}
                                                            >
                                                                <p className="text-sm wrap-break-word">{message.message_text}</p>
                                                                <p className={`text-xs mt-1 ${
                                                                    message.sender_id === user.id
                                                                        ? 'text-blue-100'
                                                                        : 'text-gray-500'
                                                                }`}>
                                                                    {formatTime(message.created_at)}
                                                                    {message.id < 0 && ' ⏳'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 shrink-0">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Сообщение..."
                                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            disabled={isSending}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim() || isSending}
                                            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-2"
                                        >
                                            {isSending ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                </>
                                            ) : (
                                                'Отпр'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <CreateChatModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onChatCreated={handleChatCreated}
            />
        </>
    );
}