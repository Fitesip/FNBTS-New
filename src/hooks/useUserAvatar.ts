// src/hooks/useUserAvatar.ts
'use client';

import { useState, useEffect } from 'react';

// Кэш для аватарок (теперь храним URL, а не blob)
const avatarCache = new Map<string, string>();

interface UseUserAvatarReturn {
    avatarUrl: string | null;
    loading: boolean;
    error: boolean;
}

const avatarUpdateListeners = new Map<string, Array<() => void>>();

export const useUserAvatar = (userId?: number, username?: string): UseUserAvatarReturn => {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [version, setVersion] = useState(0); // Локальная версия для принудительного обновления

    useEffect(() => {
        const cacheKey = userId ? `id_${userId}` : `username_${username}`;

        const fetchAvatar = async () => {
            // Если нет ни userId ни username, используем дефолтную аву
            if (!userId && !username) {
                setAvatarUrl('/default-avatar.png');
                setLoading(false);
                return;
            }

            // Проверяем кэш
            if (avatarCache.has(cacheKey)) {
                setAvatarUrl(avatarCache.get(cacheKey)!);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(false);

                let finalUserId = userId;

                // Если передан username но нет userId, получаем ID
                if (!finalUserId && username) {
                    const idResponse = await fetch('/api/users/getId', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username }),
                    });

                    if (idResponse.ok) {
                        const idData = await idResponse.json();
                        finalUserId = idData.id;
                    }
                }

                if (!finalUserId) {
                    throw new Error('User ID not found');
                }

                // Генерируем URL с cache busting параметром и версией
                const timestamp = Math.floor(Date.now() / 60000);
                const avatarUrl = `/api/users/${finalUserId}/avatar?t=${timestamp}&v=${version}`;

                // Проверяем доступность аватарки
                const checkResponse = await fetch(avatarUrl, { method: 'HEAD' });

                if (checkResponse.ok) {
                    // Сохраняем в кэш
                    avatarCache.set(cacheKey, avatarUrl);
                    setAvatarUrl(avatarUrl);
                } else {
                    throw new Error('Avatar not found');
                }

            } catch (err) {
                console.error('Error loading avatar:', err);
                setError(true);
                // Используем дефолтную аву
                const defaultAvatar = '/default-avatar.png';
                avatarCache.set(cacheKey, defaultAvatar);
                setAvatarUrl(defaultAvatar);
            } finally {
                setLoading(false);
            }
        };

        fetchAvatar();

        // Добавляем слушатель для обновлений
        const handleAvatarUpdate = () => {
            setVersion(prev => prev + 1); // Увеличиваем версию для принудительного обновления
        };

        if (!avatarUpdateListeners.has(cacheKey)) {
            avatarUpdateListeners.set(cacheKey, []);
        }
        avatarUpdateListeners.get(cacheKey)!.push(handleAvatarUpdate);

        // Cleanup
        return () => {
            if (avatarUpdateListeners.has(cacheKey)) {
                const listeners = avatarUpdateListeners.get(cacheKey)!;
                const index = listeners.indexOf(handleAvatarUpdate);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }, [userId, username, version]); // Добавляем version в зависимости

    return { avatarUrl, loading, error };
};

// Функция для уведомления об обновлении аватара
export const notifyAvatarUpdate = (userId?: number, username?: string) => {
    const cacheKey = userId ? `id_${userId}` : `username_${username}`;

    // Очищаем кэш для этого пользователя
    if (avatarCache.has(cacheKey)) {
        avatarCache.delete(cacheKey);
    }

    // Уведомляем всех слушателей
    if (avatarUpdateListeners.has(cacheKey)) {
        avatarUpdateListeners.get(cacheKey)!.forEach(listener => listener());
    }

    // Также очищаем общий кэш для безопасности
    clearAvatarCache();
};

// Функция для предзагрузки аватарок
export const preloadAvatars = (users: Array<{ id?: number; username?: string }>) => {
    users.forEach(user => {
        const cacheKey = user.id ? `id_${user.id}` : `username_${user.username}`;
        if (!avatarCache.has(cacheKey)) {
            const avatarUrl = `/api/users/${user.id || user.username}/avatar?t=${Date.now()}`;

            // Создаем image для предзагрузки
            const img = new Image();
            img.src = avatarUrl;
            img.onload = () => {
                avatarCache.set(cacheKey, avatarUrl);
            };
            img.onerror = () => {
                // В случае ошибки сохраняем дефолтную аву
                avatarCache.set(cacheKey, '/default-avatar.png');
            };
        }
    });
};

// Функция для очистки кэша
export const clearAvatarCache = () => {
    avatarCache.clear();
};