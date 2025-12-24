// src/app/auth/register/route.ts
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const [username, setUsername] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');

    useEffect(() => {
        // Динамическое изменение title
        document.title = 'Регистрация | ФНБТС'

        // Добавление meta description
        const metaDescription = document.querySelector('meta[name="description"]')
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Зарегистрируйтесь на ФНБТС!')
        } else {
            const newMeta = document.createElement('meta')
            newMeta.name = 'Авторизация | ФНБТС'
            newMeta.content = 'Зарегистрируйтесь на ФНБТС!'
            document.head.appendChild(newMeta)
        }
    }, [])

    const { register, user, login } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, router]);

    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const result = await register(username, email, password);

        if (result.success) {
            setMessage('Регистрация успешна! Перенаправление...');
            const loginResult = await login(email, password);

            if (loginResult.success) {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        router.push(`/user/${payload.userId}`);
                    } catch {
                        router.push('/');
                    }
                }
            } else {
                setMessage(loginResult.message || 'Ошибка перенаправления');
                setLoading(false);
            }
        } else {
            setMessage(result.message || 'Ошибка регистрации');
        }

        setLoading(false);
    };

    if (user) {
        return null;
    }

    return (
        <div className="auth-container mt-40 text-cwhite-1 flex z-10">
            {/* Левая часть - изображение */}
            <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br items-center justify-center p-12">
                <div className="text-white text-center max-w-md">
                    <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <h3 className="text-3xl font-bold mb-4">Добро пожаловать!</h3>
                    <p className="text-lg leading-relaxed">
                        Присоединяйтесь к нашему сообществу, делитесь мыслями и находите единомышленников
                    </p>
                </div>
            </div>

            {/* Правая часть - форма */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Мобильный заголовок */}
                    <div className="lg:hidden text-center mb-8 -mt-30">
                        <h2 className="text-3xl font-bold mb-2">Вход в систему</h2>
                        <p className="">Войдите в свой аккаунт</p>
                    </div>

                    <div className="lg:bg-transparent rounded-2xl lg:rounded-none p-0 relative">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="form-group">
                                <label className="block text-sm font-semibold mb-2">
                                    Логин
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    disabled={loading}
                                    placeholder="KrutoyNickname"
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
                            <div className="form-group">
                                <label className="block text-sm font-semibold mb-2">
                                    Пароль
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    placeholder="Введите ваш пароль"
                                    className="w-full p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:scale-95 hover:bg-cgray-1 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Вход...' : 'Войти'}
                            </button>
                        </form>

                        <div className="mt-6 text-center hover:text-purple-1 transition-all text-sm font-medium">
                            <Link
                                href="/auth/login"
                                className="font-medium"
                            >
                                Уже есть аккаунт? Войдите
                            </Link>
                        </div>

                        {message && (
                            <div className={`text-center w-full mt-5 p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter ${
                                message.includes('успешна') ? 'text-green-1' : 'text-red-1'
                            }`}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

    );
}