// src/types/socket.ts
export interface SendMessageData {
    chat_id: number;
    sender_id: number;
    message_text: string;
    message_type?: 'text' | 'image' | 'file';
    file_url?: string;
}

export interface MarkAsReadData {
    message_ids: number[];
    user_id: number;
    chat_id: number;
}

export interface NewMessageData {
    id: number;
    chat_id: number;
    sender_id: number;
    message_text: string;
    message_type: 'text' | 'image' | 'file';
    file_url?: string;
    created_at: string;
    is_read: boolean;
    sender: {
        id: number;
        username: string;
        photo?: string;
    };
}

export interface MessagesReadData {
    message_ids: number[];
    user_id: number;
    chat_id: number;
}