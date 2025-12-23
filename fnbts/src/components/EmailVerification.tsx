// src/app/components/EmailVerification.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function EmailVerification() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSendVerification = async () => {
        if (!user?.email) return;

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await fetch('/api/auth/send-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: user.email }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage(data.message);
            } else {
                setError(data.error || 'Ошибка при отправке письма');
            }
        } catch {
            setError('Ошибка сети. Пожалуйста, попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return null;
    }
    if (user.email_verified) {
        return null;
    }
    return (
        <div className="bg-cgray-2 rounded-lg p-6 border border-cgray-1 mb-6 z-100">
            <h3 className="text-lg font-semibold text-cwhite-1 mb-4">Подтверждение Email</h3>

            <div className="space-y-4">
                <div className="flex items-center gap-3 text-red-1">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span>Ваш email не подтвержден</span>
                </div>
                <p className="text-gray-400 text-sm">
                    Для полного доступа к функциям сайта необходимо подтвердить ваш email адрес.
                    Проверьте вашу почту <strong>{user.email}</strong> и перейдите по ссылке из письма.
                </p>
                <button
                    onClick={handleSendVerification}
                    disabled={loading}
                    className="px-6 py-3 bg-cyan-1 hover:bg-cyan-1/70 hover:scale-95 transition-all text-white rounded-lg hover:bg-cyan-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Отправка...' : 'Отправить письмо повторно'}
                </button>
                {message && (
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