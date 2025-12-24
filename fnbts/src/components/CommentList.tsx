// src/components/forum/CommentList.tsx
'use client';

import { useState, useMemo } from 'react';
import { ForumComment } from '@/types/forum';
import {formatForumDateSimple} from '@/utils/dateFormatter';
import CommentForm from './CommentForm';
import { useAuth } from '@/context/AuthContext';
import UserPhoto from "@/components/UserPhoto";
import { usePostComments } from '@/hooks/usePostComments';
import {useRouter} from "next/navigation";

interface CommentListProps {
    author: string | undefined;
    authorId: number | undefined;
    postId: number;
    status: string;
}

export default function CommentList({ author, authorId, postId, status }: CommentListProps) {
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
    const { user } = useAuth();
    const { comments, loading, error, createComment, refreshComments } = usePostComments(postId);
    const router = useRouter();

    const handleCommentAdded = () => {
        setReplyingTo(null);
        refreshComments();
    };

    const toggleReplies = (commentId: number) => {
        setExpandedComments(prev => {
            const newSet = new Set(prev);
            if (newSet.has(commentId)) {
                newSet.delete(commentId);
            } else {
                newSet.add(commentId);
            }
            return newSet;
        });
    };

    const isExpanded = (commentId: number) => expandedComments.has(commentId);

    // Компонент для отображения группированных комментариев
    const GroupedCommentsView = () => {
        const normalizeAnswerTo = (answerTo: string | number | null | undefined): number | null => {
            if (answerTo === null || answerTo === undefined || answerTo === '') return null;
            if (answerTo === 0 || answerTo === '0') return null;
            return Number(answerTo);
        };

        const getReplies = (commentId: number): ForumComment[] => {
            const findAllReplies = (parentId: number): ForumComment[] => {
                const directReplies = comments.filter(comment => {
                    if (!comment.answerTo) return false;
                    return String(comment.answerTo) === String(parentId);
                });

                let allReplies = [...directReplies];
                directReplies.forEach(reply => {
                    const nestedReplies = findAllReplies(reply.id);
                    allReplies = [...allReplies, ...nestedReplies];
                });

                return allReplies;
            };

            return findAllReplies(commentId);
        };

        const getRootComments = (): ForumComment[] => {
            return comments.filter(comment => {
                const normalizedAnswerTo = normalizeAnswerTo(comment.answerTo);
                return normalizedAnswerTo === null;
            });
        };

        const rootComments = useMemo(() => getRootComments(), [comments]);

        // Компонент ответа
        const ReplyItem = ({ reply }: { reply: ForumComment }) => {
            const isReplying = replyingTo === reply.id;

            const handleReplyClick = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setReplyingTo(isReplying ? null : reply.id);
            };

            return (
                <div className="ml-4 lg:ml-8 p-3 lg:p-4 mt-2 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                    <div className="flex items-start gap-2 lg:gap-3 flex-col">
                        <div className={`flex items-center gap-2 lg:gap-3 cursor-pointer`} onClick={() => router.push(`/user/${authorId}`)}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                                <UserPhoto
                                    withUsername={false}
                                    username={reply.author}
                                    className={`rounded-full size-6`}
                                />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-1 lg:gap-2">
                                    <span className="font-semibold text-cwhite-1 text-xs lg:text-sm">{reply.author}</span>
                                    <span className="text-[10px] lg:text-xs">
                                        {formatForumDateSimple(reply.date, reply.time)}
                                    </span>
                                    <span className="text-[8px] lg:text-xs">
                                        (ответ {reply.answerToUser})
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-cwhite-1 text-sm whitespace-pre-wrap">
                            {reply.text}
                        </div>
                        {/* Кнопка ответа на ответ */}
                        <div className="flex items-center gap-4 mt-2">
                            {user && !user.isBlocked && status == 'open' && (
                                <button
                                    onClick={handleReplyClick}
                                    className="text-purple-1 hover:text-purple-1/70 text-xs flex items-center gap-1"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                                    </svg>
                                    {isReplying ? 'Отмена' : 'Ответить'}
                                </button>
                            )}
                        </div>

                        {/* Форма ответа на ответ */}
                        {isReplying && author && authorId && status == 'open' && (
                            <div className="mt-3 w-full">
                                <CommentForm
                                    author={author}
                                    postId={postId}
                                    authorId={authorId}
                                    answerTo={reply.id}
                                    answerToUser={reply.author}
                                    onCommentAdded={() => {
                                        handleCommentAdded();
                                    }}
                                    onCancel={() => {
                                        setReplyingTo(null);
                                    }}
                                    placeholder={`Ответ ${reply.author}...`}
                                    autoFocus={true}
                                />
                            </div>
                        )}
                    </div>
                </div>
            );
        };

        const RootCommentItem = ({ comment }: { comment: ForumComment }) => {
            const isReplying = replyingTo === comment.id;
            const replies = useMemo(() => getReplies(comment.id), [comments, comment.id]);
            const hasReplies = replies.length > 0;
            const showReplies = isExpanded(comment.id);

            const handleReplyClick = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setReplyingTo(isReplying ? null : comment.id);
            };

            const handleToggleReplies = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                toggleReplies(comment.id);
            };

            return (
                <div className="mb-6">
                    {/* Основной комментарий */}
                    <div className="p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                        <div className="flex items-start gap-2 lg:gap-3 mb-3 flex-col">
                            <div className={`flex items-center gap-2 lg:gap-3 cursor-pointer`} onClick={() => router.push(`/user/${authorId}`)}>
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 cursor-pointer">
                                    <UserPhoto
                                        withUsername={false}
                                        username={comment.author}
                                        className={`rounded-full size-10`}
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-cwhite-1 text-lg cursor-pointer">{comment.author}</span>
                                        <span className="text-[10px]">
                                            {formatForumDateSimple(comment.date, comment.time)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-cwhite-1 whitespace-pre-wrap text-base">
                                {comment.text}
                            </div>

                            <div className="flex items-center gap-4 mt-3">
                                {user && !user.isBlocked && status == 'open' && (
                                    <button
                                        onClick={handleReplyClick}
                                        className="text-purple-1 hover:text-purple-1/70 transition-all text-xs lg:text-sm flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                                        </svg>
                                        {isReplying ? 'Отмена' : 'Ответить'}
                                    </button>
                                )}
                                {hasReplies && (
                                    <button
                                        onClick={handleToggleReplies}
                                        className="text-cwhite-1 hover:text-cwhite-1/70 transition-all text-xs lg:text-sm flex items-center gap-1"
                                    >
                                        <svg
                                            className={`w-4 h-4 transform transition-transform ${showReplies ? 'rotate-90' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M9 5l7 7-7 7"/>
                                        </svg>
                                        {showReplies ? 'Скрыть ответы' : `Показать ответы (${replies.length})`}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Форма ответа на корневой комментарий */}
                        {isReplying && author && authorId && status == 'open' && (
                            <div className="mt-4">
                                <CommentForm
                                    author={author}
                                    postId={postId}
                                    authorId={authorId}
                                    answerTo={comment.id}
                                    answerToUser={comment.author}
                                    onCommentAdded={() => {
                                        handleCommentAdded();
                                    }}
                                    onCancel={() => {
                                        setReplyingTo(null);
                                    }}
                                    placeholder={`Ответ ${comment.author}...`}
                                    autoFocus={true}
                                />
                            </div>
                        )}
                    </div>

                    {/* Блок ответов */}
                    {hasReplies && showReplies && (
                        <div className="mt-3">
                            {replies.map((reply) => (
                                <ReplyItem key={reply.id} reply={reply}/>
                            ))}
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="space-y-6">
                {rootComments.map((comment) => (
                    <RootCommentItem key={comment.id} comment={comment}/>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="mt-8">
                <div className="text-center p-4 text-cwhite-1">Загрузка комментариев...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-8">
                <div className="text-center p-4 text-red-500 bg-cgray-2 rounded-lg">
                    Ошибка при загрузке комментариев: {error}
                    <button
                        onClick={refreshComments}
                        className="ml-2 text-purple-1 hover:text-purple-1/70"
                    >
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <h3 className="text-2xl font-bold mb-6 text-cwhite-1">
                Комментарии ({comments.length})
            </h3>

            {author && authorId && status == 'open' && (
                <CommentForm
                    author={author}
                    postId={postId}
                    authorId={authorId}
                    onCommentAdded={handleCommentAdded}
                    placeholder="Напишите ваш комментарий..."
                />
            )}

            {/* Список комментариев */}
            <div className="mt-6">
                {comments.length === 0 ? (
                    <div className="text-center p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                        Пока нет комментариев. Будьте первым!
                    </div>
                ) : <GroupedCommentsView/>}
            </div>
        </div>
    );
}