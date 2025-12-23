'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {useParams, useRouter} from "next/navigation";
import Link from "next/link";
import { frames, currencyPackages, points } from "@/constants";
import type { Frame, CurrencyPackage, Points } from "@/types/shop";
import TransactionsPage from "@/components/Transactions";
import {SubscriptionManager} from "@/components/SubscriptionManager";

export default function FrameShopPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [mobileTappedFrame, setMobileTappedFrame] = useState<number | null>(null);
    const [ownedFrames, setOwnedFrames] = useState<number[]>([]);
    const [framesLoaded, setFramesLoaded] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'frames' | 'currency' | 'points' | 'history'>('frames');
    const params = useParams();
    const currentUser = params.id;

    useEffect(() => {
        document.title = 'Магазин | ФНБТС';

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Магазин рамок и валюты для вашего профиля на ФНБТС! Покупайте рамки и валюту за поинты.');
        } else {
            const newMeta = document.createElement('meta');
            newMeta.name = 'description';
            newMeta.content = 'Магазин рамок и валюты для вашего профиля на ФНБТС! Покупайте рамки и валюту за поинты.';
            document.head.appendChild(newMeta);
        }
    }, []);

    useEffect(() => {
        if (user && user.id !== parseInt(currentUser?.toString() as string)) {
            router.push(`/user/${user.id}/shop`);
        }
        if (user) {
            loadOwnedFrames();
        }
    }, [user]);

    const loadOwnedFrames = async () => {
        if (!user) return;

        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.log('No token found');
            return;
        }

        try {
            const response = await fetch(`/api/users/${user.id}/owned-frames`, {
                method: 'GET',
                headers: {
                    'authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Owned frames response:', result);

            if (result.success) {
                setOwnedFrames(result.ownedFrames || []);
            } else {
                console.error('Error loading frames:', result.error);
            }
        } catch (err) {
            console.error('Ошибка загрузки купленных рамок:', err);
        } finally {
            setFramesLoaded(true);
        }
    };

    const purchaseFrame = async (frame: Frame) => {
        if (!user) {
            setError('Требуется авторизация!');
            return;
        }

        if (user.points < frame.pointsRequired) {
            setError('Недостаточно поинтов для покупки!');
            return;
        }

        const token = localStorage.getItem('accessToken');
        if (!token) {
            setError('Требуется авторизация!');
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await fetch(`/api/users/${user.id}/purchase-frame`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    frameId: frame.id,
                    pointsCost: frame.pointsRequired,
                    author: frame.author ? frame.author : null,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                setMessage(`Рамка "${frame.name}" успешно куплена!`);
                setOwnedFrames(prev => [...prev, frame.id]);
                user.points = user.points - frame.pointsRequired;

                setTimeout(() => setMessage(''), 3000);
            } else {
                setError(result.error || 'Ошибка при покупке рамки');
            }
        } catch (err: unknown) {
            console.error('Purchase error:', err);
            if (err instanceof Error) {
                setError('Ошибка сети: ' + err.message);
            } else {
                setError('Неизвестная ошибка при покупке');
            }
        } finally {
            setLoading(false);
        }
    };

    const purchaseCurrency = async (currencyPackage: CurrencyPackage) => {
        if (!user) {
            setError('Требуется авторизация!');
            return;
        }

        if (user.points < currencyPackage.pointsCost) {
            setError('Недостаточно поинтов для покупки!');
            return;
        }

        const token = localStorage.getItem('accessToken');
        if (!token) {
            setError('Требуется авторизация!');
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const frameId = currencyPackage.frameId;

            const response = await fetch(`/api/users/${user.id}/purchase-currency`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    packageId: currencyPackage.id,
                    hleb: currencyPackage.hleb,
                    sfl: currencyPackage.sfl,
                    pointsCost: currencyPackage.pointsCost,
                    author: currencyPackage.author || null,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                if (frameId) {
                    try {
                        const response = await fetch(`/api/users/${user.id}/purchase-frame`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'authorization': `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                frameId: frameId,
                                pointsCost: 0
                            }),
                        });
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }

                        const result = await response.json();
                        if (result.success) {
                            setOwnedFrames(prev => [...prev, frameId]);
                        } else {
                            setError(result.error || 'Ошибка при покупке рамки');
                        }
                    } catch (err: unknown) {
                        console.error('Purchase error:', err);
                    }
                }

                setMessage(`Набор "${currencyPackage.name}" успешно куплен!`);
                user.points = user.points - currencyPackage.pointsCost;

                setTimeout(() => setMessage(''), 3000);
            } else {
                setError(result.error || 'Ошибка при покупке валюты');
            }
        } catch (err: unknown) {
            console.error('Currency purchase error:', err);
            if (err instanceof Error) {
                setError('Ошибка сети: ' + err.message);
            } else {
                setError('Неизвестная ошибка при покупке');
            }
        } finally {
            setLoading(false);
        }
    };

    const isFrameAvailableForPurchase = (frame: Frame): boolean => {
        if (!user) return false;
        if (ownedFrames.includes(frame.id)) return false;
        if (frame.isDefault) return false;
        if (user.points < frame.pointsRequired) return false;
        return !(frame.roles.length > 0 && (!user.role || !frame.roles.includes(user.role)));

    };

    const shopFrames = frames
        .filter(frame => !frame.isDefault && !ownedFrames.includes(frame.id))
        .map(frame => ({
            ...frame,
            canPurchase: isFrameAvailableForPurchase(frame)
        }))
        .sort((a, b) => {
            if (a.canPurchase && !b.canPurchase) return -1;
            if (!a.canPurchase && b.canPurchase) return 1;
            return a.pointsRequired - b.pointsRequired;
        });

    const handleFrameClick = (frame: Frame) => {
        if (isFrameAvailableForPurchase(frame)) {
            purchaseFrame(frame);
        } else {
            if (window.innerWidth < 768) {
                setMobileTappedFrame(frame.id);
                setTimeout(() => setMobileTappedFrame(null), 3000);
            }
        }
    };

    const redirectToPaymentPage = async (points: Points) => {
        if (!user) return;
        router.push(`/user/${user.id}/shop/payment/prepare?pointsPackId=${points.id}`);
    }

    if (!user) {
        return (
            <div className="p-4 lg:p-6 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter mx-4 lg:mx-0">
                <div className="text-center py-6 lg:py-8">
                    <p className="mb-4 text-sm lg:text-base">Для доступа к магазину необходимо авторизоваться</p>
                    <button
                        onClick={() => router.push(`/auth/login?redirect=/user/0/shop`)}
                        className="p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:bg-cgray-1 hover:scale-95 transition-all text-sm lg:text-base"
                    >
                        Войти
                    </button>
                </div>
            </div>
        );
    }

    if (!framesLoaded) {
        return (
            <div className="p-4 lg:p-6 mt-5 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 mb-5 mx-4 lg:mx-auto text-cwhite-1">
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-1"></div>
                    <span className="ml-3">Загрузка магазина...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`max-w-100 lg:max-w-6xl p-4 lg:p-6 mt-5 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 mb-5 mx-4 lg:mx-auto text-cwhite-1`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <Link
                        href={`/user/${user.id}`}
                        className="back-link inline-flex items-center gap-2 hover:text-red-1/70 font-medium transition-colors duration-200 group text-sm lg:text-base mb-2"
                    >
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Назад к профилю
                    </Link>
                    <h1 className={`text-xl lg:text-3xl font-bold mb-2`}>Магазин</h1>
                    <p className="text-gray-400 text-sm lg:text-base">Покупайте рамки и валюту за поинты</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-cgray-1 px-4 py-2 rounded-lg">
                        <span className="text-gray-400 text-sm">Ваши поинты:</span>
                        <span className="text-red-1 font-bold text-lg">{user.points || 0}</span>
                    </div>
                </div>
            </div>

            {/* Сообщения */}
            {message && (
                <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-green-1/20 border border-green-1 text-green-1 rounded-lg text-sm lg:text-base">
                    {message}
                </div>
            )}
            {error && (
                <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-red-1/20 border border-red-1 text-red-1 rounded-lg text-sm lg:text-base">
                    {error}
                </div>
            )}

            {/* Табы */}
            <div className="flex border-b border-gray-600 mb-6">
                <div className="lg:hidden mb-4 w-full">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="w-full p-3 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter shadow-xl flex items-center justify-between"
                    >
                        <span className="text-sm">
                            {activeTab === 'frames' && <div className={`flex items-center gap-1`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Рамки
                            </div>}

                            {activeTab === 'currency' && <div className={`flex items-center gap-1`}>
                                <svg className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Паки
                            </div>}

                            {activeTab === 'points' && <div className={`flex items-center gap-1`}>
                                <svg className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Поинты
                            </div>}
                            {activeTab === 'history' && <div className={`flex items-center gap-1`}>
                                <svg className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                История транзакций
                            </div>}
                        </span>
                        <svg
                            className={`w-4 h-4 transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {isMobileMenuOpen && (
                        <div className="mt-2 p-3 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter shadow-xl">
                            <nav className="space-y-2">
                                <div className={'flex gap-1 items-center'}
                                    onClick={() => setActiveTab('frames')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Рамки
                                </div>
                                <div className={'flex gap-1 items-center'}
                                    onClick={() => setActiveTab('currency')}
                                >
                                    <svg className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                    Паки
                                </div>
                                <div className={'flex gap-1 items-center'}
                                    onClick={() => setActiveTab('points')}
                                >
                                    <svg className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Поинты
                                </div>
                                <div className={'flex gap-1 items-center'}
                                    onClick={() => setActiveTab('history')}
                                >
                                    <svg className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                    История транзакций
                                </div>
                            </nav>
                        </div>
                    )}
                </div>
                <div className={'hidden lg:flex'}>
                    <button
                        className={`flex items-center gap-2 py-3 px-6 font-medium text-sm lg:text-base transition-all ${
                            activeTab === 'frames'
                                ? 'text-red-1 border-b-2 border-red-1'
                                : 'text-gray-400 hover:text-gray-300'
                        }`}
                        onClick={() => setActiveTab('frames')}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Рамки
                    </button>
                    <button
                        className={`flex items-center gap-2 py-3 px-6 font-medium text-sm lg:text-base transition-all ${
                            activeTab === 'currency'
                                ? 'text-red-1 border-b-2 border-red-1'
                                : 'text-gray-400 hover:text-gray-300'
                        }`}
                        onClick={() => setActiveTab('currency')}
                    >
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Паки
                    </button>
                    <button
                        className={`flex items-center gap-2 py-3 px-6 font-medium text-sm lg:text-base transition-all ${
                            activeTab === 'points'
                                ? 'text-red-1 border-b-2 border-red-1'
                                : 'text-gray-400 hover:text-gray-300'
                        }`}
                        onClick={() => setActiveTab('points')}
                    >
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Поинты
                    </button>
                    <button
                        className={`flex items-center gap-2 py-3 px-6 font-medium text-sm lg:text-base transition-all ${
                            activeTab === 'history'
                                ? 'text-red-1 border-b-2 border-red-1'
                                : 'text-gray-400 hover:text-gray-300'
                        }`}
                        onClick={() => setActiveTab('history')}
                    >
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        История транзакций
                    </button>
                </div>

            </div>

            {/* Контент табов */}
            {activeTab === 'frames' ? (
                /* Вкладка с рамками */
                <div className="p-4 lg:p-6 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                    <h2 className="text-lg lg:text-xl font-semibold mb-6 text-cwhite-1">Доступные для покупки рамки</h2>

                    {shopFrames.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-6">
                            {shopFrames.map((frame) => {
                                const canPurchase = frame.canPurchase;
                                if (frame.rarity == 'Эксклюзивная') {
                                    return null;
                                }
                                if (frame.isDefault) {
                                    return null;
                                }
                                return (
                                    <div
                                        key={frame.id}
                                        className={`relative bg-cgray-1 rounded-lg p-3 lg:p-4 border-2 transition-all lg:w-48 lg:h-64 w-38 h-54 ${
                                            canPurchase ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed grayscale'
                                        } ${
                                            frame.rarity.startsWith('Обычная') ? "border-gray-400" :
                                                frame.rarity.startsWith('Необычная') ? "border-cyan-1" :
                                                    frame.rarity.startsWith('Редкая') ? "border-purple-1" :
                                                        frame.rarity.startsWith('Эпическая') ? "border-pink-1" :
                                                            frame.rarity.startsWith('Легендарная') ? "border-red-1" : "border-gray-400"
                                        }`}
                                        onClick={() => handleFrameClick(frame)}
                                    >
                                        <div className="flex flex-col items-center h-full justify-between">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={frame.url} alt={frame.name} className={`size-16 lg:size-21 ${!canPurchase ? 'grayscale' : ''}`} />
                                            <span className="text-cwhite-1 font-medium text-center mt-2 lg:mt-3 text-sm lg:text-base">{frame.name}</span>
                                            <span className={`
                                            ${frame.rarity.startsWith('Обычная') ? "text-gray-400" :
                                                frame.rarity.startsWith('Необычная') ? "text-cyan-1" :
                                                    frame.rarity.startsWith('Редкая') ? "text-purple-1" :
                                                        frame.rarity.startsWith('Эпическая') ? "text-pink-1" :
                                                            frame.rarity.startsWith('Легендарная') ? "text-red-1" : "text-gray-400"}
                                                text-xs mt-1
                                            `}>
                                                {frame.rarity}
                                            </span>
                                            <div className="flex items-center gap-1 mt-1 relative">
                                                <span className={`text-sm font-bold flex gap-1 ${
                                                    frame.rarity.startsWith('Обычная') ? "text-gray-400" :
                                                        frame.rarity.startsWith('Необычная') ? "text-cyan-1" :
                                                            frame.rarity.startsWith('Редкая') ? "text-purple-1" :
                                                                frame.rarity.startsWith('Эпическая') ? "text-pink-1" :
                                                                    frame.rarity.startsWith('Легендарная') ? "text-red-1" : "text-gray-400"
                                                }`}>{frame.sale && (
                                                    <span className={`text-xs align-text-top`}>
                                                                                <s>{frame.oldPrice}</s>
                                                                            </span>)}
                                                    {frame.pointsRequired}</span>
                                                <span className="text-gray-400 text-sm">поинтов {frame.sale && frame.oldPrice && (
                                                    <span className={`absolute -top-2 -right-3 text-xs lg:-right-7
                                                    ${
                                                        frame.rarity.startsWith('Обычная') ? "text-gray-400" :
                                                            frame.rarity.startsWith('Необычная') ? "text-cyan-1" :
                                                                frame.rarity.startsWith('Редкая') ? "text-purple-1" :
                                                                    frame.rarity.startsWith('Эпическая') ? "text-pink-1" :
                                                                        frame.rarity.startsWith('Легендарная') ? "text-red-1" : "text-gray-400"
                                                    }`}>-{Math.floor(((frame.oldPrice - frame.pointsRequired) / frame.oldPrice) * 100)}%</span>
                                                )}</span>
                                            </div>

                                            {canPurchase && (
                                                <div className={`mt-2 px-3 py-1 text-cwhite-1 rounded-full text-xs font-medium ${
                                                    frame.rarity.startsWith('Обычная') ? "bg-gray-400" :
                                                        frame.rarity.startsWith('Необычная') ? "bg-cyan-1" :
                                                            frame.rarity.startsWith('Редкая') ? "bg-purple-1" :
                                                                frame.rarity.startsWith('Эпическая') ? "bg-pink-1" :
                                                                    frame.rarity.startsWith('Легендарная') ? "bg-red-1" : "bg-gray-400"
                                                }`}>
                                                    Купить
                                                </div>
                                            )}

                                            {!canPurchase && (
                                                <>
                                                    {/* Hover overlay for desktop */}
                                                    <div className="hidden lg:flex absolute opacity-0 hover:opacity-100 hover:bg-cgray-1/90 transition-all h-full w-full top-0 left-0 rounded-lg items-center justify-center">
                                                        <div className="text-center p-2">
                                                            {frame.roles.length > 0 && (
                                                                <div className="text-[10px] lg:text-xs text-gray-200 mb-1">
                                                                    Требуется: {frame.roles.join(' или ')}
                                                                </div>
                                                            )}
                                                            {frame.pointsRequired > 0 && user.points < frame.pointsRequired && (
                                                                <div className="text-[10px] lg:text-xs text-red-1">
                                                                    Недостаточно поинтов
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Mobile tap overlay */}
                                                    <div className={`md:hidden absolute flex h-full w-full top-0 left-0 rounded-lg items-center justify-center transition-all duration-300 ${
                                                        mobileTappedFrame === frame.id ? 'opacity-100 bg-cgray-1/90' : 'opacity-0'
                                                    }`}>
                                                        <div className="text-center p-2">
                                                            {frame.roles.length > 0 && (
                                                                <div className="text-[10px] lg:text-xs text-gray-200 mb-1">
                                                                    Требуется: {frame.roles.join(' или ')}
                                                                </div>
                                                            )}
                                                            {frame.pointsRequired > 0 && user.points < frame.pointsRequired && (
                                                                <div className="text-[10px] lg:text-xs text-red-1">
                                                                    Недостаточно поинтов
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Mobile touch indicator */}
                                                    <div className="md:hidden absolute top-2 right-2">
                                                        <div className="bg-cgray-2/80 rounded-full p-1">
                                                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <p>Все доступные рамки уже куплены!</p>
                            <Link
                                href={`/user/${user.id}/personalization`}
                                className="inline-block mt-4 px-6 py-2 bg-red-1 text-cwhite-1 rounded-lg hover:bg-red-1/80 transition-colors"
                            >
                                Перейти к моим рамкам
                            </Link>
                        </div>
                    )}
                </div>
            ) : activeTab == 'currency' ? (
                <>
                    {!user.discordConnected ? (
                        <>
                            <div className="p-4 lg:p-6 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter mx-4 lg:mx-0">
                                <div className="text-center py-6 lg:py-8">
                                    <p className="mb-4 text-sm lg:text-base">Для доступа к магазину паков необходимо подключить кошелёк к сайту</p>
                                    <button
                                        onClick={() => router.push(`/user/${user.id}`)}
                                        className="p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:bg-cgray-1 hover:scale-95 transition-all text-sm lg:text-base"
                                    >
                                        Подключить
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Вкладка с валютой */
                        <div className="p-4 lg:p-6 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                            <h2 className="text-lg lg:text-xl font-semibold mb-6 text-cwhite-1">Наборы валюты</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                                {currencyPackages.map((currencyPackage) => {
                                    const canPurchase = user.points >= currencyPackage.pointsCost;

                                    return (
                                        <div
                                            key={currencyPackage.id}
                                            className={`relative bg-cgray-1 rounded-lg p-4 lg:p-6 border  transition-all ${
                                                canPurchase ? 'cursor-pointer hover:scale-105 hover:border-red-1' : 'cursor-not-allowed opacity-70'
                                            } ${
                                                currencyPackage.popular
                                                    ? 'border-yellow-500 bg-linear-to-br from-cgray-1 to-yellow-400/10'
                                                    : 'border-cgray-1'
                                            } ${currencyPackage.author == 'timofeiko256'
                                                ? "bg-linear-to-br from-cgray-1 to-purple-1/20 border-purple-1"
                                                : currencyPackage.author == 'Fitesip'
                                                    ? "bg-linear-to-br from-cgray-1 to-red-1/20 border-red-1"
                                                    : currencyPackage.author == 'sanektigr5'
                                                        ? "bg-linear-to-br from-cgray-1 to-cyan-1/20 border-cyan-1"
                                                        : currencyPackage.author == 'nikulyamp3'
                                                            ? "bg-linear-to-br from-cgray-1 to-pink-1/20 border-pink-1"
                                                                : currencyPackage.author == 'Booler'
                                                                ? "bg-linear-to-br from-cgray-1 to-yellow-1/20 border-yellow-1"
                                                                    : currencyPackage.author
                                                                        ? "bg-linear-to-br from-cgray-1 to-yellow-1/20 border-yellow-500"
                                                                        : ""}`}
                                        >
                                            {currencyPackage.popular && (
                                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                            <span className="bg-yellow-500 text-cwhite-1 px-3 py-1 rounded-full text-xs font-bold">
                                                ПОПУЛЯРНЫЙ
                                            </span>
                                                </div>
                                            )}
                                            {currencyPackage.author && (
                                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                            <span className={`${currencyPackage.author == 'timofeiko256'
                                                ? "bg-purple-1"
                                                : currencyPackage.author == 'Fitesip'
                                                    ? "bg-red-1"
                                                    : currencyPackage.author == 'sanektigr5'
                                                        ? "bg-cyan-1"
                                                        : currencyPackage.author == 'nikulyamp3'
                                                            ? "bg-pink-1"
                                                            : currencyPackage.author == 'Booler'
                                                                ? "bg-yellow-1" 
                                                                :"bg-yellow-500"} text-cwhite-1 px-3 py-1 rounded-full text-xs font-bold`}>
                                                От {currencyPackage.author}
                                            </span>
                                                </div>
                                            )}

                                            <div className="flex flex-col h-full">
                                                <div className="text-center mb-4">
                                                    <h3 className="text-lg lg:text-xl font-bold text-cwhite-1 mb-2">
                                                        {currencyPackage.name}
                                                    </h3>
                                                    <p className="text-gray-400 text-sm">
                                                        {currencyPackage.description}
                                                    </p>
                                                </div>

                                                <div className="grow mb-4">
                                                    <div className="space-y-2">
                                                        {currencyPackage.hleb > 0 && (
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-gray-400 text-sm">Хлеб:</span>
                                                                <span className="text-yellow-800 font-bold">{currencyPackage.hleb.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        {currencyPackage.sfl > 0 && (
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-gray-400 text-sm">СФЛ:</span>
                                                                <span className="text-yellow-500 font-bold">{currencyPackage.sfl.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        {currencyPackage.frameId && (
                                                            <div className="flex items-center justify-between gap-4">
                                                                <span className="text-gray-400 text-sm whitespace-nowrap">Рамка:</span>
                                                                {(() => {
                                                                    const frame = frames.find(f => f.id === currencyPackage.frameId);
                                                                    if (!frame) return null;

                                                                    return (
                                                                        <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
                                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                            <img
                                                                                src={frame.url}
                                                                                alt={frame.name}
                                                                                className="size-12 lg:size-16 object-contain shrink-0"
                                                                            />
                                                                            <div className="min-w-0 flex-1 text-right">
                                                                                <div className="text-cwhite-1 font-medium text-sm truncate">
                                                                                    {frame.name}
                                                                                </div>
                                                                                <div className={`
                                                                        ${frame.rarity.startsWith('Обычная') ? "text-gray-400" :
                                                                                    frame.rarity.startsWith('Необычная') ? "text-cyan-1" :
                                                                                        frame.rarity.startsWith('Редкая') ? "text-purple-1" :
                                                                                            frame.rarity.startsWith('Эпическая') ? "text-pink-1" :
                                                                                                frame.rarity.startsWith('Легендарная') ? "text-red-1" :
                                                                                                    frame.rarity.startsWith('Эксклюзивная') ? "text-yellow-1" : "text-gray-400"}
                                                                            text-xs truncate
                                                                        `}>
                                                                                    {frame.rarity}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="text-center flex flex-col items-center">
                                                    <div className="flex items-center justify-center gap-2 mb-3 relative w-max">
                                                <span className={`text-xl font-bold flex gap-1
                                                ${currencyPackage.author == 'timofeiko256'
                                                    ? "text-purple-1"
                                                    : currencyPackage.author == 'Fitesip'
                                                        ? "text-red-1"
                                                        : currencyPackage.author == 'sanektigr5'
                                                            ? "text-cyan-1"
                                                            : currencyPackage.author == 'nikulyamp3'
                                                                ? "text-pink-1"
                                                                : currencyPackage.author == 'Booler'
                                                                    ? "text-yellow-1" 
                                                                    : currencyPackage.author || currencyPackage.popular
                                                                        ? "text-yellow-500"
                                                                        : "text-red-1"}`}>{currencyPackage.sale && (
                                                                            <span className={`text-xs align-text-top`}>
                                                                                <s>{currencyPackage.oldPrice}</s>
                                                                            </span>)}
                                                    {currencyPackage.pointsCost}</span>
                                                        <span className="text-gray-400 text-sm">поинтов {currencyPackage.sale && currencyPackage.oldPrice && (
                                                            <span className={`absolute -top-1 -right-3 text-xs lg:-right-7
                                                            ${currencyPackage.author == 'timofeiko256'
                                                                ? "text-purple-1"
                                                                : currencyPackage.author == 'Fitesip'
                                                                    ? "text-red-1"
                                                                    : currencyPackage.author == 'sanektigr5'
                                                                        ? "text-cyan-1"
                                                                        : currencyPackage.author == 'nikulyamp3'
                                                                            ? "text-pink-1"
                                                                            : currencyPackage.author == 'Booler'
                                                                                ? "text-yellow-1"
                                                                                : currencyPackage.author || currencyPackage.popular
                                                                                    ? "text-yellow-500"
                                                                                    : "text-red-1"}`}>
                                                                -{Math.floor(((currencyPackage.oldPrice - currencyPackage.pointsCost) / currencyPackage.oldPrice) * 100)}%</span>
                                                        )}</span>
                                                    </div>

                                                    {canPurchase ? (
                                                        <button className={`w-full 
                                                ${currencyPackage.author == 'timofeiko256'
                                                            ? "bg-purple-1 hover:bg-purple-1/80"
                                                            : currencyPackage.author == 'Fitesip'
                                                                ? "bg-red-1 hover:bg-red-1/80"
                                                                : currencyPackage.author == 'sanektigr5'
                                                                    ? "bg-cyan-1 hover:bg-cyan-1/80"
                                                                    : currencyPackage.author == 'nikulyamp3'
                                                                        ? "bg-pink-1 hover:bg-pink-1/80"
                                                                        : currencyPackage.author == 'Booler'
                                                                            ? "bg-yellow-1 hover:bg-yellow-1/80"
                                                                            : currencyPackage.author || currencyPackage.popular
                                                                                ? "bg-yellow-500 hover:bg-yellow-1/80"
                                                                                : "bg-red-1 hover:bg-red-1/80"} text-cwhite-1 py-2 rounded-lg font-medium transition-colors`}
                                                                onClick={() => purchaseCurrency(currencyPackage)}>
                                                            Купить
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="w-full bg-gray-600 text-gray-400 py-2 rounded-lg font-medium cursor-not-allowed"
                                                            disabled
                                                        >
                                                            Недостаточно поинтов
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                        </div>
                    )}
                </>

            ) : activeTab === 'points' ? (
                <div className="p-4 lg:p-6 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                    <h2 className="text-lg lg:text-xl font-semibold mb-6 text-cwhite-1">Наборы поинтов</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                        {points.map((points) => {
                            return (
                                <div
                                    key={points.id}
                                    className={`relative bg-cgray-1 border-cgray-2 rounded-lg p-4 lg:p-6 border-2 transition-all cursor-pointer hover:scale-105 hover:border-red-1`}
                                    onClick={() => redirectToPaymentPage(points)}
                                >
                                    <div className="flex flex-col h-full">
                                        <div className="text-center mb-4">
                                            <h3 className="text-lg lg:text-xl font-bold text-cwhite-1 mb-2">
                                                {points.name}
                                            </h3>
                                            <p className="text-gray-400 text-sm">
                                                {points.description}
                                            </p>
                                        </div>

                                        <div className="grow mb-4">
                                            <div className="space-y-2">
                                                {points.pointsAmount > 0 && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-400 text-sm">Поинты:</span>
                                                        <span className="text-green-400 font-bold">+{points.pointsAmount}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-center flex flex-col items-center">
                                            <div className="flex items-center justify-center gap-2 mb-3 relative w-max">
                                                <span className="text-red-1 text-xl font-bold flex gap-1">{points.sale && (
                                                    <span className={`text-xs align-text-top`}>
                                                                                <s>{points.oldPrice}</s>
                                                                            </span>)}
                                                    {points.cost}</span>
                                                <span className="text-gray-400 text-sm">поинтов {points.sale && points.oldPrice && (
                                                    <span className={`absolute -top-2 -right-3 text-xs lg:-right-7`}>-{Math.floor(((points.oldPrice - points.cost) / points.oldPrice) * 100)}%</span>
                                                )}</span>
                                                <span className="text-gray-400 text-sm">рублей</span>
                                            </div>
                                            <button className="w-full bg-red-1 text-cwhite-1 py-2 rounded-lg font-medium hover:bg-red-1/80 transition-colors">
                                                Купить
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <>
                    <TransactionsPage/>
                </>
            )}

            {/* Информация о загрузке */}
            {loading && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-cgray-2 p-4 lg:p-6 rounded-lg flex items-center gap-3 mx-4">
                        <div className="animate-spin rounded-full h-5 w-5 lg:h-6 lg:w-6 border-b-2 border-red-1"></div>
                        <span className="text-cwhite-1 text-sm lg:text-base">
                            {activeTab === 'frames' ? 'Покупка рамки...' : 'Покупка валюты...'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// TODO: 20 поинтов - 49р
// TODO: 50 поинтов - 119р
// TODO: 100 поинтов - 229р

// TODO: Необычные - 35 поинтов
// TODO: Редкие - 75 поинтов
// TODO: Эпические - 100 поинтов
// TODO: Легендарные - 150 поинтов
