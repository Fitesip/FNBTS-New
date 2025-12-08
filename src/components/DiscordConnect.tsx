// src/app/components/DiscordConnect.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function DiscordConnect() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [code, setCode] = useState(null);

    const handleSendVerification = async () => {
        if (!user) return;

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await fetch(`/api/discord/connect`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
                },
                body: JSON.stringify({
                    username: user.username,
                })
            })

            const data = await response.json()

            if (data.success) {
                console.log(data.data)
                setCode(data.data.verificationCode);
                setMessage(data.message);
            } else {
                setError(data.error || 'Ошибка при создании кода подтверждения');
            }
        } catch {
            setError('Ошибка сети. Пожалуйста, попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="bg-cgray-2 bg-filter rounded-lg p-4 border w-96 border-cgray-1">
            <h3 className="text-lg font-semibold text-cwhite-1 mb-4">Привязка Discord</h3>

            <div className="space-y-4">
                <div className="flex items-center gap-3 text-red-1">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span>Ваш discord не привязан</span>
                </div>
                <p className="text-gray-400 text-sm">
                    Для отображения информации о кошельке вам необходимо привязать свой Discord аккаунт.
                </p>
                <button
                    onClick={handleSendVerification}
                    disabled={loading}
                    className="px-6 py-3 bg-cyan-1 hover:bg-cyan-1/70 hover:scale-95 transition-all text-white rounded-lg hover:bg-cyan-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Загрузка...' : 'Подключить'}
                </button>
                {(message && code) && (
                    <div className="p-3 bg-green-500/20 border border-green-500 text-green-400 rounded-lg text-sm">
                        {message}
                    </div>
                )}
                {error && (
                    <div className="p-3 bg-red-500/20 border border-red-500 text-red-400 rounded-lg text-sm">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}