// hooks/useSubscriptions.ts
import { useState, useEffect, useCallback } from 'react';

export interface Subscription {
    userId: number;
    type: string;
    username: string;
    email: string;
}

export interface UseSubscriptionsReturn {
    subscriptions: Subscription[];
    loading: boolean;
    error: string | null;
    subscribe: (type?: string, username?: string, email?: string) => Promise<void>;
    unsubscribe: (type?: string) => Promise<void>;
    refetch: () => Promise<void>;
    isSubscribed: (type?: string) => boolean;
}

export const useSubscriptions = (userId?: number): UseSubscriptionsReturn => {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSubscriptions = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            const response = await fetch(`/api/users/${userId}/subscriptions`);
            const result = await response.json();

            if (result.success && result.data) {
                setSubscriptions(result.data.subs || []);
                setError(null);
            } else {
                setError(result.error || 'Ошибка загрузки подписок');
            }
        } catch (err) {
            setError('Неизвестная ошибка при загрузке подписок');
            console.error('Ошибка загрузки подписок:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const subscribe = useCallback(async (type: string = 'news', username: string = '', email: string = '') => {
        if (!userId) return;

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/users/${userId}/subscriptions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    type,
                    username,
                    email,
                }),
            });

            const result = await response.json();

            if (result.success) {
                await fetchSubscriptions();
                console.log(result.data);
            } else {
                setError(result.error || 'Ошибка подписки');
            }
        } catch (err) {
            setError('Неизвестная ошибка при подписке');
            console.error('Ошибка подписки:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, fetchSubscriptions]);

    const unsubscribe = useCallback(async (type: string = 'news') => {
        if (!userId) return;

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/users/${userId}/subscriptions`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    type
                }),
            });

            const result = await response.json();

            if (result.success) {
                await fetchSubscriptions();
            } else {
                setError(result.error || 'Ошибка отписки');
            }
        } catch (err) {
            setError('Неизвестная ошибка при отписке');
            console.error('Ошибка отписки:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, fetchSubscriptions]);

    const isSubscribed = useCallback((type: string = 'email') => {
        return subscriptions.some(sub => sub.type === type);
    }, [subscriptions]);

    useEffect(() => {
        if (userId) {
            fetchSubscriptions();
        }
    }, [userId, fetchSubscriptions]);

    return {
        subscriptions,
        loading,
        error,
        subscribe,
        unsubscribe,
        refetch: fetchSubscriptions,
        isSubscribed,
    };
};