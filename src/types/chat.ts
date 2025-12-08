// src/types/chat.ts
export interface ChatUser {
    id: number;
    username: string;
    photo?: string;
}

export interface Chat {
    id: number;
    created_at: string;
    updated_at: string;
    is_group: boolean;
    group_name?: string;
    group_photo?: string;
    participants: ChatParticipant[];
    last_message?: Message;
    unread_count: number;
}

export interface ChatParticipant {
    id: number;
    chat_id: number;
    user_id: number;
    joined_at: string;
    user: ChatUser;
}

export interface CreateChatRequest {
    participant_ids: number[];
    is_group?: boolean;
    group_name?: string;
}

// Обновляем интерфейс Message
export interface Message {
    id: number;
    chat_id: number;
    sender_id: number;
    message_text: string;
    message_type: 'text' | 'image' | 'video' | 'file'; // добавляем video
    file_url?: string;
    file_name?: string;
    file_size?: number;
    file_duration?: number; // для видео
    thumbnail_url?: string; // превью для видео
    created_at: string;
    is_read: boolean;
    sender: ChatUser;
    read_by?: number[];
}

export interface WebSocketMessage {
    type: 'NEW_MESSAGE' | 'MESSAGE_READ' | 'CHAT_UPDATED' | 'CHAT_CREATED';
    message?: Message;
    messageId?: number;
    userId?: number;
    chatId?: number;
    chat?: Chat;
}

// Тип для создания сообщения с медиа
export interface CreateMessageData {
    message_text?: string;
    message_type: 'text' | 'image' | 'video' | 'file';
    file?: File;
}