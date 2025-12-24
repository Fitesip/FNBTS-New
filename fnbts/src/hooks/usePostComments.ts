import { useState, useEffect, useCallback } from 'react';
import {CreateCommentRequest, ForumComment} from "@/types/forum";

export const usePostComments = (postId: number) => {
    const [comments, setComments] = useState<ForumComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Загрузка комментариев - ОБЕРНИ В useCallback
    const fetchComments = useCallback(async () => {
        if (!postId || isNaN(postId)) {
            setError('Неверный ID поста');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/forum/posts/${postId}/comments`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                const commentsData = result.data.comments || [];

                // Сортируем комментарии: сначала по дате (новые сверху), затем по времени
                const sortedComments = commentsData.sort((a: ForumComment, b: ForumComment) => {
                    const dateA = new Date(a.date + ' ' + a.time).getTime();
                    const dateB = new Date(b.date + ' ' + b.time).getTime();
                    return dateB - dateA; // Новые сначала
                });

                setComments(sortedComments);
            } else {
                throw new Error(result.error || 'Ошибка при загрузке комментариев');
            }
        } catch (err: unknown) {
            console.error('💥 Error fetching comments:', err);
            const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
            setError(errorMessage);
            setComments([]);
        } finally {
            setLoading(false);
        }
    }, [postId]); // ← ДОБАВЬ postId В ЗАВИСИМОСТИ

    // Создание комментария
    const createComment = async (commentData: CreateCommentRequest): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/forum/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(commentData),
            });

            const result = await response.json();

            if (result.success) {
                // Обновляем список комментариев
                await fetchComments();
                return true;
            } else {
                throw new Error(result.error || 'Ошибка при создании комментария');
            }
        } catch (err: unknown) {
            console.error('💥 Error creating comment:', err);
            const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
            setError(errorMessage);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Загружаем комментарии при монтировании
    useEffect(() => {
        if (postId && !isNaN(postId)) {
            fetchComments();
        }
    }, [postId, fetchComments]); // ← теперь fetchComments стабилен

    return {
        comments,
        loading,
        error,
        createComment,
        refreshComments: fetchComments,
    };
};