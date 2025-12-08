'use client';

import { useState } from 'react';
import { VotesPosts } from '@/types/news';

interface CreateVoteFormProps {
    onVoteCreated: (vote: VotesPosts) => void;
    onCancel: () => void;
}

export default function CreateVoteForm({ onVoteCreated, onCancel }: CreateVoteFormProps) {
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState(7); // Длительность в днях
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('Введите заголовок голосования');
            return;
        }

        if (title.length > 200) {
            setError('Заголовок не должен превышать 200 символов');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const response = await fetch('/api/votes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: title.trim(),
                    duration
                }),
            });

            const result = await response.json();

            if (result.success) {
                onVoteCreated(result.data.votesPosts);
                setTitle('');
                setDuration(7);
            } else {
                setError(result.error || 'Ошибка при создании голосования');
            }
        } catch (err) {
            console.error('Error creating vote:', err);
            setError('Ошибка при создании голосования');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-4 p-4 lg:p-6 bg-cgray-1 border border-cgray-2 rounded-lg">
            <h3 className="text-lg lg:text-xl font-semibold mb-4 text-cwhite-1">
                Создать новое голосование
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-cwhite-1 mb-2">
                        Заголовок голосования *
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Введите вопрос для голосования..."
                        className="w-full p-3 bg-cgray-2 border border-cgray-3 rounded-lg text-cwhite-1 placeholder-cwhite-1/50 focus:outline-none focus:border-cwhite-1/50 transition-colors text-sm lg:text-base"
                        maxLength={200}
                    />
                    <div className="text-right text-xs text-cwhite-1/60 mt-1">
                        {title.length}/200
                    </div>
                </div>

                <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-cwhite-1 mb-2">
                        Длительность голосования (дней) *
                    </label>
                    <select
                        id="duration"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full p-3 bg-cgray-2 border border-cgray-3 rounded-lg text-cwhite-1 focus:outline-none focus:border-cwhite-1/50 transition-colors text-sm lg:text-base"
                    >
                        <option value={1}>1 день</option>
                        <option value={3}>3 дня</option>
                        <option value={7}>7 дней</option>
                        <option value={14}>14 дней</option>
                        <option value={30}>30 дней</option>
                    </select>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting || !title.trim()}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-all text-sm lg:text-base font-medium"
                    >
                        {isSubmitting ? 'Создание...' : 'Создать голосование'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="flex-1 bg-cgray-3 hover:bg-cgray-4 disabled:opacity-50 text-cwhite-1 py-3 px-4 rounded-lg transition-all text-sm lg:text-base font-medium"
                    >
                        Отмена
                    </button>
                </div>
            </form>
        </div>
    );
}