// src/app/auth/forgot-password/[token]/route.ts
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [tokenValid, setTokenValid] = useState<boolean | null>(null);

    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    // Проверяем валидность токена при загрузке
    useEffect(() => {
        const checkToken = async () => {
            try {
                const response = await fetch(`/api/auth/verify-reset-token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();

                if (data.success) {
                    setTokenValid(true);
                } else {
                    setTokenValid(false);
                    setError(data.error || 'Ссылка для сброса пароля недействительна или устарела');
                }
            } catch {
                setTokenValid(false);
                setError('Ошибка при проверке ссылки');
            }
        };

        if (token) {
            checkToken();
        }
    }, [token]);

    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        if (!newPassword || !confirmPassword) {
            setError('Пожалуйста, заполните все поля');
            setLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Пароли не совпадают');
            setLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setError('Пароль должен содержать минимум 6 символов');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage('Пароль успешно изменен! Вы будете перенаправлены на страницу входа.');
                setTimeout(() => {
                    router.push('/auth/login');
                }, 3000);
            } else {
                setError(data.error || 'Произошла ошибка при сбросе пароля');
            }
        } catch {
            setError('Ошибка сети. Пожалуйста, попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };

    if (tokenValid === null) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-1 mx-auto mb-4"></div>
                    <p className="text-cwhite-1">Проверка ссылки...</p>
                </div>
            </div>
        );
    }

    if (tokenValid === false) {
        return (
            <div className="auth-container mt-40 text-cwhite-1 flex z-10">
                <div className="w-full flex items-center justify-center p-8">
                    <div className="w-full max-w-md text-center">
                        <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 mb-6">
                            <h2 className="text-2xl font-bold mb-4">Ссылка недействительна</h2>
                            <p className="mb-4">{error}</p>
                            <Link
                                href="/auth/forgot-password"
                                className="inline-block px-6 py-3 bg-cyan-1 text-white rounded-lg hover:bg-cyan-2 transition-colors"
                            >
                                Запросить новую ссылку
                            </Link>
                        </div>
                        <Link
                            href="/auth/login"
                            className="font-medium hover:text-cyan-1 transition-colors"
                        >
                            ← Вернуться к входу
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container mt-40 text-cwhite-1 flex z-10">
            {/* Левая часть - изображение */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br items-center justify-center p-12">
                <div className="text-white text-center max-w-md">
                    <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <h3 className="text-3xl font-bold mb-4">Новый пароль</h3>
                    <p className="text-lg leading-relaxed">
                        Придумайте новый надежный пароль для вашего аккаунта
                    </p>
                </div>
            </div>

            {/* Правая часть - форма */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Мобильный заголовок */}
                    <div className="lg:hidden text-center mb-8 -mt-30">
                        <h2 className="text-3xl font-bold mb-2">Новый пароль</h2>
                        <p className="">Придумайте новый пароль</p>
                    </div>

                    <div className="lg:bg-transparent rounded-2xl lg:rounded-none p-0 relative">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="form-group">
                                <label className="block text-sm font-semibold mb-2">
                                    Новый пароль
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    placeholder="Введите новый пароль"
                                    minLength={6}
                                    className="w-full p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter"
                                />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-semibold mb-2">
                                    Подтвердите пароль
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    placeholder="Повторите новый пароль"
                                    minLength={6}
                                    className="w-full p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:scale-95 hover:bg-cgray-1 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Смена пароля...' : 'Установить новый пароль'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <Link
                                href="/auth/login"
                                className="font-medium hover:text-cyan-1 transition-colors"
                            >
                                ← Вернуться к входу
                            </Link>
                        </div>

                        {message && (
                            <div className="absolute text-center w-full mt-5 p-4 text-cwhite-1 bg-green-500/20 border border-green-500 rounded-lg">
                                {message}
                            </div>
                        )}

                        {error && (
                            <div className="absolute text-center w-full mt-5 p-4 text-cwhite-1 bg-red-500/20 border border-red-500 rounded-lg">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}