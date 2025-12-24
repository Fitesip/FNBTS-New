'use client';

import {useEffect, useState} from 'react';
import { useForumPosts } from '@/hooks/useForumPosts';
import { useVotes } from '@/hooks/useVotes';
import PostCard from '@/components/PostCard';
import VoteCard from '@/components/VoteCard';
import CreatePostForm from "@/components/CreatePostForm";
import CreateVoteForm from "@/components/CreateVoteForm";
import {ForumPost} from "@/types/forum";
import {VotesPosts} from "@/types/news";
import {useAuth} from "@/context/AuthContext";
import {useSearchParams} from "next/navigation";

export default function ForumPage() {
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState<'posts' | 'votes'>('posts');
    const [isToggledCreatePostForm, setIsToggledCreatePostForm] = useState(false);
    const [isToggledCreateVoteForm, setIsToggledCreateVoteForm] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const { user } = useAuth();
    const { posts, loading: postsLoading, error: postsError, totalPages: postsTotalPages, refreshPosts } = useForumPosts(currentPage, 10);
    const { votes, loading: votesLoading, error: votesError, totalPages: votesTotalPages, refreshVotes } = useVotes(currentPage, 10);

    useEffect(() => {
        // Динамическое изменение title
        document.title = 'Форум и Голосования | ФНБТС'

        // Добавление meta description
        const metaDescription = document.querySelector('meta[name="description"]')
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Форум и голосования нашего сервера!')
        } else {
            const newMeta = document.createElement('meta')
            newMeta.name = 'description'
            newMeta.content = 'Форум и голосования нашего сервера!'
            document.head.appendChild(newMeta)
        }
    }, [])

    const handlePostCreated = (newPost: ForumPost) => {
        refreshPosts();
        setRefreshTrigger(prev => prev + 1);
        setIsToggledCreatePostForm(false);
    };

    const handleVoteCreated = (newVote: VotesPosts) => {
        refreshVotes();
        setIsToggledCreateVoteForm(false);
    };

    const handleToggleCreatePostForm = () => {
        setIsToggledCreatePostForm(!isToggledCreatePostForm);
        setIsToggledCreateVoteForm(false);
    }

    const handleToggleCreateVoteForm = () => {
        setIsToggledCreateVoteForm(!isToggledCreateVoteForm);
        setIsToggledCreatePostForm(false);
    }

    // Определяем текущие состояния загрузки и ошибок в зависимости от активной вкладки
    const loading = activeTab === 'posts' ? postsLoading : votesLoading;
    const error = activeTab === 'posts' ? postsError : votesError;
    const totalPages = activeTab === 'posts' ? postsTotalPages : votesTotalPages;
    const hasContent = activeTab === 'posts' ? posts.length > 0 : votes.length > 0;
    const canCreateContent = user && !user.isBlocked && user.email_verified;
    const canCreateVotes = user?.role === "Креатор" || user?.role === "Администратор" || user?.role === "Гл. Администратор";

    if (loading || error) {
        return (
            <div className="flex items-center justify-center mt-10 lg:mt-40 px-4">
                <div className="w-full max-w-300 p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter shadow-xl text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cwhite-1 mx-auto mb-4"></div>
                    <p className="text-sm lg:text-base">
                        {error ? error : `Загрузка ${activeTab === 'posts' ? 'постов' : 'голосований'}...`}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="text-cwhite-1 flex flex-col mt-5 px-4 lg:px-0 z-40">
            {/* Табы для переключения между постами и голосованиями */}
            <div className="flex border-b border-cgray-1 mb-6 w-full max-w-300 mx-auto">
                <button
                    onClick={() => {
                        setActiveTab('posts');
                        setCurrentPage(1);
                    }}
                    className={`flex-1 py-3 text-center transition-all ${
                        activeTab === 'posts'
                            ? 'border-b-2 border-cwhite-1 text-cwhite-1 font-semibold'
                            : 'text-cwhite-1/60 hover:text-cwhite-1'
                    }`}
                >
                    Посты
                </button>
                <button
                    onClick={() => {
                        setActiveTab('votes');
                        setCurrentPage(1);
                    }}
                    className={`flex-1 py-3 text-center transition-all ${
                        activeTab === 'votes'
                            ? 'border-b-2 border-cwhite-1 text-cwhite-1 font-semibold'
                            : 'text-cwhite-1/60 hover:text-cwhite-1'
                    }`}
                >
                    Голосования
                </button>
            </div>

            {/* Формы создания контента */}
            {canCreateContent && (
                <div className="w-full max-w-300 mx-auto space-y-4">
                    {/* Форма создания поста */}
                    {activeTab === 'posts' && (
                        <div className={`${isToggledCreatePostForm ? "max-h-210" : "lg:max-h-15 max-h-12"} overflow-hidden transition-all duration-300`}>
                            <button
                                className={`w-full p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:scale-95 hover:bg-cgray-1 transition-all text-sm lg:text-base`}
                                onClick={handleToggleCreatePostForm}
                            >
                                Создать пост
                            </button>
                            <CreatePostForm
                                onPostCreated={handlePostCreated}
                                onCancel={() => setIsToggledCreatePostForm(false)}
                            />
                        </div>
                    )}

                    {/* Форма создания голосования */}
                    {activeTab === 'votes' && canCreateVotes && (
                        <div className={`${isToggledCreateVoteForm ? "max-h-210" : "lg:max-h-15 max-h-12"} overflow-hidden transition-all duration-300`}>
                            <button
                                className={`w-full p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:scale-95 hover:bg-cgray-1 transition-all text-sm lg:text-base`}
                                onClick={handleToggleCreateVoteForm}
                            >
                                Создать голосование
                            </button>
                            <CreateVoteForm
                                onVoteCreated={handleVoteCreated}
                                onCancel={() => setIsToggledCreateVoteForm(false)}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Сетка контента */}
            <div className="content-grid mb-5 w-full max-w-300 mx-auto space-y-4 lg:space-y-5 z-40">
                {activeTab === 'posts' ? (
                    posts.map(post => (
                        <PostCard key={post.id} post={post} />
                    ))
                ) : (
                    votes.map(vote => (
                        <VoteCard key={vote.id} vote={vote} />
                    ))
                )}
            </div>

            {/* Сообщение об отсутствии контента */}
            {!hasContent && (
                <div className={`${(isToggledCreatePostForm || isToggledCreateVoteForm) ? "max-h-0 p-0" : "p-4 lg:p-6 border"} overflow-hidden text-cwhite-1 bg-cgray-2 border-cgray-2 rounded-lg bg-filter flex items-center transition-all duration-300 justify-center flex-col gap-3 lg:gap-4 w-full max-w-300 mx-auto`}>
                    <h3 className="text-lg lg:text-xl font-semibold text-center">
                        {activeTab === 'posts' ? 'Пока нет постов' : 'Пока нет голосований'}
                    </h3>
                    <p className="text-sm lg:text-base text-center text-cwhite-1/80">
                        {activeTab === 'posts'
                            ? 'Будьте первым, кто поделится своими мыслями!'
                            : 'Новые голосования появятся здесь!'}
                    </p>
                    {activeTab === 'posts' && canCreateContent && (
                        <button
                            className={`p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:scale-95 hover:bg-cgray-1 transition-all text-sm lg:text-base`}
                            onClick={handleToggleCreatePostForm}
                        >
                            Создать пост
                        </button>
                    )}
                    {activeTab === 'votes' && canCreateVotes && (
                        <button
                            className={`p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:scale-95 hover:bg-cgray-1 transition-all text-sm lg:text-base`}
                            onClick={handleToggleCreateVoteForm}
                        >
                            Создать голосование
                        </button>
                    )}
                </div>
            )}

            {/* Пагинация - показываем только если есть больше одной страницы */}
            {totalPages > 1 && (
                <div className="pagination flex items-center justify-center gap-3 lg:gap-4 mt-6 lg:mt-8 z-10 w-full max-w-300 mx-auto mb-5">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 lg:px-4 lg:py-2 bg-cgray-2 border border-cgray-2 rounded-lg hover:bg-cgray-1 disabled:opacity-50 transition-all text-sm lg:text-base flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline">Назад</span>
                    </button>

                    <span className="pagination-info text-xs lg:text-sm px-2 lg:px-3 py-1 bg-cgray-2 rounded-lg">
                        {currentPage} / {totalPages}
                    </span>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 lg:px-4 lg:py-2 bg-cgray-2 border border-cgray-2 rounded-lg hover:bg-cgray-1 disabled:opacity-50 transition-all text-sm lg:text-base flex items-center gap-1"
                    >
                        <span className="hidden sm:inline">Вперед</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}