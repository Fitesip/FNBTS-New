'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import UserPhoto from "@/components/UserPhoto";
import UserFrame from "@/components/UserFrame";
import {useParams, useRouter} from "next/navigation";
import Link from "next/link";
import type { Frame } from "@/types/shop"
import { frames } from "@/constants/frames"
import {RARITY_ORDER} from "@/constants";
import Image from "next/image";
import UserBanner from "@/components/UserBanner";
import UploadBannerForm from "@/components/UploadBannerForm";
import UploadPhotoForm from "@/components/UploadPhotoForm";

export default function PersonalizationPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [ownedFrames, setOwnedFrames] = useState<number[]>([]);
    const [framesLoaded, setFramesLoaded] = useState(false);
    const params = useParams();
    const currentUser = params.id;

    useEffect(() => {
        document.title = 'Мои рамки | ФНБТС';

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Выбор рамок для вашего профиля на ФНБТС! Применяйте купленные рамки.');
        } else {
            const newMeta = document.createElement('meta');
            newMeta.name = 'description';
            newMeta.content = 'Выбор рамок для вашего профиля на ФНБТС! Применяйте купленные рамки.';
            document.head.appendChild(newMeta);
        }
    }, []);

    useEffect(() => {
        if (user && user.id !== parseInt(currentUser?.toString() as string)) {
            router.push(`/user/${user.id}/personalization`);
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

    const applyFrame = async (frameUrl: string | null) => {
        if (!user) {
            setError('Требуется авторизация!');
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
            const response = await fetch(`/api/users/${user.id}/frame`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    frameUrl: frameUrl
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                setMessage(frameUrl ? 'Рамка применена!' : 'Рамка убрана');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setError(result.error || 'Ошибка при применении рамки');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError('Ошибка сети: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const isFrameOwned = (frameId: number): boolean => {
        return ownedFrames.includes(frameId) || frames.find(f => f.id === frameId)?.isDefault || false;
    };

    // Рамки во владении (включая дефолтные)
    const ownedFramesList = frames
        .filter(frame => isFrameOwned(frame.id))
        .sort((a, b) => {
            const aRarityOrder = RARITY_ORDER[a.rarity as keyof typeof RARITY_ORDER] || 6;
            const bRarityOrder = RARITY_ORDER[b.rarity as keyof typeof RARITY_ORDER] || 6;
            return aRarityOrder - bRarityOrder;
        });

    if (!user) {
        return (
            <div className="p-4 lg:p-6 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter mx-4 lg:mx-0">
                <div className="text-center py-6 lg:py-8">
                    <p className="mb-4 text-sm lg:text-base">Для доступа к персонализации необходимо авторизоваться</p>
                    <button
                        onClick={() => router.push(`/auth/login?redirect=/user/0/personalization`)}
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
            <div className="max-w-6xl p-4 lg:p-6 mt-5 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 mb-5 mx-4 lg:mx-auto text-cwhite-1">
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-1"></div>
                    <span className="ml-3">Загрузка ваших рамок...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`max-w-344 p-4 lg:p-6 mt-5 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 mb-5 mx-4 lg:mx-auto text-cwhite-1`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <Link
                        href={`/user/${user.id}`}
                        className="back-link inline-flex items-center gap-2 hover:text-cyan-1/70 font-medium transition-colors duration-200 group text-sm lg:text-base mb-2"
                    >
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Назад к профилю
                    </Link>
                    <h1 className={`text-xl lg:text-3xl font-bold mb-2`}>Персонализация</h1>
                    <p className="text-gray-400 text-sm lg:text-base">Выберите рамку для вашего аватара, измените аватар или баннер</p>
                </div>
                <Link
                    href={`/user/${user.id}/shop`}
                    className="px-4 py-2 bg-cyan-1 text-cwhite-1 rounded-lg hover:bg-cyan-1/80 transition-colors text-sm"
                >
                    Магазин рамок
                </Link>
            </div>

            {/* Предпросмотр текущего аватара */}
            <div className="p-4 lg:p-6 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                <div className="space-y-4 lg:space-y-6">
                    {/* Баннер */}
                    <div className="space-y-3 lg:space-y-4">
                        <h3 className="text-base lg:text-lg font-semibold">Баннер профиля</h3>
                        <div className="relative w-full h-40 lg:w-7xl lg:h-80 rounded-lg bg-cgray-2 overflow-hidden">
                            <UserBanner
                                userId={user.id}
                                width={1280}
                                height={320}
                                alt={'banner'}
                                className="w-full h-full object-cover rounded-lg"
                            />

                            <div className="absolute top-0 h-full w-full">
                                <UploadBannerForm
                                    userId={user.id.toString()}
                                    onPhotoUploaded={() => {}}
                                />
                            </div>

                        </div>
                    </div>

                    {/* Аватар */}
                    <div className="space-y-3 lg:space-y-4">
                        <h3 className="text-base lg:text-lg font-semibold">Аватар профиля</h3>
                        <div className="flex flex-col items-center gap-4 lg:gap-6 p-3 lg:p-4 bg-cgray-1 rounded-lg transition-all duration-300 hover:shadow-lg">
                            <div className="relative shrink-0">
                                <div className="relative z-10">
                                    <UserPhoto
                                        userId={user.id}
                                        width={120}
                                        height={120}
                                        alt={'avatar'}
                                        className="rounded-full size-30 lg:size-40"
                                    />
                                    <div className="absolute top-0 size-38 lg:size-38 -ml-4 -mt-4 lg:mt-1">
                                        <UserFrame
                                            userId={user.id}
                                            width={200}
                                            alt={'frame'}
                                            className=""
                                        />
                                    </div>
                                </div>
                                <div className="absolute top-5 lg:top-5 z-100 left-20 lg:left-25">
                                    <UploadPhotoForm
                                        userId={user.id.toString()}
                                        onPhotoUploaded={() => {}}
                                    />
                                </div>
                            </div>
                            <div className="text-center lg:text-left w-full">
                                <p className="text-xs lg:text-sm text-cwhite-1/70">
                                    Поддерживаются JPG, PNG, WEBP. Максимальный размер: 5MB. Рекомендуемое разрешение: 200x200.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Сообщения */}
            {message && (
                <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-green-1/20 border border-green-1 text-green-1 rounded-lg mt-4 text-sm lg:text-base">
                    {message}
                </div>
            )}
            {error && (
                <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-red-1/20 border border-red-1 text-red-1 rounded-lg mt-4 text-sm lg:text-base">
                    {error}
                </div>
            )}

            {/* Сетка рамок */}
            <div className="p-4 lg:p-6 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                <h2 className="text-lg lg:text-xl font-semibold mb-6 text-cwhite-1">Доступные рамки ({ownedFramesList.length})</h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-6">
                    {/* Рамка "Без рамки" */}
                    <div className={`bg-cgray-1 rounded-lg p-3 lg:p-4 border-2 text-gray-400 transition-all cursor-pointer hover:scale-105`}
                         onClick={() => applyFrame(null)}>
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gray-600 mb-2 lg:mb-3 flex items-center justify-center">
                                <span className="text-gray-400 text-xs text-center">Без рамки</span>
                            </div>
                            <span className="text-cwhite-1 font-medium text-center text-sm lg:text-base">Без рамки</span>
                            <span className="text-gray-400 text-xs mt-1">Обычная</span>
                        </div>
                    </div>

                    {ownedFramesList.map((frame) => (
                        <div
                            key={frame.id}
                            className={`bg-cgray-1 rounded-lg p-3 lg:p-4 border-2 transition-all cursor-pointer hover:scale-105
                            ${frame.rarity.startsWith('Обычная') ? "border-gray-400" :
                                frame.rarity.startsWith('Необычная') ? "border-cyan-1" :
                                    frame.rarity.startsWith('Редкая') ? "border-purple-1" :
                                        frame.rarity.startsWith('Эпическая') ? "border-pink-1" :
                                            frame.rarity.startsWith('Легендарная') ? "border-red-1" : 
                                                frame.rarity.startsWith('Эксклюзивная') ? "border-yellow-1" : "border-gray-400"}`}
                            onClick={() => applyFrame(frame.url)}
                        >
                            <div className="flex flex-col items-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={frame.url} alt={frame.name} className={`size-16 lg:size-21`} />
                                <span className="text-cwhite-1 font-medium text-center mt-2 lg:mt-3 text-sm lg:text-base">{frame.name}</span>
                                <span className={`
                                ${frame.rarity.startsWith('Обычная') ? "text-gray-400" :
                                    frame.rarity.startsWith('Необычная') ? "text-cyan-1" :
                                        frame.rarity.startsWith('Редкая') ? "text-purple-1" :
                                            frame.rarity.startsWith('Эпическая') ? "text-pink-1" :
                                                frame.rarity.startsWith('Легендарная') ? "text-red-1" :
                                                    frame.rarity.startsWith('Эксклюзивная') ? "text-yellow-1" : "text-gray-400"}
                                    text-xs mt-1
                                `}>
                                    {frame.rarity}
                                </span>
                                {frame.isDefault && (
                                    <span className="text-green-1 text-xs mt-1">По умолчанию</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {ownedFramesList.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                        <p>У вас пока нет рамок</p>
                        <Link
                            href={`/user/${user.id}}/shop`}
                            className="inline-block mt-4 px-6 py-2 bg-cyan-1 text-cwhite-1 rounded-lg hover:bg-cyan-1/80 transition-colors"
                        >
                            Перейти в магазин
                        </Link>
                    </div>
                )}
                {user.email_verified && (
                    <div className="p-4 lg:p-6 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                        <h2 className="text-lg lg:text-xl font-semibold mb-4 text-cwhite-1">Обои</h2>
                        <div className="flex flex-col items-center gap-4 lg:gap-8">
                            
                            <Link download href={`/FNBTS-Wallpaper-desktop-1.png`}>
                                <Image src={'/FNBTS-Wallpaper-desktop-1.png'} alt={'desktop1'} width={1920} height={1080}/>
                                Обои для ПК #1
                            </Link>
                            <Link download href={`/FNBTS-Wallpaper-desktop-2.png`}>
                                <Image src={'/FNBTS-Wallpaper-desktop-2.png'} alt={'desktop2'} width={1920} height={1080}/>
                                Обои для ПК #2
                            </Link>
                            <div className="flex gap-4 lg:gap-8">
                                <Link download href={`/FNBTS-Wallpaper-mobile-1.png`}>
                                    <Image src={'/FNBTS-Wallpaper-mobile-1.png'} alt={'mobile1'} width={1080} height={1920}/>
                                    Обои для телефона #1
                                </Link>
                                <Link download href={`/FNBTS-Wallpaper-mobile-2.png`}>
                                    <Image src={'/FNBTS-Wallpaper-mobile-2.png'} alt={'mobile2'} width={1080} height={1920}/>
                                    Обои для телефона #2
                                </Link>
                            </div>

                        </div>
                    </div>
                )}

            </div>

            {/* Информация о загрузке */}
            {loading && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-cgray-2 p-4 lg:p-6 rounded-lg flex items-center gap-3 mx-4">
                        <div className="animate-spin rounded-full h-5 w-5 lg:h-6 lg:w-6 border-b-2 border-cyan-1"></div>
                        <span className="text-cwhite-1 text-sm lg:text-base">
                            Применение рамки...
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}