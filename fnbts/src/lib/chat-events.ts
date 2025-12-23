// src/lib/chat-events.ts
export interface ServerEvent {
    type: string;
    [key: string]: unknown;
}

export interface ClientConnection {
    userId: number;
    controller: ReadableStreamDefaultController;
    deviceId: string;
}

export interface ChatParticipant {
    user_id: number;
}

// Хранилище для клиентских соединений
export const clients = new Map<number, ClientConnection[]>();

// Генерируем уникальный ID для устройства
export function generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function sendToUser(userId: number, data: ServerEvent, excludeDeviceId?: string): void {
    const userClients = clients.get(userId);
    if (userClients) {
        userClients.forEach(client => {
            if (client.deviceId !== excludeDeviceId) {
                try {
                    const message = `data: ${JSON.stringify(data)}\n\n`;
                    client.controller.enqueue(message);
                } catch (error) {
                    console.error('Error sending event to user:', error);
                }
            }
        });
    }
}

export function broadcastToChat(chatId: number, data: ServerEvent, excludeUserId?: number, excludeDeviceId?: string): void {
    // Здесь нужно получить участников чата из базы
    getChatParticipants(chatId).then(participants => {
        participants.forEach(participant => {
            if (participant.user_id !== excludeUserId) {
                sendToUser(participant.user_id, data, excludeDeviceId);
            }
        });
    });
}

export function broadcastToAll(data: ServerEvent, excludeDeviceId?: string): void {
    clients.forEach((userClients) => {
        userClients.forEach(client => {
            if (client.deviceId !== excludeDeviceId) {
                try {
                    const message = `data: ${JSON.stringify(data)}\n\n`;
                    client.controller.enqueue(message);
                } catch (error) {
                    console.error('Error broadcasting event:', error);
                }
            }
        });
    });
}

async function getChatParticipants(chatId: number): Promise<ChatParticipant[]> {
    // TODO: Реализуйте получение участников чата из базы данных
    // Временная заглушка
    console.log(`Getting participants for chat ${chatId}`);
    return [];
}