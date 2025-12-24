// src/app/forum/posts/[id]/route.ts
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useForumPost } from '@/hooks/useForumPosts';
import { usePostLikes } from '@/hooks/usePostLikes';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { formatForumDate } from '@/utils/dateFormatter';
import CommentList from "@/components/CommentList";
import { usePostComments } from "@/hooks/usePostComments";
import UserPhoto from "@/components/UserPhoto";
import FormattedText from "@/components/FormattedText";
import {formatText} from "@/utils/textFormatter";
import {useEffect, useState} from "react";
import Image from "next/image";


export default function PostPage() {
    const [message, setMessage] = useState<string | null>(null);
    const [buttonError, setButtonError] = useState<string | null>(null);
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const postId = parseInt(params.id as string);

    const { loading: commentsLoading, error: commentsError, refreshComments } = usePostComments(postId);

    const { post, loading: postLoading, error } = useForumPost(postId);

    useEffect(() => {
        if (!post) return;
        // Динамическое изменение title
        document.title = 'Форум | ФНБТС'

        // Добавление meta description
        const metaDescription = document.querySelector('meta[name="description"]')
        if (metaDescription) {
            metaDescription.setAttribute('content', post.text)
        } else {
            const newMeta = document.createElement('meta')
            newMeta.name = post.title
            newMeta.content = post.text
            document.head.appendChild(newMeta)
        }
    }, [post])

    const {
        likes,
        dislikes,
        userLiked,
        userDisliked,
        toggleLike,
        toggleDislike
    } = usePostLikes({
        postId,
        initialLikes: post?.likes || 0,
        initialDislikes: post?.dislikes || 0,
        initialLikeAuthors: post?.likeAuthors || '[]',
        initialDislikeAuthors: post?.dislikeAuthors || '[]'
    });


    const handleLikeClick = async () => {
        if (!user) {
            alert('Для оценки постов необходимо авторизоваться');
            router.push(`/auth/login?redirect=/posts/${postId}`);
            return;
        }

        const success = await toggleLike();
        if (success) {
            console.log('✅ Like action completed successfully');
        }
    };

    const handleClosePost = async () => {
        if (!post || !user) return;
        try {
            const response = await fetch(`/api/forum/posts/${post.id}/actions`, {
                method: 'PATCH',
                headers: {
                    'content-type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({
                    status: 'closed'
                })
            })
            const data = await response.json();
            if (data.success) {
                setMessage(data.message);
                setTimeout(() => {
                    setMessage(null);
                }, 3000)
            }
            else {
                setButtonError(data.error);
                setTimeout(() => {
                    setButtonError(null);
                }, 3000)
            }
        } catch (error) {
            console.error(error);
        }
    }

    const handleOpenPost = async () => {
        if (!post || !user) return;
        try {
            const response = await fetch(`/api/forum/posts/${post.id}/actions`, {
                method: 'PATCH',
                headers: {
                    'content-type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({
                    status: 'open'
                })
            })
            const data = await response.json();
            if (data.success) {
                setMessage(data.message);
                setTimeout(() => {
                    setMessage(null);
                }, 3000)
            }
            else {
                setButtonError(data.error);
                setTimeout(() => {
                    setButtonError(null);
                }, 3000)
            }
        } catch (error) {
            console.error(error);
        }
    }

    const handleDeletePost = async () => {
        if (!post || !user) return;
        try {
            const response = await fetch(`/api/forum/posts/${post.id}/actions`, {
                method: 'DELETE',
                headers: {
                    'content-type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            })
            const data = await response.json();
            if (data.success) {
                setMessage(data.message);
                setTimeout(() => {
                    setMessage(null);
                }, 3000)
            }
            else {
                setButtonError(data.error);
                setTimeout(() => {
                    setButtonError(null);
                }, 3000)
            }
        } catch (error) {
            console.error(error);
        }
    }

    if (postLoading || error || !post) {
        return (
            <div className="flex items-center justify-center mt-10 lg:mt-40 px-4">
                <div className="w-full max-w-300 p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter shadow-xl text-center">
                    {postLoading && (
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cwhite-1 mx-auto mb-4"></div>
                    )}
                    <div className="flex flex-col gap-4">
                        {error ? error : "Загрузка поста..."}
                        {!post && (
                            <Link
                                href="/forum"
                                className="back-link inline-flex items-center gap-2 hover:text-purple-1/70 font-medium transition-colors duration-200 group"
                            >
                                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Назад к форуму
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-4 lg:py-8 w-110 lg:w-7xl">

            {/* Основной контент поста */}
            <article className="w-full max-w-300 p-4 lg:p-6 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 overflow-hidden">
                <div className="flex justify-between items-center">
                    <Link
                        href="/forum"
                        className="back-link inline-flex items-center gap-2 hover:text-purple-1/70 font-medium transition-colors duration-200 group mb-4 lg:mb-0"
                    >
                        <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="hidden sm:inline">Назад к форуму</span>
                        <span className="sm:hidden">Назад</span>
                    </Link>
                    <div className="flex gap-4">
                        {(user?.username === post.author || user?.role === 'Администратор' || user?.role === 'Гл. Администратор' || user?.role === 'Креатор') && post.status == 'open' && (
                            <button onClick={handleClosePost} className={`p-2 rounded-lg bg-cgray-1 hover:bg-cgray-1/70 hover:scale-95 transition-all`}>
                                Закрыть пост
                            </button>
                        )}
                        {(user?.username === post.author || user?.role === 'Администратор' || user?.role === 'Гл. Администратор' || user?.role === 'Креатор') && post.status == 'closed' && (
                            <button onClick={handleOpenPost} className={`p-2 rounded-lg bg-cgray-1 hover:bg-cgray-1/70 hover:scale-95 transition-all`}>
                                Открыть пост
                            </button>
                        )}
                        {(user?.role === 'Администратор' || user?.role === 'Гл. Администратор' || user?.role === 'Креатор') && post.status !== 'deleted' && (
                            <button onClick={handleDeletePost} className={`p-2 rounded-lg bg-red-1 hover:bg-red-1/70 hover:scale-95 transition-all`}>
                                Удалить пост
                            </button>
                        )}
                    </div>

                </div>
                {message && (
                    <p className={`bg-green-1/20 border-green-1 border p-4 rounded-lg mt-3 w-full`}>{message}</p>
                )}
                {buttonError && (
                    <p className={`bg-red-1/20 border-red-1 border p-4 rounded-lg mt-3 w-full`}>{buttonError}</p>
                )}

                {/* Шапка поста */}
                <header className="post-header-full p-4 lg:p-8 pb-4 lg:pb-6 border-b">
                    <div className="flex items-center gap-4 mb-4 lg:mb-6">
                        <h1 className="post-title-full text-xl lg:text-3xl xl:text-4xl font-bold leading-tight">
                            {post.title}
                        </h1>
                        <p className={`p-2 border text-sm rounded-lg ${post.status == 'open' ? "bg-green-1/20 border-green-1" : "border-red-1 bg-red-1/20"}`}>{post.status == 'open' ? 'Открыт' : post.status == 'closed' ? 'Закрыт' : 'Удалён'}</p>
                    </div>


                    <div className="post-meta-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 lg:gap-4">
                        <div className="p-3 lg:p-4 mt-3 lg:mt-5 border-cgray-2 bg-cgray-2 border bg-filter z-10 rounded-lg flex items-center gap-3 w-full sm:w-auto">
                            <div className="author-avatar w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-base lg:text-lg shadow-md">
                                <UserPhoto
                                    withUsername={false}
                                    username={post.author}
                                    className={`rounded-full size-10 lg:size-12`}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="author-name block font-semibold text-base lg:text-lg truncate">
                                  {post.author}
                                </span>
                                <span className="author-role text-xs lg:text-sm text-cwhite-1/70">
                                  Участник форума
                                </span>
                            </div>
                        </div>

                        <span className="p-3 lg:p-4 mt-3 lg:mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 text-sm lg:text-base w-full sm:w-auto text-center">
                        <svg className="w-3 h-3 lg:w-4 lg:h-4 inline-block mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                            {formatForumDate(post.date, post.time)}
                        </span>
                    </div>
                </header>

                {/* Текст поста */}
                <div className="post-content-full p-4 lg:p-8">
                    <div className="post-text-full text-base lg:text-lg leading-relaxed lg:leading-relaxed space-y-4 lg:space-y-6 formatted-text">
                        <FormattedText content={formatText(post.text)} />
                    </div>
                </div>

                {/* Футер поста */}
                <footer className="post-footer-full p-4 lg:p-8 pt-4 lg:pt-6 border-t">
                    {/* Кнопка лайка */}
                    <div className="post-actions mb-4 lg:mb-6 flex gap-3 lg:gap-4 flex-wrap">
                        <button
                            className={`flex items-center gap-2 lg:gap-3 p-3 lg:p-4 mt-3 lg:mt-5 border-cgray-2 bg-cgray-2 border bg-filter z-10 rounded-lg font-semibold transition-all duration-300 flex-1 min-w-0 ${
                                userLiked
                                    ? 'border hover:scale-95'
                                    : 'border hover:bg-cgray-1 hover:scale-95'
                            } disabled:hover:scale-100 disabled:hover:bg-cgray-2 disabled:opacity-50`}
                            onClick={handleLikeClick}
                            disabled={!user || user.isBlocked}
                            title={user ? (userLiked ? 'Убрать лайк' : 'Поставить лайк') : 'Войдите для оценки'}
                        >
                        <span className="like-icon text-xl lg:text-2xl">
                          {userLiked ? (
                              <Image src={'/heart-red.svg'} alt={'heart'} width={100} height={100} className={`size-4 lg:size-6`} />
                          ) : (
                              <Image src={'/heart.svg'} alt={'heart'} width={100} height={100} className={`size-4 lg:size-6`} />
                          )}
                        </span>
                            <span className="like-count text-lg lg:text-xl font-bold">{likes}</span>
                            <span className="like-text text-sm lg:text-base hidden sm:inline">
                          {user ? (userLiked ? 'Вам нравится' : 'Нравится') : 'Войдите для оценки'}
                        </span>
                            <span className="like-text text-sm sm:hidden">
                          {user ? (userLiked ? 'Лайк' : 'Лайк') : 'Войти'}
                        </span>
                        </button>

                        <button
                            className={`flex items-center gap-2 lg:gap-3 p-3 lg:p-4 mt-3 lg:mt-5 border-cgray-2 bg-cgray-2 border bg-filter z-10 rounded-lg font-semibold transition-all duration-300 flex-1 min-w-0 ${
                                userDisliked
                                    ? 'border hover:scale-95'
                                    : 'border hover:bg-cgray-1 hover:scale-95'
                            } disabled:hover:scale-100 disabled:hover:bg-cgray-2 disabled:opacity-50`}
                            onClick={toggleDislike}
                            disabled={!user || user.isBlocked}
                            title={user ? (userDisliked ? 'Убрать лайк' : 'Поставить лайк') : 'Войдите для оценки'}
                        >
                        <span className="like-icon text-xl lg:text-2xl">
                          {userDisliked ? (
                              <Image src={'/broken-purple.svg'} alt={'heart'} width={100} height={100} className={`size-4 lg:size-6`} />
                          ) : (
                              <Image src={'/broken.svg'} alt={'heart'} width={100} height={100} className={`size-4 lg:size-6`} />
                          )}
                        </span>
                            <span className="like-count text-lg lg:text-xl font-bold">{dislikes}</span>
                            <span className="like-text text-sm lg:text-base hidden sm:inline">
                          {user ? (userDisliked ? 'Вам не нравится' : 'Не нравится') : 'Войдите для оценки'}
                        </span>
                            <span className="like-text text-sm sm:hidden">
                          {user ? (userDisliked ? 'Дизлайк' : 'Дизлайк') : 'Войти'}
                        </span>
                        </button>
                    </div>

                    {/* Сообщение о необходимости авторизации */}
                    {!user && (
                        <div className="mt-4 lg:mt-5 p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter text-center w-full">
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 lg:gap-3 mb-1 lg:mb-2">
                                <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <p className="font-medium text-sm lg:text-base">
                                    <Link href={`/auth/login?redirect=/forum/${postId}`} className="auth-link hover:underline transition-colors font-bold">
                                        Войдите
                                    </Link>
                                    , чтобы оценивать посты и участвовать в обсуждениях
                                </p>
                            </div>
                        </div>
                    )}
                </footer>

                {/* Комментарии */}
                <div className="mt-6 lg:mt-8">
                    <CommentList
                        author={user?.username}
                        postId={postId}
                        authorId={user?.id}
                        status={post.status}
                    />
                    {/* Показываем загрузку или ошибку комментариев */}
                    {commentsLoading && (
                        <div className="p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg text-center">
                            <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-cwhite-1 mx-auto mb-2"></div>
                            <span className="text-sm lg:text-base">Загрузка комментариев...</span>
                        </div>
                    )}
                    {commentsError && (
                        <div className="p-3 lg:p-4 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg text-center">
                            <span className="text-sm lg:text-base">Ошибка: {commentsError}</span>
                        </div>
                    )}
                </div>
            </article>
        </div>
    );
}