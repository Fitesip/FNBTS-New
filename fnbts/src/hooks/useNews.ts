// src/app/hooks/useNews.ts
import { useState, useEffect } from 'react';
import { News } from '@/types/news';

export const useNews = (page: number = 1, limit: number = 10) => {
    const [news, setNews] = useState<News[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(1);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refreshNews = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const fetchNews = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`/api/news?page=${page}&limit=${limit}`);
                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Ошибка при загрузке новостей');
                }

                setNews(result.data.news);
                setTotalPages(Math.ceil(result.data.total / limit));
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
                setError(errorMessage);
                console.error('Error fetching news:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, [page, limit, refreshTrigger]);

    return { news, loading, error, totalPages, refreshNews };
};

export const useNewsItem = (id: number) => {
    const [news, setNews] = useState<News | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`/api/news/${id}`);
                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Ошибка при загрузке новости');
                }

                setNews(result.data.news);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
                setError(errorMessage);
                console.error('Error fetching news:', err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchNews();
        }
    }, [id]);

    return { news, loading, error };
};