// src/app/news/[id]/route.ts
'use client';

import {useParams, useRouter} from 'next/navigation';
import { useNewsItem } from '@/hooks/useNews';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { formatForumDate } from '@/utils/dateFormatter';
import UserPhoto from "@/components/UserPhoto";
import FormattedText from "@/components/FormattedText";
import { formatText } from "@/utils/textFormatter";
import {Metadata, ResolvingMetadata} from 'next';
import {useEffect, useState} from "react";
import Image from "next/image";
import {useNewsLikes} from "@/hooks/useNewsLikes";

export default function NewsPage() {
    const params = useParams();
    const { user } = useAuth();
    const newsId = parseInt(params.id as string);
    const [message, setMessage] = useState<string | null>(null);
    const [buttonError, setButtonError] = useState<string | null>(null);

    const { news, loading, error } = useNewsItem(newsId);

    const router = useRouter();
    useEffect(() => {
        if (!news) return;
        // Динамическое изменение title
        document.title = 'Новости | ФНБТС'

        // Добавление meta description
        const metaDescription = document.querySelector('meta[name="description"]')
        if (metaDescription) {
            metaDescription.setAttribute('content', news.text)
        } else {
            const newMeta = document.createElement('meta')
            newMeta.name = news.title
            newMeta.content = news.text
            document.head.appendChild(newMeta)
        }
    }, [news])

    const {
        likes,
        dislikes,
        userLiked,
        userDisliked,
        toggleLike,
        toggleDislike
    } = useNewsLikes({
        newsId,
        initialLikes: news?.likes || 0,
        initialDislikes: news?.dislikes || 0,
        initialLikeAuthors: news?.likeAuthors || '[]',
        initialDislikeAuthors: news?.dislikeAuthors || '[]'
    });


    const handleLikeClick = async () => {
        if (!user) {
            alert('Для оценки постов необходимо авторизоваться');
            router.push(`/auth/login?redirect=/news/${newsId}`);
            return;
        }

        const success = await toggleLike();
        if (success) {
            console.log('✅ Like action completed successfully');
        }
    };

    const handleDeletePost = async () => {
        if (!news || !user) return;
        try {
            const response = await fetch(`/api/news/${news.id}/`, {
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

    if (loading || error || !news) {
        return (
            <div className="flex items-center justify-center mt-10 lg:mt-40 px-4">
                <div className="w-full max-w-300 p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter shadow-xl text-center">
                    {loading && (
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cwhite-1 mx-auto mb-4"></div>
                    )}
                    <div className="flex flex-col gap-4">
                        {error ? error : "Загрузка новости..."}
                        {!news && (
                            <Link
                                href="/news"
                                className="back-link inline-flex items-center gap-2 hover:text-cyan-1/70 font-medium transition-colors duration-200 group"
                            >
                                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Назад к новостям
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-4 lg:py-8 w-110 lg:w-7xl">
            <article className="w-full max-w-300 p-4 lg:p-6 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 overflow-hidden">
                <div className="flex justify-between items-center">
                    <Link
                        href="/news"
                        className="back-link inline-flex items-center gap-2 hover:text-cyan-1/70 font-medium transition-colors duration-200 group mb-4 lg:mb-0"
                    >
                        <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="hidden sm:inline">Назад к новостям</span>
                        <span className="sm:hidden">Назад</span>
                    </Link>
                    <div className="flex gap-4">
                        {(user?.role === 'Администратор' || user?.role === 'Гл. Администратор' || user?.role === 'Креатор') && news.status !== 'deleted' && (
                            <button onClick={handleDeletePost} className={`p-2 rounded-lg bg-red-1 hover:bg-red-1/70 hover:scale-95 transition-all`}>
                                Удалить новость
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
                <header className="news-header-full p-4 lg:p-8 pb-4 lg:pb-6 border-b">
                    {news.tag == "Новость" ? (
                        <div className="news-badge-full bg-cyan-1/20 border border-cyan-1 text-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-xs lg:text-sm font-semibold inline-block mb-3 lg:mb-4">
                            Новость
                        </div>
                    ) : news.tag == "Важная новость" ? (
                        <div className="news-badge-full bg-pink-1/20 border border-pink-1 text-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-xs lg:text-sm font-semibold inline-block mb-3 lg:mb-4">
                            Важная новость
                        </div>
                    ) : news.tag == "Багфикс" ? (
                        <div className="news-badge-full bg-purple-1/20 border border-purple-1 text-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-xs lg:text-sm font-semibold inline-block mb-3 lg:mb-4">
                            Багфикс
                        </div>
                    ) : news.tag == "Обновление" ? (
                        <div className="news-badge-full bg-red-1/20 border border-red-1 text-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-xs lg:text-sm font-semibold inline-block mb-3 lg:mb-4">
                            Обновление
                        </div>
                    ) : null}

                    <h1 className="news-title-full text-xl lg:text-3xl xl:text-4xl font-bold mb-4 lg:mb-6 leading-tight">
                        {news.title}
                    </h1>

                    <div className="news-meta-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 lg:gap-4">
                        <div className="p-3 lg:p-4 mt-3 lg:mt-5 border-cgray-2 bg-cgray-2 border bg-filter z-10 rounded-lg flex items-center gap-3 w-full sm:w-auto">
                            <div className="author-avatar">
                                <UserPhoto
                                    withUsername={false}
                                    username={news.author}
                                    className={`rounded-full size-10 lg:size-12`}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="author-name block font-semibold text-base lg:text-lg truncate">
                                    {news.author}
                                </span>
                                <span className="author-role text-xs lg:text-sm text-cwhite-1/70">
                                    Автор новости
                                </span>
                            </div>
                        </div>

                        <span className="p-3 lg:p-4 mt-3 lg:mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 text-sm lg:text-base w-full sm:w-auto text-center">
                            <svg className="w-3 h-3 lg:w-4 lg:h-4 inline-block mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatForumDate(news.date, news.time)}
                        </span>
                    </div>
                </header>

                <div className="news-content-full p-4 lg:p-8">
                    <div className="news-text-full text-base lg:text-lg leading-relaxed lg:leading-relaxed space-y-4 lg:space-y-6 formatted-text">
                        <FormattedText content={formatText(news.text)} />
                    </div>
                </div>

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
                                    <Link href={`/auth/login?redirect=/forum/${newsId}`} className="auth-link hover:underline transition-colors font-bold">
                                        Войдите
                                    </Link>
                                    , чтобы оценивать новости
                                </p>
                            </div>
                        </div>
                    )}
                </footer>
            </article>
        </div>
    );
}