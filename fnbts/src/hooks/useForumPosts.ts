'use client';

import { useState, useEffect } from 'react';
import { ForumPost } from '@/types/forum';

export function useForumPosts(page: number = 1, limit: number = 10) {
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refreshPosts = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`/api/forum/posts?page=${page}&limit=${limit}`);
                const data = await response.json();

                if (data.success && data.data) {
                    setPosts(data.data.posts);
                    setTotalPages(Math.ceil(data.data.total / limit));
                } else {
                    console.log(data);
                    setError(data.error || 'Ошибка при загрузке постов');
                }
            } catch (err) {
                setError('Ошибка сети');
                console.error('Error fetching posts:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, [page, limit, refreshTrigger]);

    return {
        posts,
        loading,
        error,
        totalPages,
        refreshPosts
    };
}

export function useForumPost(id: number) {
    const [post, setPost] = useState<ForumPost | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`/api/forum/posts/${id}`);
                const data = await response.json();

                if (data.success && data.data) {
                    setPost(data.data.post);
                } else {
                    setError(data.error || 'Пост не найден');
                }
            } catch (err) {
                setError('Ошибка сети');
                console.error('Error fetching post:', err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPost();
        }
    }, [id]);

    return { post, loading, error };
}