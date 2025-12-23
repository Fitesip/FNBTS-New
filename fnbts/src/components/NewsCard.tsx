// src/app/components/NewsCard.tsx
'use client';

import Link from 'next/link';
import { News } from '@/types/news';
import {formatForumDate, formatForumDateSimple} from '@/utils/dateFormatter';
import UserPhoto from "@/components/UserPhoto";
import FormattedText from '@/components/FormattedText';
import { formatText } from '@/utils/textFormatter';
import Image from "next/image";

interface NewsCardProps {
    news: News;
}

export default function NewsCard({ news }: NewsCardProps) {
    const truncateText = (text: string, maxLength: number = 150) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const formattedExcerpt = formatText(truncateText(news.text));

    return (
        <Link
            href={`/news/${news.id}`}
            className="overflow-hidden group"
        >
            <div className="p-4 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 overflow-hidden lg:w-300">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <h3 className="news-title text-lg font-bold group-hover:text-cyan-1/70 transition-colors duration-300 line-clamp-2 flex-1">
                        {news.title}
                    </h3>
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
                    <div className="flex gap-2">
                        <div className="post-stats flex items-center gap-1 bg-red-1 text-white px-3 py-1 rounded-full shadow-sm">
                            <span className="text-sm lg:text-xl font-bold">{news.likes}</span>
                            <Image src={'/heart.svg'} alt={'heart'} width={100} height={100} className={`size-4 text-cwhite-1 lg:size-6`} />
                        </div>
                        <div className="post-stats flex items-center gap-1 bg-purple-1 text-white px-3 py-1 rounded-full shadow-sm">
                            <span className="text-sm lg:text-xl font-bold">{news.dislikes}</span>
                            <Image src={'/broken.svg'} alt={'heart'} width={100} height={100} className={`size-4 text-cwhite-1 lg:size-6`} />
                        </div>
                    </div>
                </div>

                <div className="news-content mb-6">
                    <div className="news-text leading-relaxed line-clamp-3 formatted-text">
                        <FormattedText content={formattedExcerpt} />
                    </div>
                </div>

                <div className="news-footer flex items-center justify-between pt-4 border-t border-gray-600">
                    <div className="news-author flex items-center gap-3">
                        <UserPhoto
                            withUsername={false}
                            username={news.author}
                            className="rounded-full size-9"
                        />
                        <div>
                            <span className="author-name block text-sm font-semibold">
                                {news.author}
                            </span>
                            <span className="news-date text-xs text-gray-400">
                                {formatForumDate(news.date, news.time)}
                            </span>
                        </div>
                    </div>

                    <div className="news-arrow opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-cyan-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}