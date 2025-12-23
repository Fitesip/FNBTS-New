// src/app/news/route.ts
'use client';

import {useEffect, useState} from 'react';
import { useNews } from '@/hooks/useNews';
import NewsCard from '@/components/NewsCard';
import CreateNewsForm from "@/components/CreateNewsForm";
import { News } from "@/types/news";
import {useAuth} from "@/context/AuthContext";

export default function NewsPage() {
    const [currentPage, setCurrentPage] = useState(1);
    const { news, loading, error, totalPages, refreshNews } = useNews(currentPage, 10);
    const [isToggledCreateNewsForm, setIsToggledCreateNewsForm] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        // Динамическое изменение title
        document.title = 'Новости | ФНБТС'

        // Добавление meta description
        const metaDescription = document.querySelector('meta[name="description"]')
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Новости нашего сервера!')
        } else {
            const newMeta = document.createElement('meta')
            newMeta.name = 'Новости | ФНБТС'
            newMeta.content = 'Новости нашего сервера!'
            document.head.appendChild(newMeta)
        }
    }, [])

    const handleNewsCreated = (newNews: News) => {
        refreshNews()
        setIsToggledCreateNewsForm(false);
    };

    if (loading || error) {
        return (
            <div className="flex items-center justify-center mt-10 lg:mt-40 px-4">
                <div className="w-full max-w-300 p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter shadow-xl text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cwhite-1 mx-auto mb-4"></div>
                    <p className="text-sm lg:text-base">
                        {error ? error : "Загрузка новостей..."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="text-cwhite-1 flex flex-col mt-5 px-4 lg:px-0">
            {(user?.role == "Креатор" || user?.role == "Администратор" || user?.role == "Гл. Администратор") && !user.isBlocked && (
                <div className={`${isToggledCreateNewsForm ? "max-h-210" : "lg:max-h-15 max-h-12"} overflow-hidden transition-all duration-300 w-full mt-4 lg:mt-5 max-w-300 mx-auto`}>
                    <button
                        className={`w-full p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:scale-95 hover:bg-cgray-1 transition-all text-sm lg:text-base`}
                        onClick={() => setIsToggledCreateNewsForm(!isToggledCreateNewsForm)}
                    >
                        Создать новость
                    </button>

                    <CreateNewsForm
                        onNewsCreated={handleNewsCreated}
                        onCancel={() => setIsToggledCreateNewsForm(false)}
                    />
                </div>
            )}


            <div className="news-grid mb-5 w-full max-w-300 mx-auto">
                {news.map(newsItem => (

                    <NewsCard key={newsItem.id} news={newsItem} />
                ))}
            </div>

            {news.length === 0 && (
                <div className={`${isToggledCreateNewsForm ? "max-h-0 p-0" : "p-4 lg:p-6 border"} overflow-hidden text-cwhite-1 bg-cgray-2 border-cgray-2 rounded-lg bg-filter flex items-center transition-all duration-300 justify-center flex-col gap-3 lg:gap-4 w-full max-w-300 mx-auto`}>
                    <h3 className="text-lg lg:text-xl font-semibold text-center">Пока нет новостей</h3>
                    <p className="text-sm lg:text-base text-center text-cwhite-1/80">Будьте первым, кто поделится новостью!</p>
                    <button
                        className={`p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:scale-95 hover:bg-cgray-1 transition-all text-sm lg:text-base`}
                        onClick={() => setIsToggledCreateNewsForm(!isToggledCreateNewsForm)}
                    >
                        Создать новость
                    </button>
                </div>
            )}

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