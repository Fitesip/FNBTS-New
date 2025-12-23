// src/app/hooks/usePostLikes.ts
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LikeState } from '@/types/forum'

interface UsePostLikesProps {
    newsId: number;
    initialLikes: number;
    initialDislikes: number;
    initialLikeAuthors: string;
    initialDislikeAuthors: string;
}

export function useNewsLikes({
                                 newsId,
                                 initialLikes,
                                 initialDislikes,
                                 initialLikeAuthors,
                                 initialDislikeAuthors
                             }: UsePostLikesProps) {
    const { user } = useAuth();
    const [likeState, setLikeState] = useState<LikeState>({
        likes: initialLikes,
        dislikes: initialDislikes,
        likeAuthors: [],
        dislikeAuthors: [],
        userLiked: false,
        userDisliked: false
    });
    const [loading, setLoading] = useState<boolean>(false);

    // Инициализация состояния при загрузке поста
    useEffect(() => {
        try {
            const likeAuthors = initialLikeAuthors ? JSON.parse(initialLikeAuthors) : [];
            const dislikeAuthors = initialDislikeAuthors ? JSON.parse(initialDislikeAuthors) : [];

            setLikeState({
                likes: initialLikes,
                dislikes: initialDislikes,
                likeAuthors,
                dislikeAuthors,
                userLiked: user ? likeAuthors.includes(user.username) : false,
                userDisliked: user ? dislikeAuthors.includes(user.username) : false
            });
        } catch {
            setLikeState({
                likes: initialLikes,
                dislikes: initialDislikes,
                likeAuthors: [],
                dislikeAuthors: [],
                userLiked: false,
                userDisliked: false
            });
        }
    }, [initialLikes, initialDislikes, initialLikeAuthors, initialDislikeAuthors, user]);

    // Обновляем состояния при изменении пользователя
    useEffect(() => {
        if (user && (likeState.likeAuthors.length > 0 || likeState.dislikeAuthors.length > 0)) {
            const userLiked = likeState.likeAuthors.includes(user.username);
            const userDisliked = likeState.dislikeAuthors.includes(user.username);
            setLikeState(prev => ({ ...prev, userLiked, userDisliked }));
        }
    }, [user, likeState.likeAuthors, likeState.dislikeAuthors]);

    const toggleReaction = async (action: 'like' | 'dislike'): Promise<boolean> => {
        console.log('🎯 Toggle reaction called:', {
            user: user?.username,
            action,
            currentLiked: likeState.userLiked,
            currentDisliked: likeState.userDisliked,
            newsId
        });

        if (!user) {
            console.log('❌ User not authenticated in toggleReaction');
            alert('Для оценки постов необходимо авторизоваться');
            return false;
        }

        setLoading(true);
        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                throw new Error('Требуется авторизация');
            }

            console.log('📡 Sending reaction request...');
            const response = await fetch(`/api/news/${newsId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ action })
            });

            const data = await response.json();
            console.log('📦 Reaction response:', data);

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            if (data.success && data.data) {
                setLikeState({
                    likes: data.data.likes,
                    dislikes: data.data.dislikes,
                    likeAuthors: data.data.likeAuthors,
                    dislikeAuthors: data.data.dislikeAuthors,
                    userLiked: data.data.userLiked,
                    userDisliked: data.data.userDisliked
                });
                console.log('✅ Reaction state updated:', data.data);
                return true;
            } else {
                throw new Error(data.error || 'Ошибка при обработке оценки');
            }
        } catch (err: unknown) {
            console.error('❌ Reaction error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
            alert(errorMessage || 'Ошибка при оценке поста');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const toggleLike = () => toggleReaction('like');
    const toggleDislike = () => toggleReaction('dislike');

    return {
        likes: likeState.likes,
        dislikes: likeState.dislikes,
        likeAuthors: likeState.likeAuthors,
        dislikeAuthors: likeState.dislikeAuthors,
        userLiked: likeState.userLiked,
        userDisliked: likeState.userDisliked,
        loading,
        toggleLike,
        toggleDislike
    };
}