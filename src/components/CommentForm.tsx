// src/components/forum/CommentForm.tsx
'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { previewFormat, validateText } from '@/utils/textFormatter';

interface CommentFormProps {
    author: string;
    postId: number;
    authorId: number;
    answerTo?: number;
    answerToUser?: string;
    onCommentAdded: () => void;
    onCancel?: () => void;
    placeholder?: string;
    autoFocus?: boolean;
    className?: string;
}

export default function CommentForm({
                                        author,
                                        postId,
                                        authorId,
                                        answerTo,
                                        answerToUser,
                                        onCommentAdded,
                                        onCancel,
                                        placeholder = "Напишите ваш комментарий...",
                                        autoFocus = false,
                                        className
                                    }: CommentFormProps) {
    const [text, setText] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [formatError, setFormatError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { user } = useAuth();

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setText(newText);

        const validation = validateText(newText);
        if (!validation.isValid) {
            setFormatError(validation.error || null);
        } else {
            setFormatError(null);
        }
    };

    const insertFormatting = (syntax: string, wrapText: string = '') => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = text.substring(start, end);

        let newText = text;
        let newCursorPos = start + syntax.length;

        if (selectedText) {
            newText = text.substring(0, start) + syntax.replace('{}', selectedText) + text.substring(end);
            newCursorPos = start + syntax.replace('{}', selectedText).length;
        } else {
            newText = text.substring(0, start) + syntax.replace('{}', wrapText) + text.substring(end);
            newCursorPos = start + syntax.replace('{}', wrapText).length;
        }

        setText(newText);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('Для комментария необходимо авторизоваться');
            return;
        }

        if (!text.trim()) {
            alert('Комментарий не может быть пустым');
            return;
        }

        const validation = validateText(text);
        if (!validation.isValid) {
            setFormatError(validation.error || 'Ошибка валидации текста');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/forum/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    author,
                    text: text.trim(),
                    authorId: authorId,
                    answerTo,
                    answerToUser
                }),
            });

            const data = await response.json();

            if (data.success) {
                setText('');
                setShowPreview(false);
                setFormatError(null);
                onCommentAdded();
            } else {
                setError(data.error || 'Ошибка при создании комментария');
            }
        } catch (err) {
            setError('Ошибка сети. Пожалуйста, попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };

    const previewContent = previewFormat(text);

    if (!user) {
        return (
            <div className="p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter text-center">
                <p>Для написания комментария необходимо авторизоваться</p>
            </div>
        );
    }

    if (!user.email_verified) {
        return (
            <div className="p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter text-center">
                <p>Для написания комментария необходимо подтвердить почту</p>
            </div>
        )
    }

    if (user.isBlocked) {
        return (
            <div className="p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter text-center">
                <p>Вы не можете писать комментарии</p>
            </div>
        )
    }

    return (
        <div className={`p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter ${className}`}>
            {answerToUser && (
                <div className="mb-3 text-xs lg:text-sm">
                    Ответ пользователю: <span className="font-semibold text-purple-1">{answerToUser}</span>
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="ml-2 text-red-400 hover:text-red-300"
                        >
                            ×
                        </button>
                    )}
                </div>
            )}

            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <div className="flex gap-2 lg:gap-0 items-start lg:items-center justify-between mb-2 flex-col lg:flex-row">
                        <label htmlFor="comment-text" className="block text-xs lg:text-sm font-medium">
                            Текст комментария *
                        </label>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowPreview(false)}
                                className={`px-3 py-1 text-xs rounded ${
                                    !showPreview
                                        ? 'bg-purple-1 text-white'
                                        : 'bg-cgray-1 text-gray-400'
                                }`}
                            >
                                Редактор
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPreview(true)}
                                className={`px-3 py-1 text-xs rounded ${
                                    showPreview
                                        ? 'bg-purple-1 text-white'
                                        : 'bg-cgray-1 text-gray-400'
                                }`}
                            >
                                Предпросмотр
                            </button>
                        </div>
                    </div>

                    {!showPreview && (
                        <div className="flex flex-wrap gap-1 mb-2 p-2 bg-cgray-1 rounded">
                            <button
                                type="button"
                                onClick={() => insertFormatting('**жирный текст**')}
                                className="px-2 py-1 text-xs bg-cgray-2 rounded hover:bg-cgray-3"
                                title="Жирный текст"
                            >
                                <strong>B</strong>
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormatting('*курсив*')}
                                className="px-2 py-1 text-xs bg-cgray-2 rounded hover:bg-cgray-3"
                                title="Курсив"
                            >
                                <em>I</em>
                            </button>
                            <button
                                type="button"
                                onClick={() => insertFormatting('~~зачеркнутый текст~~')}
                                className="px-2 py-1 text-xs bg-cgray-2 rounded hover:bg-cgray-3"
                                title="Зачеркнутый текст"
                            >
                                <del>S</del>
                            </button>
                        </div>
                    )}

                    {showPreview ? (
                        <div className="min-h-24 p-3 bg-cgray-1 border border-cgray-2 rounded formatted-text-preview">
                            {text ? (
                                <div
                                    className="prose prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: previewContent }}
                                />
                            ) : (
                                <div className="text-gray-500 italic">Текст для предпросмотра отсутствует</div>
                            )}
                        </div>
                    ) : (
                        <textarea
                            ref={textareaRef}
                            id="comment-text"
                            value={text}
                            onChange={handleTextChange}
                            rows={4}
                            className="w-full p-3 bg-cgray-1 border border-cgray-2 rounded focus:outline-none focus:border-purple-1 resize-none font-mono text-sm"
                            placeholder={placeholder}
                            maxLength={5000}
                            disabled={loading}
                            autoFocus={autoFocus}
                        />
                    )}

                    <div className="flex justify-between items-center mt-1">
                        <div className="text-xs text-gray-400">
                            {text.length}/5000 символов
                        </div>
                        {formatError && (
                            <div className="text-xs text-red-400">
                                {formatError}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={loading || !!formatError}
                        className="bg-purple-1 text-white px-6 py-2 rounded hover:bg-purple-1/70 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Отправка...' : 'Отправить комментарий'}
                    </button>

                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={loading}
                            className="bg-cgray-1 text-white px-6 py-2 rounded hover:bg-cgray-2 focus:outline-none transition-all disabled:opacity-50"
                        >
                            Отмена
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}