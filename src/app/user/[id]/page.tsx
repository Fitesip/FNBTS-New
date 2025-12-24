//src/app/user/[id]/route.ts
'use client'
import Image from "next/image";
import {useRouter} from "next/navigation";
import {ChangeEvent, FormEvent, use, useCallback, useEffect, useRef, useState} from "react";
import {User, ApiResponse} from '@/types/database'
import UploadPhotoForm from "@/components/UploadPhotoForm";
import UserPhoto from "@/components/UserPhoto";
import UploadBannerForm from "@/components/UploadBannerForm";
import UserBanner from "@/components/UserBanner";
import UserWallet from "@/components/WalletInfo";
import UserFrame from "@/components/UserFrame";
import {useAuth} from "@/context/AuthContext";
import Link from "next/link";
import EmailVerification from "@/components/EmailVerification";
import {tokenManager} from "@/lib/tokenUtils";
import DiscordConnect from "@/components/DiscordConnect";
import {SubscriptionManager} from "@/components/SubscriptionManager";

interface UserPageProps {
    params: Promise<{
        id: string;
    }>;
}


export default function UserPage({params}: UserPageProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [id, setId] = useState<string | null>(null)
    const [statusChanging, setStatusChanging] = useState<boolean>(false)
    const [loading, setLoading] = useState(false)
    const currentUserId = use(params).id
    const [enableDiscordConnection, setDiscordConnection] = useState<boolean>(false)
    const router = useRouter();

    const {user} = useAuth();

    // Используем useCallback для стабильной функции
    const fetchUser = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/users/${currentUserId}`)
            const result = await response.json()
            if (response.ok && result) {
                setCurrentUser(result)
            } else {
                if (response.status === 404) {
                    setError('Такого пользователя не существует!')
                }
                else {
                    setError('Ошибка загрузки пользователя')
                }
            }
        } catch (err) {
            setError('Неизвестная ошибка, попробуйте позже')
            console.error('Неизвестная ошибка:', err)
        } finally {
            setLoading(false)
        }
    }, [currentUserId])

    useEffect(() => {
        fetchUser()
    }, [fetchUser]);

    useEffect(() => {if (user) {
        setId((user.id).toString())
    }
    }, [user]);

    useEffect(() => {
        if (!currentUser) return;
        // Динамическое изменение title
        document.title = `Профиль ${currentUser.username} | ФНБТС`

        // Добавление meta description
        const metaDescription = document.querySelector('meta[name="description"]')
        if (metaDescription) {
            metaDescription.setAttribute('content', `Обзор профиля ${currentUser.username} на ФНБТС`)
        } else {
            const newMeta = document.createElement('meta')
            newMeta.name = `Профиль ${currentUser.username} | ФНБТС`
            newMeta.content = `Обзор профиля ${currentUser.username} на ФНБТС`
            document.head.appendChild(newMeta)
        }
    }, [currentUser])

    const handlePhotoUploaded = (photoUrl: string) => {
        if (currentUser) {
            setCurrentUser({ ...currentUser, photo: photoUrl });
        }
        setTimeout(() => fetchUser(), 300)

    };
    const handleBannerUploaded = (photoUrl: string) => {
        if (currentUser) {
            setCurrentUser({ ...currentUser, photo: photoUrl });
        }
        setTimeout(() => fetchUser(), 300)
    }
    const handleStatusInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        event.stopPropagation()
        setStatusChanging(true)
    }
    const handleSubmitStatus = async (event: FormEvent) => {
        event.preventDefault()
        if (textareaRef.current) {
            const status = textareaRef.current.value
            try {
                const formData = new FormData();
                formData.append('status', status);
                const response = await fetch(`/api/users/${id}/status`, {
                    method: "POST",
                    body: formData,
                })
                const result: ApiResponse<User> = await response.json()

                if (result.success && currentUser) {
                    setCurrentUser({ ...currentUser, status: status });
                    textareaRef.current.value = status
                    setStatusChanging(false)
                } else {
                    if (response.status === 404) {
                        setError('Ошибка загрузки пользователя')

                    }
                    else {
                        setError('Ошибка загрузки пользователя')
                    }
                }
            } catch (err) {
                console.error('Неизвестная ошибка:', err)
            }
        }
    }



    return (
        <div className="text-white mb-5">
            {currentUser ? (
                <div className="max-w-416 mx-auto mt-5 px-2 lg:px-0">

                    {/* Основной контент */}
                    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                        <EmailVerification/>
                        {/* Основная информация профиля */}
                        <div className="flex-1">
                            <div className="p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter shadow-xl overflow-hidden">
                                {/* Баннер */}
                                <div className="relative w-96 h-40 lg:w-320 lg:h-80 rounded-lg bg-cgray-2 overflow-hidden">
                                    <UserBanner
                                        userId={currentUser.id}
                                        width={1280}
                                        height={320}
                                        alt={'banner'}
                                        className="w-full h-full object-cover rounded-lg"
                                    />

                                </div>

                                {/* Аватар и основная информация */}
                                <div className="relative px-4 lg:px-8 pb-4 lg:pb-8">
                                    <div className="flex flex-col sm:flex-row lg:items-start items-center gap-4 lg:gap-6 -mt-16 lg:-mt-20">
                                        {/* Аватар с фреймом */}
                                        <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                                            <div className="relative z-100"
                                            onClick={() => {
                                                if (user?.id == currentUser?.id) {
                                                    if (user?.role == 'Гл. Администратор') {
                                                        router.push(`/user/${user.id}/admin-panel`)
                                                    }
                                            }}}>
                                                <UserPhoto
                                                    userId={currentUser.id}
                                                    width={120}
                                                    height={120}
                                                    alt={'avatar'}
                                                    className="rounded-full size-30 lg:size-40"
                                                />
                                                <div className="absolute top-0 size-38 lg:size-38 -ml-4 -mt-4 lg:mt-1">
                                                    <UserFrame
                                                        userId={currentUser.id}
                                                        width={200}
                                                        alt={'frame'}
                                                        className=""
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Информация пользователя */}
                                        <div className="flex-1 min-w-0 lg-mt-20 lg:mt-25 text-center sm:text-left">
                                            <div className="flex justify-center sm:justify-start items-center gap-2 mb-3 lg:mb-4">
                                                <h1 className="text-xl lg:text-3xl font-bold truncate">
                                                    {currentUser.username}
                                                    {currentUser.isBlocked ? (<span className={'text-red-1'}>Заблокирован!</span>) : null}
                                                </h1>
                                                {currentUser.verify ? (
                                                    <Image
                                                        width={20}
                                                        height={20}
                                                        src="/verify.png"
                                                        alt="verify"
                                                        className="w-5 h-5 lg:w-6 lg:h-6"
                                                    />
                                                ): null}
                                            </div>

                                            {/* Статус */}
                                            <div className="mb-4 lg:mb-6">
                                                <div className="flex flex-col sm:flex-row items-center gap-2 lg:gap-4 flex-wrap">
                                                    <span className="font-medium text-sm lg:text-base">Статус:</span>
                                                    {currentUserId == id ? (
                                                        <div className="flex flex-col sm:flex-row items-center gap-2 lg:gap-3 w-full sm:w-auto">
                                                            <p className="text-base lg:text-lg cursor-pointer hover:text-blue-400 transition-colors text-center sm:text-left break-words max-w-full">
                                                                {currentUser.status || "Нет статуса"}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-base lg:text-lg text-center sm:text-left break-words max-w-full">
                                                            {currentUser.status || "Пользователь не установил статус"}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Дополнительная информация */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-6">
                                                <div className="space-y-2 lg:space-y-4">
                                                    <div className="flex items-center gap-2 lg:gap-3 p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                                                        <svg className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        <div className="flex flex-col">
                                                            <p className="text-xs lg:text-sm text-left">Роль</p>
                                                            <p className="capitalize text-sm lg:text-base whitespace-nowrap text-left">{currentUser.role}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 lg:gap-3 p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                                                        <svg className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <div className="flex flex-col">
                                                            <p className="text-xs lg:text-sm text-left">Дата регистрации</p>
                                                            <p className="text-sm lg:text-base whitespace-nowrap text-left">{new Date(currentUser.regDate).toLocaleDateString('ru-RU')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 lg:gap-3 p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
                                                        {/*<svg className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">*/}
                                                        {/*    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />*/}
                                                        {/*</svg>*/}
                                                        <svg className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <div className="flex flex-col">
                                                            <p className="text-xs lg:text-sm text-left">Поинты</p>
                                                            <p className="text-sm lg:text-base whitespace-nowrap text-left">{currentUser.points}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Кошелек */}
                                                <div className="flex justify-center sm:justify-start">
                                                    <UserWallet
                                                        currentUserId={user?.id}
                                                        userId={currentUser.id}
                                                        username={currentUser.username}
                                                        onNotFound={() => setDiscordConnection(true)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center mt-10 lg:mt-40 px-4">
                    <div className="w-full max-w-300 p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter shadow-xl text-center">
                        {loading && (
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cwhite-1 mx-auto mb-4"></div>
                        )}
                        <p className="text-sm lg:text-base">
                            {error ? error : "Загрузка профиля..."}
                        </p>
                    </div>
                </div>
            )}
        </div>

    );
}
