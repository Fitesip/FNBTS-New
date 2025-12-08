// src/app/components/CreateNewsForm.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { previewFormat, validateText } from '@/utils/textFormatter';
import { useTextArea } from '@/hooks/useTextArea';
import FormattedText from '@/components/FormattedText';
import { News } from '@/types/news';

interface CreateNewsFormProps {
    onNewsCreated?: (news: News) => void;
    onCancel?: () => void;
}

interface FormatButton {
    label: string;
    title: string;
    before: string;
    after?: string;
    defaultText?: string;
    icon?: string;
    moveCursorToEnd?: boolean;
}

// Список доступных тегов
const AVAILABLE_TAGS = [
    'Обновление',
    'Багфикс',
    'Новость',
    'Важная новость'
];

export default function CreateNewsForm({ onNewsCreated, onCancel }: CreateNewsFormProps) {
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [selectedTag, setSelectedTag] = useState<string>('');
    const [showPreview, setShowPreview] = useState(false);
    const [formatError, setFormatError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { textareaRef, wrapSelection, insertText } = useTextArea();
    const { user } = useAuth();

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

        setTimeout(() => {
            if (textareaRef.current) {
                setText(textareaRef.current.value);
            }
        }, 0);
    };

    const handleNewLine = () => {
        insertText('\n');
    };

    const handleTab = () => {
        insertText('    ');
    };

    const handleTagSelect = (tag: string) => {
        setSelectedTag(tag === selectedTag ? '' : tag);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('Для создания новости необходимо авторизоваться');
            return;
        }

        if (!title.trim() || !text.trim()) {
            alert('Заголовок и текст обязательны для заполнения');
            return;
        }

        if (!selectedTag) {
            alert('Пожалуйста, выберите тег для новости');
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
            const response = await fetch('/api/news', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    author: user.username,
                    title: title.trim(),
                    text: text.trim(),
                    tag: selectedTag, // Добавляем тег в запрос
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Ошибка при создании новости');
            }
            // Сброс формы
            setTitle('');
            setText('');
            setSelectedTag('');
            setShowPreview(false);
            setFormatError(null);

            if (onNewsCreated) {
                onNewsCreated(result.data.news);
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка при создании новости';
            setError(errorMessage);
            console.error('Error creating news:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="p-3 lg:p-4 mt-3 lg:mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                <div className="text-center py-4 lg:py-8">
                    <p className="mb-3 lg:mb-4 text-sm lg:text-base">Для создания новости необходимо авторизоваться</p>
                    <button
                        onClick={() => window.location.href = '/auth/login?redirect=/news'}
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
                <h2 className="text-lg lg:text-xl font-bold">Создать новость</h2>
                <div className="text-xs lg:text-sm">
                    От имени: <span className="font-semibold">{user.username}</span>
                </div>
            </div>

            {error && (
                <div className="bg-cwhite-1 border border-red-1 text-red-1 px-3 lg:px-4 py-2 lg:py-3 rounded mb-3 lg:mb-4 text-sm">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="float-right font-bold ml-2"
                    >
                        ×
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-3 lg:mb-4">
                    <label htmlFor="title" className="block text-xs lg:text-sm font-medium mb-1">
                        Заголовок новости *
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-2 lg:p-3 bg-cgray-1 border border-cgray-2 rounded focus:outline-none focus:border-cyan-1 text-sm lg:text-base"
                        placeholder="Введите заголовок новости"
                        maxLength={200}
                        disabled={loading}
                    />
                    <div className="text-xs mt-1">
                        {title.length}/200 символов
                    </div>
                </div>

                {/* Блок выбора тега */}
                <div className="mb-3 lg:mb-4">
                    <label className="block text-xs lg:text-sm font-medium mb-2">
                        Выберите тег *
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {AVAILABLE_TAGS.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => handleTagSelect(tag)}
                                className={`px-3 py-2 rounded-full text-xs lg:text-sm transition-all ${
                                    selectedTag === tag
                                        ? selectedTag == 'Обновление' ? 'bg-red-1 text-cwhite-1 shadow-md' : selectedTag == 'Багфикс' ? 'bg-purple-1 text-cwhite-1 shadow-md' : selectedTag == 'Важная новость' ? 'bg-pink-1 text-cwhite-1 shadow-md' : 'bg-cyan-1 text-cwhite-1 shadow-md'
                                        : 'bg-cgray-1 text-gray-300 hover:bg-cgray-2 hover:text-cwhite-1'
                                }`}
                                disabled={loading}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-3 lg:mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <label htmlFor="text" className="block text-xs lg:text-sm font-medium">
                            Текст новости *
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
                            placeholder="Напишите вашу новость..."
                            maxLength={10000}
                            disabled={loading}
                            onKeyDown={(e) => {
                                if (e.ctrlKey && e.key === 'Enter') {
                                    handleSubmit(e);
                                }
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
                </div>

                <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
                    <button
                        type="submit"
                        disabled={loading || !!formatError || !selectedTag}
                        className="bg-cyan-1 text-white px-4 lg:px-6 py-2 rounded hover:bg-cyan-2 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base order-2 sm:order-1"
                    >
                        {loading ? 'Создание...' : 'Создать новость'}
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