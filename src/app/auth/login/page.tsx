'use client';

import {useState, FormEvent, Suspense, useEffect} from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {TokenManager} from "@/lib/tokenUtils";

// Вынеси основную логику в отдельный компонент
function LoginContent() {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');

    const { login, checkAuth, user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const redirectTo = searchParams.get('redirect') || null;

    useEffect(() => {
        // Динамическое изменение title
        document.title = 'Авторизация | ФНБТС'

        // Добавление meta description
        const metaDescription = document.querySelector('meta[name="description"]')
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Войдите в свой аккаунт на ФНБТС!')
        } else {
            const newMeta = document.createElement('meta')
            newMeta.name = 'Авторизация | ФНБТС'
            newMeta.content = 'Войдите в свой аккаунт на ФНБТС!'
            document.head.appendChild(newMeta)
        }
    }, [])

    useEffect(() => {
        let localToken = localStorage.getItem('accessToken');
        const checkTokens = async () => {
            setRefreshing(true);
            const tokenManager = new TokenManager();
            const token = await tokenManager.getValidAccessToken()
            let succ = false
            if (!token) {
                const refreshToken = tokenManager.getRefreshToken();
                if (refreshToken) {
                    await tokenManager.refreshTokens()
                    localToken = localStorage.getItem('accessToken');
                    await checkAuth().then((r) => {if (r) succ = true})
                }
                else {
                    return false
                }
            }
            if (token != localToken) {
                await tokenManager.ensureValidToken()
                localToken = localStorage.getItem('accessToken');
                await checkAuth().then((r) => {if (r) succ = true})
            }
            if (token == localToken) {
                const valid = tokenManager.isAccessTokenValid()
                if (valid) {
                    succ = true
                }
            }
            return succ
        }
        checkTokens().then((r) => {
            if (r) {
                if (localToken) {
                    const payload = JSON.parse(atob(localToken.split('.')[1]));

                    if (redirectTo) {
                        router.push(`${redirectTo}`);
                    } else {
                        router.push(`/user/${payload.userId}`)
                    }
                }
            }
            else {
                setRefreshing(false);
            }
        })
    }, []);


    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        if (!email || !password) {
            setMessage('Пожалуйста, заполните все поля');
            setLoading(false);
            return;
        }

        const result = await login(email, password);

        if (result.success) {
            setMessage('Успешный вход! Перенаправление...');
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (redirectTo) {
                        setTimeout(() => router.push(`${redirectTo}`), 1000);
                    }
                    else {
                        setTimeout(() => router.push(`/user/${payload.userId}`), 1000);
                    }

                } catch {
                    setTimeout(() => router.push('/'), 1000);
                }
            }
        } else {
            setMessage(result.message || 'Ошибка входа');
            setLoading(false);
        }
    };

    if (refreshing) {
        return (
            <div className="flex items-center justify-center mt-10 lg:mt-40 px-4">
                <div className="w-full max-w-300 p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter shadow-xl text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cwhite-1 mx-auto mb-4"></div>
                    <p className="text-sm lg:text-base">
                        Обновление сессии...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-container mt-40 text-cwhite-1 flex z-10">
            {/* Левая часть - изображение */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br items-center justify-center p-12">
                <div className="text-white text-center max-w-md">
                    <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <h3 className="text-3xl font-bold mb-4">Добро пожаловать!</h3>
                    <p className="text-lg leading-relaxed">
                        Рады снова вас видеть! Войдите в свой аккаунт для получения доступа к остальным функциям сайта.
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

                        <div className="mt-6 text-center">
                            <Link
                                href="/auth/register"
                                className="text-sm font-medium hover:text-cyan-1 transition-colors"
                            >
                                Нет аккаунта? Зарегистрируйтесь
                            </Link>
                        </div>
                        <div className="mt-4 text-center">
                            <Link
                                href="/auth/forgot-password"
                                className="text-sm font-medium hover:text-pink-1 transition-colors"
                            >
                                Забыли пароль?
                            </Link>
                        </div>
                        {message && (
                            <div className={`text-center w-full mt-5 p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 text-sm lg:text-xl rounded-lg bg-filter ${
                                message.includes('Успешный') ? 'text-green-1' : 'text-red-1'
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

// Основной компонент с Suspense
export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="auth-container mt-40 text-cwhite-1 flex z-10">
                <div className="w-full flex items-center justify-center p-8">
                    <div className="w-full max-w-md text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-1 mx-auto mb-4"></div>
                        <h2 className="text-2xl font-bold mb-2">Загрузка...</h2>
                        <p className="text-gray-400">Подготовка страницы входа</p>
                    </div>
                </div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}