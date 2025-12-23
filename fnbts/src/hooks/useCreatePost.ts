// src/hooks/useCreatePost.ts
import { useState } from 'react';
import { ForumPost, CreatePostRequest } from '@/types/forum';

export const useCreatePost = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createPost = async (postData: CreatePostRequest): Promise<ForumPost | null> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/forum/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Ошибка при создании поста');
            }

            return result.data.post;
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
            setError(errorMessage);
            console.error('Error creating post:', err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => setError(null);

    return {
        createPost,
        loading,
        error,
        clearError,
    };
};