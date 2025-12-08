// src/components/forum/CreatePostForm.tsx
'use client';

import { useState } from 'react';
import { useCreatePost } from '@/hooks/useCreatePost';
import { useAuth } from '@/context/AuthContext';
import { previewFormat, validateText } from '@/utils/textFormatter';
import { useTextArea } from '@/hooks/useTextArea';
import FormattedText from '@/components/FormattedText';
import {ForumPost} from "@/types/forum";

interface CreatePostFormProps {
    onPostCreated?: (post: ForumPost) => void;
    onCancel?: () => void;
}

// Интерфейс для кнопки форматирования
interface FormatButton {
    label: string;
    title: string;
    before: string;
    after?: string;
    defaultText?: string;
    icon?: string;
    moveCursorToEnd?: boolean;
}

export default function CreatePostForm({ onPostCreated, onCancel }: CreatePostFormProps) {
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [formatError, setFormatError] = useState<string | null>(null);

    const { textareaRef, wrapSelection, insertText } = useTextArea();

    const { createPost, loading, error, clearError } = useCreatePost();
    const { user } = useAuth();

    // Массив кнопок форматирования
    const formatButtons: FormatButton[] = [
        {
            label: 'B',
            title: 'Жирный текст',
            before: '**',
            after: '**',
            defaultText: 'жирный текст',
            icon: '𝐁'
        },
        {
            label: 'I',
            title: 'Курсив',
            before: '*',
            after: '*',
            defaultText: 'курсив',
            icon: '𝐼'
        },
        {
            label: 'S',
            title: 'Зачеркнутый текст',
            before: '~~',
            after: '~~',
            defaultText: 'зачеркнутый текст',
            icon: '𝑆'
        },
        {
            label: 'H',
            title: 'Заголовок',
            before: '# ',
            defaultText: 'Заголовок',
            icon: 'H1',
            moveCursorToEnd: true
        },
        {
            label: '❝',
            title: 'Цитата',
            before: '> ',
            defaultText: 'Цитата',
            icon: '❝',
            moveCursorToEnd: true
        },
        {
            label: '•',
            title: 'Маркированный список',
            before: '- ',
            defaultText: 'элемент списка',
            icon: '•',
            moveCursorToEnd: true
        },
        {
            label: '1.',
            title: 'Нумерованный список',
            before: '1. ',
            defaultText: 'элемент списка',
            icon: '1.',
            moveCursorToEnd: true
        },
    ];

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

    const handleFormatClick = (button: FormatButton) => {
        wrapSelection(
            button.before,
            button.after,
            button.defaultText,
            button.moveCursorToEnd
        );

        // Обновляем состояние текста после форматирования
        setTimeout(() => {
            if (textareaRef.current) {
                setText(textareaRef.current.value);
            }
        }, 0);
    };

    // Вставка новой строки
    const handleNewLine = () => {
        insertText('\n');
    };

    // Вставка табуляции
    const handleTab = () => {
        insertText('    '); // 4 пробела
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('Для создания поста необходимо авторизоваться');
            return;
        }

        if (!title.trim() || !text.trim()) {
            alert('Все поля обязательны для заполнения');
            return;
        }

        const validation = validateText(text);
        if (!validation.isValid) {
            setFormatError(validation.error || 'Ошибка валидации текста');
            return;
        }

        const newPost = await createPost({
            author: user.username,
            title: title.trim(),
            text: text.trim(),
        });

        if (newPost) {
            setTitle('');
            setText('');
            setShowPreview(false);
            setFormatError(null);

            if (onPostCreated) {
                onPostCreated(newPost);
            }
        }
    };

    if (!user) {
        return (
            <div className="p-3 lg:p-4 mt-3 lg:mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                <div className="text-center py-4 lg:py-8">
                    <p className="mb-3 lg:mb-4 text-sm lg:text-base">Для создания поста необходимо авторизоваться</p>
                    <button
                        onClick={() => window.location.href = '/auth/login?redirect=/forum'}
                        className="p-3 lg:p-4 mt-3 lg:mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:bg-cgray-1 hover:scale-95 transition-all text-sm lg:text-base"
                    >
                        Войти
                    </button>
                </div>
            </div>
        );
    }

    const previewContent = previewFormat(text);

    return (
        <div className="p-3 lg:p-4 mt-3 lg:mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 lg:gap-4 mb-3 lg:mb-4">
                <h2 className="text-lg lg:text-xl font-bold">Создать новый пост</h2>
                <div className="text-xs lg:text-sm">
                    От имени: <span className="font-semibold">{user.username}</span>
                </div>
            </div>

            {error && (
                <div className="bg-cwhite-1 border border-red-1 text-red-1 px-3 lg:px-4 py-2 lg:py-3 rounded mb-3 lg:mb-4 text-sm">
                    {error}
                    <button
                        onClick={clearError}
                        className="float-right font-bold ml-2"
                    >
                        ×
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-3 lg:mb-4">
                    <label htmlFor="title" className="block text-xs lg:text-sm font-medium mb-1">
                        Заголовок поста *
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-2 lg:p-3 bg-cgray-1 border border-cgray-2 rounded focus:outline-none focus:border-cyan-1 text-sm lg:text-base"
                        placeholder="Введите заголовок поста"
                        maxLength={200}
                        disabled={loading}
                    />
                    <div className="text-xs mt-1">
                        {title.length}/200 символов
                    </div>
                </div>

                <div className="mb-3 lg:mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <label htmlFor="text" className="block text-xs lg:text-sm font-medium">
                            Текст поста *
                        </label>

                        <div className="flex gap-1 lg:gap-2">
                            <button
                                type="button"
                                onClick={() => setShowPreview(false)}
                                className={`px-2 lg:px-3 py-1 text-xs rounded ${
                                    !showPreview
                                        ? 'bg-cyan-1 text-white'
                                        : 'bg-cgray-1 text-gray-400'
                                }`}
                            >
                                Редактор
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPreview(true)}
                                className={`px-2 lg:px-3 py-1 text-xs rounded ${
                                    showPreview
                                        ? 'bg-cyan-1 text-white'
                                        : 'bg-cgray-1 text-gray-400'
                                }`}
                            >
                                Предпросмотр
                            </button>
                        </div>
                    </div>

                    {/* Панель инструментов форматирования */}
                    {!showPreview && (
                        <div className="mb-2 lg:mb-3 p-2 lg:p-3 bg-cgray-1 rounded-lg border border-cgray-2">
                            <div className="flex flex-wrap gap-1 mb-1 lg:mb-2">
                                {formatButtons.map((button, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleFormatClick(button)}
                                        className="px-2 lg:px-3 py-1 lg:py-2 text-xs lg:text-sm bg-cgray-2 rounded hover:bg-cgray-3 transition-colors flex items-center gap-1 min-w-8 lg:min-w-10 justify-center"
                                        title={button.title}
                                    >
                                        <span className="font-medium text-xs lg:text-sm">{button.icon || button.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Дополнительные инструменты */}
                            <div className="flex flex-wrap gap-1 lg:gap-2 pt-2 border-t border-cgray-2">
                                <button
                                    type="button"
                                    onClick={handleNewLine}
                                    className="px-2 lg:px-3 py-1 text-xs bg-cgray-2 rounded hover:bg-cgray-3"
                                    title="Новая строка"
                                >
                                    ↵ Enter
                                </button>
                                <button
                                    type="button"
                                    onClick={handleTab}
                                    className="px-2 lg:px-3 py-1 text-xs bg-cgray-2 rounded hover:bg-cgray-3"
                                    title="Табуляция"
                                >
                                    Tab →
                                </button>
                                <div className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                                    <kbd className="px-1 py-0.5 bg-cgray-2 rounded text-xs">Ctrl</kbd>
                                    <span>+</span>
                                    <kbd className="px-1 py-0.5 bg-cgray-2 rounded text-xs">Enter</kbd>
                                    <span className="hidden xs:inline">для отправки</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Редактор или предпросмотр */}
                    {showPreview ? (
                        <div className="max-h-32 lg:max-h-48 p-3 lg:p-4 bg-cgray-1 border border-cgray-2 rounded formatted-text-preview text-sm lg:text-base">
                            {text ? (
                                <FormattedText content={previewContent} />
                            ) : (
                                <div className="text-gray-500 italic">Текст для предпросмотра отсутствует</div>
                            )}
                        </div>
                    ) : (
                        <textarea
                            ref={textareaRef}
                            id="text"
                            value={text}
                            onChange={handleTextChange}
                            rows={6}
                            className="w-full p-2 lg:p-3 bg-cgray-1 border border-cgray-2 rounded focus:outline-none focus:border-cyan-1 resize-none font-mono text-xs lg:text-sm"
                            placeholder="Напишите ваш пост... Используйте кнопки выше для форматирования или синтаксис Markdown"
                            maxLength={10000}
                            disabled={loading}
                            onKeyDown={(e) => {
                                // Ctrl+Enter для отправки
                                if (e.ctrlKey && e.key === 'Enter') {
                                    handleSubmit(e);
                                }
                                // Tab для вставки отступа
                                if (e.key === 'Tab') {
                                    e.preventDefault();
                                    handleTab();
                                }
                            }}
                        />
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 mt-1">
                        <div className="text-xs text-gray-400">
                            {text.length}/10000 символов
                        </div>
                        {formatError && (
                            <div className="text-xs text-red-400">
                                {formatError}
                            </div>
                        )}
                    </div>

                    {/* Подсказки по форматированию */}
                    {!showPreview && (
                        <div className="mt-2 lg:mt-3 p-2 lg:p-3 bg-cgray-1 rounded border border-cgray-2">
                            <div className="text-xs text-gray-400 mb-1 lg:mb-2 font-semibold">
                                Подсказки по форматированию:
                            </div>
                            <div className="grid grid-cols-1 xs:grid-cols-2 gap-1 lg:gap-2 text-xs">
                                <div className="flex items-center gap-1 lg:gap-2">
                                    <span className="bg-cgray-2 px-1 lg:px-2 py-0.5 lg:py-1 rounded text-xs">**текст**</span>
                                    <span>→</span>
                                    <strong className="text-xs">жирный</strong>
                                </div>
                                <div className="flex items-center gap-1 lg:gap-2">
                                    <span className="bg-cgray-2 px-1 lg:px-2 py-0.5 lg:py-1 rounded text-xs">*текст*</span>
                                    <span>→</span>
                                    <em className="text-xs">курсив</em>
                                </div>
                                <div className="flex items-center gap-1 lg:gap-2">
                                    <span className="bg-cgray-2 px-1 lg:px-2 py-0.5 lg:py-1 rounded text-xs">~~текст~~</span>
                                    <span>→</span>
                                    <del className="text-xs">зачеркнутый</del>
                                </div>
                                <div className="flex items-center gap-1 lg:gap-2">
                                    <span className="bg-cgray-2 px-1 lg:px-2 py-0.5 lg:py-1 rounded text-xs">`код`</span>
                                    <span>→</span>
                                    <code className="text-xs">код</code>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
                    <button
                        type="submit"
                        disabled={loading || !!formatError}
                        className="bg-cyan-1 text-white px-4 lg:px-6 py-2 rounded hover:bg-cyan-2 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base order-2 sm:order-1"
                    >
                        {loading ? 'Создание...' : 'Создать пост'}
                    </button>

                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={loading}
                            className="bg-cgray-1 text-white px-4 lg:px-6 py-2 rounded hover:bg-cgray-2 focus:outline-none transition-all disabled:opacity-50 text-sm lg:text-base order-1 sm:order-2"
                        >
                            Отмена
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}