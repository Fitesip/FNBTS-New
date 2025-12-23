// src/app/messenger/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/context/AuthContext';
import UserPhoto from '@/components/UserPhoto';
import CreateChatModal from '@/components/CreateChatModal';
import { ChatParticipant, Chat as ChatType, Message } from '@/types/chat';
import { useRouter } from "next/navigation";
import Image from "next/image";

interface MessengerContentProps {
    chats: ChatType[];
    messages: Message[];
    currentChat: ChatType | null;
    loading: {
        chats: boolean;
        messages: boolean;
        currentChat: boolean;
    };
    error: string | null;
    isConnected: boolean;
    selectedChat: number | null;
    user: { id: number; username: string; photo?: string };
    onSelectChat: (id: number) => void;
    onSendMediaMessage: (file: File, messageType: 'image' | 'video' | 'file', text?: string) => Promise<Message | null>;
    onSendMessage: (message: string) => Promise<void>;
    formatTime: (date: string) => string;
    formatDate: (date: string) => string;
    newMessage: string;
    setNewMessage: (message: string) => void;
    isSending: boolean;
    isUploading: boolean;
    onRetry: () => void;
    onCheckMessages: () => void;
    onCreateChat: () => void;
}

// Мемоизированный компонент списка чатов
const ChatsList = memo(({
                            chats,
                            selectedChat,
                            onSelectChat,
                            user,
                            formatTime
                        }: {
    chats: ChatType[];
    selectedChat: number | null;
    onSelectChat: (id: number) => void;
    user: { id: number; username: string };
    formatTime: (date: string) => string;
}) => {

    // В компоненте ChatsList замените функцию:
    const getLastMessagePreview = (lastMessage?: Message) => {
        if (!lastMessage) return 'Нет сообщений';

        // Для медиа-сообщений всегда показываем иконку, даже если есть текстовое описание
        if (lastMessage.message_type === 'image') {
            return lastMessage.message_text ? `📷 ${lastMessage.message_text}` : '📷 Фото';
        } else if (lastMessage.message_type === 'video') {
            return lastMessage.message_text ? `🎥 ${lastMessage.message_text}` : '🎥 Видео';
        } else if (lastMessage.message_type === 'file') {
            return lastMessage.message_text ? `📎 ${lastMessage.message_text}` : `📎 ${lastMessage.file_name || 'Файл'}`;
        } else {
            return lastMessage.message_text || 'Нет сообщений';
        }
    };


    return (
        <>
            {chats.map((chat) => (
                <div
                    key={chat.id}
                    onClick={() => onSelectChat(chat.id)}
                    className={`mt-2 p-3 lg:p-4 text-cwhite-1 border border-cgray-2 rounded-lg bg-filter hover:bg-cgray-1 hover:scale-95 transition-all cursor-pointer ${
                        selectedChat === chat.id ? 'bg-cgray-1 scale-95' : 'bg-cgray-2'
                    }`}
                >
                    <div className="flex items-center gap-2 lg:gap-3">
                        <UserPhoto
                            userId={chat.participants.find((p) => p.user_id !== user.id)?.user_id}
                            username={
                                chat.is_group
                                    ? chat.group_name
                                    : chat.participants.find((p) => p.user_id !== user.id)?.user.username || 'User'
                            }
                            className="size-8 lg:size-12 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-1 lg:gap-2 mb-1">
                                <p className="font-semibold truncate text-cwhite-1 text-sm lg:text-base">
                                    {chat.is_group
                                        ? chat.group_name
                                        : chat.participants.find((p) => p.user_id !== user.id)?.user.username || 'User'
                                    }
                                </p>
                                {chat.unread_count > 0 && (
                                    <span className="bg-red-1 text-white text-xs rounded-full px-1 lg:px-2 py-0.5 lg:py-1 shrink-0 min-w-4 lg:min-w-5 text-center">
                    {chat.unread_count}
                  </span>
                                )}
                            </div>
                            <p className="text-xs lg:text-sm truncate text-cwhite-1">
                                {getLastMessagePreview(chat.last_message)}
                            </p>
                            {chat.last_message?.created_at && (
                                <p className="text-xs mt-1 text-cwhite-1">
                                    {formatTime(chat.last_message.created_at)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
});

ChatsList.displayName = 'ChatsList';

// Мемоизированный компонент сообщений
const MessagesList = memo(({
                               messages,
                               user,
                               formatTime,
                               formatDate
                           }: {
    messages: Message[];
    user: { id: number; username: string; photo?: string };
    formatTime: (date: string) => string;
    formatDate: (date: string) => string;
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="space-y-3 lg:space-y-4">
            {messages.map((message, index) => {
                const showDate = index === 0 ||
                    new Date(message.created_at).toDateString() !==
                    new Date(messages[index - 1].created_at).toDateString();

                return (
                    <div key={message.id}>
                        {showDate && (
                            <div className="flex justify-center my-4 lg:my-6">
                <span className="p-2 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter text-xs lg:text-sm">
                  {formatDate(message.created_at)}
                </span>
                            </div>
                        )}
                        <div
                            className={`flex gap-1 lg:gap-2 items-end ${message.sender_id === user.id ? 'flex-row-reverse' : 'justify-start'}`}
                        >
                            <UserPhoto
                                userId={message.sender_id}
                                username={message.sender?.username}
                                className="size-5 lg:size-6"
                                onClick={() => router.push(`/user/${message.sender_id}`)}
                            />
                            <div
                                className={`max-w-[75%] lg:max-w-[70%] p-2 lg:p-3 rounded-lg flex flex-col gap-0.5 lg:gap-1 ${
                                    message.sender_id === user.id
                                        ? 'text-cwhite-1 bg-cgray-1 border border-cgray-2 rounded-lg rounded-br-none'
                                        : 'text-cwhite-1 bg-cgray-1 border border-cgray-2 rounded-lg rounded-bl-none'
                                }`}
                            >
                                {/* Рендеринг медиа */}
                                {message.message_type === 'image' && message.file_url && (
                                    <div className="mb-2">
                                        <img
                                            src={message.file_url}
                                            alt="Attached image"
                                            className="max-w-full h-auto rounded-lg max-h-48 object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                )}

                                {message.message_type === 'video' && message.file_url && (
                                    <div className="mb-2">
                                        <video
                                            controls
                                            className="max-w-full h-auto rounded-lg max-h-48"
                                            preload="metadata"
                                        >
                                            <source src={message.file_url} type="video/mp4" />
                                            Ваш браузер не поддерживает видео.
                                        </video>
                                    </div>
                                )}

                                {message.message_type === 'file' && message.file_url && (
                                    <div className="mb-2 p-2 bg-white bg-opacity-20 rounded">
                                        <a
                                            href={message.file_url}
                                            download={message.file_name}
                                            className="flex items-center gap-2 text-sm hover:underline"
                                        >
                                            📎 {message.file_name}
                                            {message.file_size && (
                                                <span className="text-xs opacity-75">
                                                    ({(message.file_size / 1024 / 1024).toFixed(1)} MB)
                                                </span>
                                            )}
                                        </a>
                                    </div>
                                )}

                                {/* Текст сообщения */}
                                {message.message_text && (
                                    <p className="text-xs lg:text-sm wrap-break-word">{message.message_text}</p>
                                )}

                                <div className={`text-xs flex gap-2 items-center justify-end`}>
                                    {formatTime(message.created_at)}
                                    {message.id < 0 && (
                                        <Image src={'/fnts.png'} alt={'fnts'} width={12} height={12} className={`size-3 grayscale animate-spin duration-75`}/>
                                    )}
                                    {message.is_read ? (
                                        ((message.sender_id == user.id) && (
                                            <Image src={'/fnts.png'} alt={'fnts'} width={12} height={12} className={`size-3`}/>
                                        ))
                                    ) : (
                                        ((message.sender_id == user.id) && (
                                            <Image src={'/fnts.png'} alt={'fnts'} width={12} height={12} className={`size-3 grayscale`}/>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
});

MessagesList.displayName = 'MessagesList';

// Мемоизированный компонент шапки чата
const ChatHeader = memo(({
                             currentChat,
                             loading,
                             user,
                             onBack
                         }: {
    currentChat: ChatType | null;
    loading: boolean;
    user: { id: number; username: string; photo?: string };
    onBack: () => void;
}) => {
    if (loading) {
        return (
            <div className="p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-t-lg bg-filter">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 lg:gap-3">
                        <div className="size-8 lg:size-10 bg-cgray-1 rounded-full animate-pulse" />
                        <div className="space-y-1 lg:space-y-2">
                            <div className="h-3 lg:h-4 w-24 lg:w-32 bg-cgray-1 rounded animate-pulse" />
                            <div className="h-2 lg:h-3 w-16 lg:w-24 bg-cgray-1 rounded animate-pulse" />
                        </div>
                    </div>
                    <button
                        onClick={onBack}
                        className="text-gray-400 hover:text-gray-600 transition-colors lg:hidden p-2"
                        title="Назад к списку чатов"
                    >
                        ←
                    </button>
                </div>
            </div>
        );
    }

    if (currentChat?.is_group) {
        return (
            <div className="p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-t-lg bg-filter">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 lg:gap-3">
                        <div className="size-8 lg:size-10 bg-cyan-1 rounded-full flex items-center justify-center text-white font-semibold text-sm lg:text-lg">
                            {currentChat.group_name ? currentChat.group_name.charAt(0).toUpperCase() : 'Г'}
                        </div>
                        <div>
                            <h2 className="font-semibold text-cwhite-1 text-sm lg:text-base">
                                {currentChat.group_name || 'Групповой чат'}
                            </h2>
                            <p className="text-xs lg:text-sm text-green-1">
                                {currentChat.participants?.length || 0} участников
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onBack}
                        className="text-gray-400 hover:text-gray-600 transition-colors lg:hidden p-2"
                        title="Назад к списку чатов"
                    >
                        ←
                    </button>
                </div>
            </div>
        );
    }

    if (currentChat && Array.isArray(currentChat.participants) && currentChat.participants.length > 0) {
        const otherParticipant = currentChat.participants.find(
            (p: ChatParticipant) => p.user_id !== user.id
        );

        if (otherParticipant) {
            return (
                <div className="p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-t-lg bg-filter">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 lg:gap-3">
                            <UserPhoto
                                userId={otherParticipant.user_id}
                                username={otherParticipant.user?.username || 'User'}
                                className="size-8 lg:size-10"
                                withUsername={false}
                            />
                            <div>
                                <h2 className="font-semibold text-cwhite-1 text-sm lg:text-base">
                                    {otherParticipant.user?.username}
                                </h2>
                                <p className="text-xs lg:text-sm text-green-1">в сети</p>
                            </div>
                        </div>
                        <button
                            onClick={onBack}
                            className="text-gray-400 hover:text-gray-600 transition-colors lg:hidden p-2"
                            title="Назад к списку чатов"
                        >
                            ←
                        </button>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-t-lg bg-filter">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 lg:gap-3">
                    <div className="size-8 lg:size-10 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm lg:text-lg">
                        ?
                    </div>
                    <div>
                        <h2 className="font-semibold text-cwhite-1 text-sm lg:text-base">Чат</h2>
                        <p className="text-xs lg:text-sm text-cwhite-1">загрузка...</p>
                    </div>
                </div>
                <button
                    onClick={onBack}
                    className="text-gray-400 hover:text-gray-600 transition-colors lg:hidden p-2"
                    title="Назад к списку чатов"
                >
                    ←
                </button>
            </div>
        </div>
    );
});

ChatHeader.displayName = 'ChatHeader';

// Мемоизированный компонент формы отправки сообщения
const MessageForm = memo(({
                              newMessage,
                              setNewMessage,
                              isSending,
                              isUploading,
                              onSendMessage,
                              onSendMedia
                          }: {
    newMessage: string;
    setNewMessage: (message: string) => void;
    isSending: boolean;
    isUploading: boolean;
    onSendMessage: (e: React.FormEvent) => void;
    onSendMedia: (file: File, messageType: 'image' | 'video' | 'file') => void;
}) => {
    const [showMediaMenu, setShowMediaMenu] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Определяем тип файла
            let messageType: 'image' | 'video' | 'file' = 'file';
            if (file.type.startsWith('image/')) {
                messageType = 'image';
            } else if (file.type.startsWith('video/')) {
                messageType = 'video';
            }

            onSendMedia(file, messageType);
            setShowMediaMenu(false);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <form onSubmit={onSendMessage} className="px-1 py-3 lg:px-4 lg:py-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-b-lg bg-filter">
            <div className="flex gap-2 lg:gap-3">
                {/* Кнопка прикрепления медиа */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowMediaMenu(!showMediaMenu)}
                        disabled={isUploading}
                        className="bg-cgray-1 text-cwhite-1 p-2 rounded-lg hover:bg-cgray-2 disabled:opacity-50 transition-colors border border-cgray-2"
                    >
                        {isUploading ? (
                            <div className="w-4 h-4 border-2 border-cwhite-1 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            '📎'
                        )}
                    </button>

                    {/* Меню медиа */}
                    {showMediaMenu && (
                        <div className="absolute bottom-full left-0 mb-2 bg-cgray-1 border border-cgray-2 rounded-lg shadow-lg p-2 z-10">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-cwhite-1 hover:bg-cgray-2 rounded transition-colors"
                            >
                                📷 Фото/Видео
                            </button>
                        </div>
                    )}

                    {/* Скрытый input для файлов */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,video/*"
                        className="hidden"
                    />
                </div>

                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Введите сообщение..."
                    className="flex-1 border border-gray-300 rounded-lg px-2 lg:px-4 py-2 lg:py-3 focus:outline-none focus:ring-2 focus:ring-cyan-1 focus:border-transparent bg-cgray-1 text-cwhite-1 placeholder-gray-400 text-sm lg:text-base"
                    disabled={isSending || isUploading}
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending || isUploading}
                    className="bg-cyan-1 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-lg hover:bg-cyan-1/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 lg:gap-2 text-sm lg:text-base whitespace-nowrap"
                >
                    {isSending ? (
                        <>
                            <div className="w-3 h-3 lg:w-4 lg:h-4 border-2 border-cwhite-1 border-t-transparent rounded-full animate-spin" />
                            <span className="hidden xs:inline">Отправка...</span>
                        </>
                    ) : (
                        <span>
                            <span className={`hidden lg:block`}>
                                Отправить
                            </span>
                            <svg className="w-4 h-4 lg:hidden visible" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                        </span>
                    )}
                </button>
            </div>
        </form>
    );
});

MessageForm.displayName = 'MessageForm';

// Мемоизированный основной контент
const MessengerContent = memo(({
                                   chats,
                                   messages,
                                   currentChat,
                                   loading,
                                   error,
                                   isConnected,
                                   selectedChat,
                                   user,
                                   onSelectChat,
                                   onSendMessage,
                                   onSendMediaMessage,
                                   formatTime,
                                   formatDate,
                                   newMessage,
                                   setNewMessage,
                                   isSending,
                                   isUploading,
                                   onRetry,
                                   onCheckMessages,
                                   onCreateChat
                               }: MessengerContentProps) => {

    const handleSendMessage = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        onSendMessage(newMessage);
    }, [onSendMessage, newMessage]);

    const handleBack = useCallback(() => {
        onSelectChat(0);
    }, [onSelectChat]);

    const handleSendMedia = useCallback(async (file: File, messageType: 'image' | 'video' | 'file') => {
        await onSendMediaMessage(file, messageType);
    }, [onSendMediaMessage]);

    return (
        <div className="h-155 lg:h-165 lg:w-300 w-90 p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10">
            <div className="flex flex-col lg:flex-row h-130 lg:h-145 gap-3 lg:gap-4">
                {/* Боковая панель с чатами */}
                <div className={`w-full lg:w-80 flex flex-col ${selectedChat ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="px-2 lg:px-4">
                        {error && (
                            <div className="mb-3 lg:mb-4 p-2 lg:p-3 bg-red-1 border border-red-2 rounded-lg">
                                <div className="flex items-center">
                                    <div className="text-white mr-2">⚠️</div>
                                    <div>
                                        <p className="text-white font-medium text-xs lg:text-sm">Ошибка</p>
                                        <p className="text-white text-xs">{error}</p>
                                        <button
                                            onClick={onRetry}
                                            className="text-white hover:text-gray-200 text-xs underline mt-1"
                                        >
                                            Попробовать снова
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isConnected && !error ? (
                            <div className="mb-3 lg:mb-4 p-2 lg:p-3 bg-yellow-1 border border-yellow-2 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse" />
                                        <span className="text-white text-xs lg:text-sm">Подключение...</span>
                                    </div>
                                    <button
                                        onClick={onCheckMessages}
                                        className="text-white hover:text-gray-200 text-xs underline"
                                    >
                                        Проверить
                                    </button>
                                </div>
                            </div>
                        ) : null}
                        {isConnected && !error ? (
                            <button
                                onClick={onCreateChat}
                                className="w-full p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:bg-cgray-1 hover:scale-95 transition-all text-sm lg:text-base"
                            >
                                + Создать чат
                            </button>
                        ) : null}
                    </div>

                    <div className="flex-1 overflow-y-auto mt-2">
                        {loading.chats ? (
                            <div className="p-3 lg:p-4 text-center text-gray-500 text-sm lg:text-base">
                                <div className="animate-spin rounded-full h-5 w-5 lg:h-6 lg:w-6 border-b-2 border-cyan-1 mx-auto mb-2" />
                                Загрузка чатов...
                            </div>
                        ) : chats.length === 0 ? (
                            <div className="p-4 lg:p-6 text-center text-gray-500">
                                <div className="text-3xl lg:text-4xl mb-2 lg:mb-3">💬</div>
                                <p className="mb-1 lg:mb-2 text-sm lg:text-base">Нет чатов</p>
                                <p className="text-xs lg:text-sm mb-3 lg:mb-4">Создайте первый чат чтобы начать общение</p>
                                <button
                                    onClick={onCreateChat}
                                    className="bg-cyan-1 text-white px-3 lg:px-4 py-1 lg:py-2 rounded-lg text-xs lg:text-sm hover:bg-cyan-1/70 transition-colors"
                                >
                                    Создать чат
                                </button>
                            </div>
                        ) : (
                            <ChatsList
                                chats={chats}
                                selectedChat={selectedChat}
                                onSelectChat={onSelectChat}
                                user={user}
                                formatTime={formatTime}
                            />
                        )}
                    </div>
                </div>

                {/* Основная область чата */}
                <div className={`flex-1 h-155 flex flex-col ${selectedChat ? 'flex' : 'hidden lg:flex'}`}>
                    {!selectedChat ? (
                        <div className="flex-1 flex items-center justify-center p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                            <div className="text-center text-cwhite-1">
                                <div className="text-4xl lg:text-6xl mb-3 lg:mb-4">💭</div>
                                <h3 className="text-lg lg:text-xl font-semibold mb-1 lg:mb-2">Выберите чат</h3>
                                <p className="text-sm lg:text-base">Выберите существующий чат или создайте новый</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <ChatHeader
                                currentChat={currentChat}
                                loading={loading.currentChat}
                                user={user}
                                onBack={handleBack}
                            />

                            {/* Область сообщений */}
                            <div className="flex-1 overflow-y-auto px-3 lg:px-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 bg-filter max-h-115">
                                {loading.messages ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center text-cwhite-1">
                                            <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-cyan-1 mx-auto mb-2" />
                                            <p className="text-sm lg:text-base">Загрузка сообщений...</p>
                                        </div>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center text-cwhite-1">
                                            <div className="text-3xl lg:text-4xl mb-2 lg:mb-3">💬</div>
                                            <p className="text-sm lg:text-base">Нет сообщений</p>
                                            <p className="text-xs lg:text-sm">Начните общение первым!</p>
                                        </div>
                                    </div>
                                ) : (
                                    <MessagesList
                                        messages={messages}
                                        user={user}
                                        formatTime={formatTime}
                                        formatDate={formatDate}
                                    />
                                )}
                            </div>

                            <MessageForm
                                newMessage={newMessage}
                                setNewMessage={setNewMessage}
                                isSending={isSending}
                                isUploading={isUploading}
                                onSendMessage={handleSendMessage}
                                onSendMedia={handleSendMedia}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

MessengerContent.displayName = 'MessengerContent';

export default function MessengerPage() {
    const [selectedChat, setSelectedChat] = useState<number | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const { user } = useAuth();
    const {
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
        checkForNewMessages,
    } = useChat(selectedChat || undefined);

    useEffect(() => {
        if (!user) return;
        document.title = `Мессенджер | ФНБТС`

        const metaDescription = document.querySelector('meta[name="description"]')
        if (metaDescription) {
            metaDescription.setAttribute('content', `Общайтесь с другими на ФНБТС!`)
        } else {
            const newMeta = document.createElement('meta')
            newMeta.name = `description`
            newMeta.content = `Общайтесь с другими на ФНБТС!`
            document.head.appendChild(newMeta)
        }
    }, [user])

    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat);
        }
    }, [selectedChat, loadMessages]);

    const handleSendMessage = useCallback(async (messageText: string) => {
        if (!selectedChat || !messageText.trim() || isSending) return;

        setIsSending(true);
        try {
            await sendMessage(messageText.trim());
            setNewMessage('');
        } catch (err) {
            console.error('Error sending message:', err);
        } finally {
            setIsSending(false);
        }
    }, [selectedChat, sendMessage, isSending]);

    const handleSendMediaMessage = useCallback(async (file: File, messageType: 'image' | 'video' | 'file', text?: string): Promise<Message | null> => {
        if (!selectedChat || isUploading) return null;

        setIsUploading(true);
        try {
            const result = await sendMediaMessage(file, messageType, text);
            return result;
        } catch (err) {
            console.error('Error sending media:', err);
            return null;
        } finally {
            setIsUploading(false);
        }
    }, [selectedChat, sendMediaMessage, isUploading]);

    const handleChatCreated = useCallback((chatId: number) => {
        setSelectedChat(chatId);
        setShowCreateModal(false);
        loadChats();
    }, [loadChats]);

    const handleSelectChat = useCallback((chatId: number) => {
        setSelectedChat(chatId);
    }, []);

    const handleRetry = useCallback(() => {
        loadChats();
        if (selectedChat) {
            loadMessages(selectedChat);
        }
    }, [loadChats, loadMessages, selectedChat]);

    const handleCreateChat = useCallback(() => {
        setShowCreateModal(true);
    }, []);

    const formatTime = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }, []);

    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }, []);

    if (!user) {
        return (
            <div className="p-4 lg:p-6 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter mx-4 lg:mx-0">
                <div className="text-center py-6 lg:py-8">
                    <p className="mb-4 text-sm lg:text-base">Для использования мессенджера необходимо авторизоваться</p>
                    <button
                        onClick={() => { window.location.href = '/auth/login?redirect=/messenger'; }}
                        className="p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:bg-cgray-1 hover:scale-95 transition-all text-sm lg:text-base"
                    >
                        Войти
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-160 lg:h-175 p-3 lg:p-4 mt-5 min-w-80 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 mx-4 lg:mx-auto max-w-7xl mb-5 lg:mb-0">
            <div className="w-full">
                <MessengerContent
                    chats={chats}
                    messages={messages}
                    currentChat={currentChat}
                    loading={loading}
                    error={error}
                    isConnected={isConnected}
                    selectedChat={selectedChat}
                    user={user}
                    onSelectChat={handleSelectChat}
                    onSendMediaMessage={handleSendMediaMessage}
                    onSendMessage={handleSendMessage}
                    formatTime={formatTime}
                    formatDate={formatDate}
                    newMessage={newMessage}
                    setNewMessage={setNewMessage}
                    isSending={isSending}
                    isUploading={isUploading}
                    onRetry={handleRetry}
                    onCheckMessages={checkForNewMessages}
                    onCreateChat={handleCreateChat}
                />

                <CreateChatModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onChatCreated={handleChatCreated}
                />
            </div>
        </div>
    );
}