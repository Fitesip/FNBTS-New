// src/app/components/PostCard.tsx (обновленная версия)
'use client';

import Link from 'next/link';
import { ForumPost } from '@/types/forum';
import {formatForumDate, formatForumDateSimple} from '@/utils/dateFormatter';
import UserPhoto from "@/components/UserPhoto";
import FormattedText from '@/components/FormattedText';
import { formatText } from '@/utils/textFormatter';
import Image from "next/image";
import {useAuth} from "@/context/AuthContext";

interface PostCardProps {
    post: ForumPost;
}

export default function PostCard({ post }: PostCardProps) {
    const { user } = useAuth()
    const truncateText = (text: string, maxLength: number = 150) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const formattedExcerpt = formatText(truncateText(post.text));

    if (user?.role !== 'Гл. Администратор') {
        if (post.status == 'deleted') {
            return null
        }
    }

    return (
        <Link
            href={`/forum/${post.id}`}
            className="overflow-hidden group"
        >
            <div className="p-4 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 overflow-hidden">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <h3 className="post-title text-lg font-bold group-hover:text-purple-1/70 transition-colors duration-300 line-clamp-2 flex-1">
                        {post.title}
                    </h3>
                    <p className={`p-2 border text-sm rounded-lg ${post.status == 'open' ? "bg-green-1/20 border-green-1" : "border-red-1 bg-red-1/20"}`}>{post.status == 'open' ? 'Открыт' : post.status == 'closed' ? 'Закрыт' : 'Удалён'}</p>
                    <div className="flex gap-2">
                        <div className="post-stats flex items-center gap-1 bg-red-1 text-white px-3 py-1 rounded-full shadow-sm">
                            <span className="text-sm lg:text-xl font-bold">{post.likes}</span>
                            <Image src={'/heart.svg'} alt={'heart'} width={100} height={100} className={`size-4 text-cwhite-1 lg:size-6`} />
                        </div>
                        <div className="post-stats flex items-center gap-1 bg-purple-1 text-white px-3 py-1 rounded-full shadow-sm">
                            <span className="text-sm lg:text-xl font-bold">{post.dislikes}</span>
                            <Image src={'/broken.svg'} alt={'heart'} width={100} height={100} className={`size-4 text-cwhite-1 lg:size-6`} />
                        </div>
                    </div>
                </div>

                <div className="post-content mb-6">
                    <div className="post-text leading-relaxed line-clamp-3 formatted-text">
                        <FormattedText content={formattedExcerpt} />
                    </div>
                </div>

                <div className="post-footer flex items-center justify-between pt-4 border-t border-gray-600">
                    <div className="post-author flex items-center gap-3">
                        <UserPhoto
                            withUsername={false}
                            username={post.author}
                            className="rounded-full size-9"
                        />
                        <div>
                            <span className="author-name block text-sm font-semibold">
                                {post.author}
                            </span>
                            <span className="post-date text-xs text-gray-400">
                                {formatForumDate(post.date, post.time)}
                            </span>
                        </div>
                    </div>

                    <div className="post-arrow opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-purple-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}