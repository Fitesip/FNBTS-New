// src/app/api/chat/events/route.ts
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/server-auth';
import { clients, generateDeviceId, ServerEvent } from '@/lib/chat-events';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const deviceId = searchParams.get('deviceId') || generateDeviceId();

    if (!token) {
        return new Response('Token required', { status: 401 });
    }

    try {
        // Проверяем токен и получаем userId
        const userId = await verifyToken(token);
        if (!userId) {
            return new Response('Invalid token', { status: 401 });
        }

        const stream = new ReadableStream({
            start(controller) {
                // Сохраняем соединение с учетом устройства
                if (!clients.has(userId)) {
                    clients.set(userId, []);
                }

                // Удаляем старые соединения для этого устройства (если есть)
                const userClients = clients.get(userId)!;
                const existingDeviceIndex = userClients.findIndex(client => client.deviceId === deviceId);
                if (existingDeviceIndex > -1) {
                    userClients.splice(existingDeviceIndex, 1);
                }

                userClients.push({ userId, controller, deviceId });

                console.log(`SSE connected: user ${userId}, device ${deviceId}, total devices: ${userClients.length}`);

                // Отправляем начальное сообщение
                const data: ServerEvent = {
                    type: 'CONNECTED',
                    userId,
                    deviceId,
                    timestamp: new Date().toISOString()
                };
                controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);

                // Обработка закрытия соединения
                const cleanup = () => {
                    const userClients = clients.get(userId);
                    if (userClients) {
                        const index = userClients.findIndex(client =>
                            client.controller === controller && client.deviceId === deviceId
                        );
                        if (index > -1) {
                            userClients.splice(index, 1);
                            console.log(`SSE disconnected: user ${userId}, device ${deviceId}, remaining devices: ${userClients.length}`);
                        }
                        if (userClients.length === 0) {
                            clients.delete(userId);
                        }
                    }
                    controller.close();
                };

                // Обработка прерывания запроса
                if (request.signal) {
                    request.signal.addEventListener('abort', cleanup);
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control',
            },
        });
    } catch (error) {
        console.error('Error creating event stream:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
