// src/app/auth/forgot-password/route.ts
'use client';

import {useState, FormEvent, useEffect} from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState<string>('');
    const [login, setLogin] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        // Динамическое изменение title
        document.title = 'Восстановление пароля | ФНБТС'

        // Добавление meta description
        const metaDescription = document.querySelector('meta[name="description"]')
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Восстановление пароля от аккаунта на ФНБТС')
        } else {
            const newMeta = document.createElement('meta')
            newMeta.name = 'Восстановление пароля | ФНБТС'
            newMeta.content = 'Восстановление пароля от аккаунта на ФНБТС'
            document.head.appendChild(newMeta)
        }
    }, [])

    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        if (!email || !login) {
            setError('Пожалуйста, заполните все поля');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, login }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage('Ссылка для сброса пароля отправлена на вашу почту! Проверьте папку "Спам", если не видите письмо.');
                setEmail('');
                setLogin('');
            } else {
                setError(data.error || 'Произошла ошибка при отправке запроса');
            }
        } catch {
            setError('Ошибка сети. Пожалуйста, попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container mt-40 text-cwhite-1 flex z-10">
            {/* Левая часть - изображение */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br items-center justify-center p-12">
                <div className="text-white text-center max-w-md">
                    <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h3 className="text-3xl font-bold mb-4">Восстановление пароля</h3>
                    <p className="text-lg leading-relaxed">
                        Укажите ваш email и логин, и мы отправим вам ссылку для сброса пароля
                    </p>
                </div>
            </div>

            {/* Правая часть - форма */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Мобильный заголовок */}
                    <div className="lg:hidden text-center mb-8 -mt-30">
                        <h2 className="text-3xl font-bold mb-2">Восстановление пароля</h2>
                        <p className="">Введите ваши данные для восстановления</p>
                    </div>

                    <div className="lg:bg-transparent rounded-2xl lg:rounded-none p-0 relative">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="form-group">
                                <label className="block text-sm font-semibold mb-2">
                                    Логин
                                </label>
                                <input
                                    type="text"
                                    value={login}
                                    onChange={(e) => setLogin(e.target.value)}
                                    required
                                    disabled={loading}
                                    placeholder="Введите ваш логин"
                                    className="w-full p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter"
                                />
                            </div>

                            <div className="form-group">
                                <label className="block text-sm font-semibold mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    placeholder="your@email.com"
                                    className="w-full p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:scale-95 hover:bg-cgray-1 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Отправка...' : 'Отправить ссылку для сброса'}
                            </button>
                        </form>

                        <div className="mt-6 text-center space-y-3">
                            <Link
                                href="/auth/login"
                                className="font-medium text-sm block hover:text-red-1 transition-all"
                            >
                                ← Вернуться к входу
                            </Link>
                            <Link
                                href="/auth/register"
                                className="font-medium text-sm block hover:text-cyan-1 transition-all"
                            >
                                Нет аккаунта? Зарегистрируйтесь
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