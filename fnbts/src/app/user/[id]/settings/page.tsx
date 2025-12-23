// src/app/settings/page.tsx
'use client'
import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { User, ApiResponse } from '@/types/database';
import UploadPhotoForm from "@/components/UploadPhotoForm";
import UserPhoto from "@/components/UserPhoto";
import UploadBannerForm from "@/components/UploadBannerForm";
import UserBanner from "@/components/UserBanner";
import UserFrame from "@/components/UserFrame";
import { useAuth } from "@/context/AuthContext";
import {tokenManager} from "@/lib/tokenUtils";
import {SubscriptionManager} from "@/components/SubscriptionManager";

type SettingsSection = 'profile' | 'appearance' | 'security';

export default function SettingsPage() {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusChanging, setStatusChanging] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
    const [sectionAnimation, setSectionAnimation] = useState<'entering' | 'leaving' | 'active'>('active');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;
        document.title = `Настройки | ФНБТС`;

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', `Настройки профиля ${user.username} на ФНБТС`);
        }
    }, [user]);

    const changeSection = async (section: SettingsSection) => {
        if (section === activeSection) return;

        setSectionAnimation('leaving');

        // Ждем завершения анимации исчезания
        await new Promise(resolve => setTimeout(resolve, 200));

        setActiveSection(section);
        setSectionAnimation('entering');
        setIsMobileMenuOpen(false);

        // Переключаем на активное состояние после появления
        setTimeout(() => {
            setSectionAnimation('active');
        }, 200);
    };

    const handleStatusInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        event.stopPropagation();
        setStatusChanging(true);
    };

    const handleSubmitStatus = async (event: FormEvent) => {
        event.preventDefault();
        if (!user) return;

        if (textareaRef.current) {
            const status = textareaRef.current.value;
            try {
                const formData = new FormData();
                formData.append('status', status);
                const response = await fetch(`/api/users/${user.id}/status`, {
                    method: "POST",
                    body: formData,
                });
                const result: ApiResponse<User> = await response.json();

                if (result.success && user) {
                    textareaRef.current.value = status;
                    setStatusChanging(false);
                } else {
                    setError('Ошибка обновления статуса');
                }
            } catch (err) {
                console.error('Неизвестная ошибка:', err);
                setError('Неизвестная ошибка');
            }
        }
    };

    const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({
            ...prev,
            [name]: value
        }));
        setPasswordError(null);
        setPasswordSuccess(null);
    };

    const handlePasswordSubmit = async (e: FormEvent) => {
        if (!user) return
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(null);

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError("Новые пароли не совпадают");
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setPasswordError("Пароль должен содержать минимум 6 символов");
            return;
        }

        try {
            const token = localStorage.getItem("accessToken");
            if (!token) {
                setPasswordError('Вы не авторизованы!')
                return;
            }
            const response = await fetch(`/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    email: user.email,
                    password: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setPasswordSuccess("Пароль успешно изменен");
                setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            } else {
                setPasswordError(result.error || "Ошибка при изменении пароля");
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
            setPasswordError(errorMessage);
        }
    };

    // Анимационные классы
    const getSectionAnimationClass = () => {
        switch (sectionAnimation) {
            case 'entering':
                return 'opacity-0 scale-105 translate-y-4';
            case 'leaving':
                return 'opacity-0 scale-95 -translate-y-4';
            case 'active':
                return 'opacity-100 scale-100 translate-y-0';
            default:
                return '';
        }
    };

    const getButtonClass = (section: SettingsSection) => {
        const baseClass = "w-full text-left px-4 py-3 rounded-lg transition-all duration-300 transform text-sm lg:text-base flex items-center gap-1";
        if (activeSection === section) {
            return `${baseClass} bg-cgray-1 text-pink-1 scale-105 shadow-lg`;
        }
        return `${baseClass} hover:bg-cgray-1 hover:text-cwhite-1 hover:scale-102`;
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center mt-40 px-4">
                <div className="w-full max-w-300 p-8 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter shadow-xl text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cwhite-1 mx-auto mb-4"></div>
                    <p className="text-lg">Загрузка настроек...</p>
                </div>
            </div>
        );
    }


    const renderActiveSection = () => {
        const sectionClass = `transition-all duration-200 transform ${getSectionAnimationClass()}`;

        switch (activeSection) {
            case 'profile':
                return (
                    <div className={sectionClass}>
                        <h2 className="text-lg lg:text-xl font-bold mb-4 lg:mb-6 flex items-center gap-3">
                            <svg className='w-4 h-4 lg:w-5 lg:h-5 text-cwhite-1' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Основная информация
                        </h2>

                        <div className="space-y-4 lg:space-y-6">
                            {/* Информация о пользователе */}
                            <div className="grid grid-cols-1 gap-3 lg:gap-4 lg:grid-cols-2">
                                <div className="p-3 lg:p-4 bg-cgray-1 rounded-lg transition-all duration-300 hover:scale-102">
                                    <label className="text-xs lg:text-sm text-cwhite-1/70 mb-1 lg:mb-2 block">Имя пользователя</label>
                                    <p className="text-base lg:text-lg font-semibold truncate">{user.username}</p>
                                </div>
                                <div className="p-3 lg:p-4 bg-cgray-1 rounded-lg transition-all duration-300 hover:scale-102">
                                    <label className="text-xs lg:text-sm text-cwhite-1/70 mb-1 lg:mb-2 block">Email</label>
                                    <p className="text-base lg:text-lg font-semibold truncate">{user.email}</p>
                                </div>
                                <div className="p-3 lg:p-4 bg-cgray-1 rounded-lg transition-all duration-300 hover:scale-102">
                                    <label className="text-xs lg:text-sm text-cwhite-1/70 mb-1 lg:mb-2 block">Роль</label>
                                    <p className="text-base lg:text-lg font-semibold capitalize">{user.role}</p>
                                </div>
                                <div className="p-3 lg:p-4 bg-cgray-1 rounded-lg transition-all duration-300 hover:scale-102">
                                    <label className="text-xs lg:text-sm text-cwhite-1/70 mb-1 lg:mb-2 block">Дата регистрации</label>
                                    <p className="text-base lg:text-lg font-semibold">{new Date(user.regDate).toLocaleDateString('ru-RU')}</p>
                                </div>
                            </div>

                            {/* Статус */}
                            <div className="p-3 lg:p-4 bg-cgray-1 rounded-lg transition-all duration-300">
                                <label className="text-xs lg:text-sm text-cwhite-1/70 mb-2 lg:mb-3 block">Статус</label>
                                {!statusChanging ? (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4">
                                        <p className="text-base lg:text-lg flex-1 break-words">{user.status || "Нет статуса"}</p>
                                        <button
                                            onClick={() => setStatusChanging(true)}
                                            className="px-3 lg:px-4 py-2 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:scale-95 hover:bg-pink-1 transition-all duration-300 text-sm lg:text-base whitespace-nowrap"
                                        >
                                            Изменить
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmitStatus} className="space-y-3">
                                        <textarea
                                            ref={textareaRef}
                                            defaultValue={user.status}
                                            onChange={handleStatusInputChange}
                                            className="w-full p-3 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter resize-none transition-all duration-300 focus:border-pink-1 focus:scale-102 text-sm lg:text-base"
                                            rows={3}
                                            maxLength={100}
                                            placeholder="Введите ваш статус..."
                                        />
                                        <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
                                            <button
                                                type="submit"
                                                className="px-3 lg:px-4 py-2 text-cwhite-1 bg-pink-1 border border-pink-1 rounded-lg hover:scale-95 transition-all duration-300 text-sm lg:text-base flex-1"
                                            >
                                                Сохранить
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStatusChanging(false)}
                                                className="px-3 lg:px-4 py-2 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg hover:scale-95 transition-all duration-300 text-sm lg:text-base flex-1"
                                            >
                                                Отмена
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 'appearance':
                return (
                    <div className={sectionClass}>
                        <h2 className="text-lg lg:text-xl font-bold mb-4 lg:mb-6 flex items-center gap-3">
                            <svg className='w-4 h-4 lg:w-5 lg:h-5 text-cwhite-1' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                            Внешний вид
                        </h2>

                        <div className="space-y-4 lg:space-y-6">
                            {/* Баннер */}
                            <div className="space-y-3 lg:space-y-4">
                                <h3 className="text-base lg:text-lg font-semibold">Баннер профиля</h3>
                                <div className="relative w-full h-40 lg:w-320 lg:h-80 rounded-lg bg-cgray-2 overflow-hidden">
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
                                    <div className="relative flex-shrink-0">
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
                );

            case 'security':
                return (
                    <div className={sectionClass}>
                        <h2 className="text-lg lg:text-xl font-bold mb-4 lg:mb-6 flex items-center gap-3">
                            <svg className='w-4 h-4 lg:w-5 lg:h-5 text-cwhite-1' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Безопасность
                        </h2>

                        <div className="space-y-4 lg:space-y-6">
                            {/* Смена пароля */}
                            <div className="space-y-3 lg:space-y-4">
                                <h3 className="text-base lg:text-lg font-semibold">Смена пароля</h3>
                                <form onSubmit={handlePasswordSubmit} className="space-y-3 lg:space-y-4">
                                    <div className="transform transition-all duration-300">
                                        <label className="block text-xs lg:text-sm text-cwhite-1/70 mb-1 lg:mb-2">Текущий пароль</label>
                                        <input
                                            type="password"
                                            name="currentPassword"
                                            value={passwordForm.currentPassword}
                                            onChange={handlePasswordChange}
                                            className="w-full p-3 text-cwhite-1 bg-cgray-1 border border-cgray-2 rounded-lg bg-filter transition-all duration-300 focus:border-pink-1 focus:scale-102 focus:outline-none text-sm lg:text-base"
                                            placeholder="Введите текущий пароль"
                                        />
                                    </div>
                                    <div className="transform transition-all duration-300">
                                        <label className="block text-xs lg:text-sm text-cwhite-1/70 mb-1 lg:mb-2">Новый пароль</label>
                                        <input
                                            type="password"
                                            name="newPassword"
                                            value={passwordForm.newPassword}
                                            onChange={handlePasswordChange}
                                            className="w-full p-3 text-cwhite-1 bg-cgray-1 border border-cgray-2 rounded-lg bg-filter transition-all duration-300 focus:border-pink-1 focus:scale-102 focus:outline-none text-sm lg:text-base"
                                            placeholder="Введите новый пароль"
                                        />
                                    </div>
                                    <div className="transform transition-all duration-300">
                                        <label className="block text-xs lg:text-sm text-cwhite-1/70 mb-1 lg:mb-2">Подтвердите пароль</label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={passwordForm.confirmPassword}
                                            onChange={handlePasswordChange}
                                            className="w-full p-3 text-cwhite-1 bg-cgray-1 border border-cgray-2 rounded-lg bg-filter transition-all duration-300 focus:border-pink-1 focus:scale-102 focus:outline-none text-sm lg:text-base"
                                            placeholder="Повторите новый пароль"
                                        />
                                    </div>

                                    {passwordError && (
                                        <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 transition-all duration-300 transform scale-100 animate-pulse text-sm">
                                            {passwordError}
                                        </div>
                                    )}

                                    {passwordSuccess && (
                                        <div className="p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-400 transition-all duration-300 transform scale-100 animate-pulse text-sm">
                                            {passwordSuccess}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="w-full lg:w-auto px-6 py-3 text-cwhite-1 bg-pink-1 border border-pink-1 rounded-lg hover:scale-95 transition-all duration-300 font-semibold transform hover:shadow-lg text-sm lg:text-base"
                                    >
                                        Сменить пароль
                                    </button>
                                </form>
                            </div>

                            {/* Статус верификации */}
                            <div className="p-3 lg:p-4 bg-cgray-1 rounded-lg transition-all duration-300 hover:scale-102 hover:shadow-lg">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 lg:gap-0">
                                    <div>
                                        <h4 className="font-semibold text-sm lg:text-base">Статус аккаунта</h4>
                                        <p className={`text-xs lg:text-sm text-cwhite-1/70 ${user.isBlocked && "text-red-1"}`}>
                                            {user.isBlocked ? (
                                                <>
                                                    Заблокирован!
                                                </>
                                            ) : (
                                                <>
                                                    {user.email_verified ? "Email подтвержден" : "Email не подтвержден"}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    {user.verify && (
                                        <div className="flex items-center gap-2 text-green-1">
                                            <Image
                                                width={20}
                                                height={20}
                                                src="/verify.png"
                                                alt="verify"
                                                className="w-4 h-4 lg:w-5 lg:h-5"
                                            />
                                            <span className="text-xs lg:text-sm font-semibold">Верифицирован</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="text-white mb-5">
            <div className="w-full lg:w-416 mx-auto mt-5 px-4 lg:px-0">
                {/* Заголовок страницы */}
                <div className="mb-4 lg:mb-6">
                    <h1 className="text-xl lg:text-2xl font-bold text-cwhite-1">Настройки профиля</h1>
                    <p className="text-cwhite-1/70 mt-1 lg:mt-2 text-sm lg:text-base">Управление вашим профилем и настройками аккаунта</p>
                </div>

                {/* Мобильное меню для навигации */}
                <div className="lg:hidden mb-4">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="w-full p-3 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter shadow-xl flex items-center justify-between"
                    >
                        <span className="text-sm">
                            {activeSection === 'profile' && <div className={`flex items-center gap-1`}>
                                <svg className='w-4 h-4 lg:w-5 lg:h-5' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                                Основная информация</div>}

                            {activeSection === 'appearance' && <div className={`flex items-center gap-1`}>
                                <svg className='w-4 h-4 lg:w-5 lg:h-5 text-cwhite-1' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                                Внешний вид
                            </div>}

                            {activeSection === 'security' && <div className={`flex items-center gap-1`}>
                                <svg className='w-4 h-4 lg:w-5 lg:h-5 text-cwhite-1' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Безопасность
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

                    {/* Выпадающее меню для мобильных */}
                    {isMobileMenuOpen && (
                        <div className="mt-2 p-3 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter shadow-xl">
                            <nav className="space-y-2">
                                <div
                                    onClick={() => changeSection('profile')}
                                    className={`w-full flex gap-1 items-center text-left px-3 py-2 rounded-lg transition-all duration-300 text-sm ${
                                        activeSection === 'profile'
                                            ? 'bg-cgray-1 text-pink-1'
                                            : 'hover:bg-cgray-1'
                                    }`}
                                >
                                    <svg className='w-4 h-4 lg:w-5 lg:h-5 text-cwhite-1' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Основная информация
                                </div>
                                <div
                                    onClick={() => changeSection('appearance')}
                                    className={`w-full flex gap-1 items-center text-left px-3 py-2 rounded-lg transition-all duration-300 text-sm ${
                                        activeSection === 'appearance'
                                            ? 'bg-cgray-1 text-pink-1'
                                            : 'hover:bg-cgray-1'
                                    }`}
                                >
                                    <svg className='w-4 h-4 lg:w-5 lg:h-5 text-cwhite-1' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                    </svg>
                                    Внешний вид
                                </div>
                                <div
                                    onClick={() => changeSection('security')}
                                    className={`w-full flex gap-1 items-center text-left px-3 py-2 rounded-lg transition-all duration-300 text-sm ${
                                        activeSection === 'security'
                                            ? 'bg-cgray-1 text-pink-1'
                                            : 'hover:bg-cgray-1'
                                    }`}
                                >
                                    <svg className='w-4 h-4 lg:w-5 lg:h-5 text-cwhite-1' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Безопасность
                                </div>
                                <SubscriptionManager userId={user.id} username={user.username} email={user.email}/>
                            </nav>
                        </div>
                    )}
                </div>

                {/* Основной контент */}
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                    {/* Боковая навигация для десктопа */}
                    <div className="hidden lg:block lg:w-80 flex-shrink-0">
                        <div className="p-4 lg:p-6 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter shadow-xl">
                            <nav className="space-y-2">
                                <div
                                    onClick={() => changeSection('profile')}
                                    className={getButtonClass('profile')}
                                >
                                    <svg className='w-4 h-4 lg:w-5 lg:h-5 text-cwhite-1' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Основная информация
                                </div>
                                <button
                                    onClick={() => changeSection('appearance')}
                                    className={getButtonClass('appearance')}
                                >
                                    <svg className='w-4 h-4 lg:w-5 lg:h-5 text-cwhite-1' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                    </svg>
                                    Внешний вид
                                </button>
                                <button
                                    onClick={() => changeSection('security')}
                                    className={getButtonClass('security')}
                                >
                                    <svg className='w-4 h-4 lg:w-5 lg:h-5 text-cwhite-1' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Безопасность
                                </button>
                                <SubscriptionManager userId={user.id} username={user.username} email={user.email}/>

                            </nav>
                        </div>
                    </div>

                    {/* Основные настройки */}
                    <div className="flex-1 min-h-96">
                        <div className="p-4 lg:p-6 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter shadow-xl h-full transition-all duration-500">
                            {renderActiveSection()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}