'use client'
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import UserPhoto from "@/components/UserPhoto";
import Link from "next/link";
import UserFrame from "@/components/UserFrame";
import UserDropdown from "@/components/UserDropdown";

export default function Header() {
    const [isLogin, setIsLogin] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { user, logout } = useAuth();

    useEffect(() => {
        if (user) {
            setIsLogin(true);
        }
    }, [user]);

    // Закрытие меню при клике на ссылку
    const handleLinkClick = () => {
        setIsMenuOpen(false);
    };

    // Закрытие меню при изменении размера окна (на случай поворота устройства)
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setIsMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const closeDropdown = () => {
        setIsDropdownOpen(false);
    };

    return (
        <>
            {/* Основной хедер */}
            <header className="flex w-full max-w-416 justify-between items-center h-24 p-4 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-50 relative">
                {/* Логотип */}
                <Image
                    src={"/fnbts.png"}
                    alt={"fnbts"}
                    width={75}
                    height={75}
                    onClick={() => router.push("/")}
                    className={`cursor-pointer hover:rotate-360 transition-all duration-300`}
                />

                {/* Навигация для десктопа */}
                <nav className="hidden md:flex text-xl gap-5">
                    <Link href="/" className={`transition-all hover:scale-105 hover:text-red-1`} id="main">Главная</Link>
                    <Link href="/?page=info" className={`transition-all hover:scale-105 hover:text-pink-1`} id="info">Основное</Link>
                    <Link href="/?page=rules" className={`transition-all hover:scale-105 hover:text-yellow-1`} id="rules">Правила</Link>
                    <Link href="/forum" className={`transition-all hover:scale-105 hover:text-purple-1`} id="forum">Форум</Link>
                    <Link href="/news" className={`transition-all hover:scale-105 hover:text-cyan-1`} id="news">Новости</Link>
                    {user && user?.email_verified && !user.isBlocked ? (
                        <Link href="/messenger" className={`transition-all hover:scale-105 hover:text-yellow-1`} id="news">Мессенджер</Link>
                    ) : null}
                </nav>

                {/* Правая часть - аккаунт или бургер-меню */}
                <div className="flex items-center gap-4">
                    {/* Иконка аккаунта для десктопа */}
                    <div className="hidden md:block">
                        {isLogin && user ? (
                            <div
                                onClick={toggleDropdown}
                                className={`relative size-25 flex items-center justify-center cursor-pointer`}
                            >
                                <UserPhoto userId={user.id} className={`size-19 rounded-full`}/>
                                <UserFrame userId={user.id} className={`absolute top-0 size-25`}/>
                            </div>
                        ) : (
                            <Image
                                src={"/account.svg"}
                                alt={"login"}
                                width={75}
                                height={75}
                                onClick={() => {router.push("/auth/login")}}
                                className={`cursor-pointer`}
                            />
                        )}
                        <UserDropdown isOpen={isDropdownOpen} onClose={closeDropdown} />
                    </div>

                    {/* Бургер-меню для мобильных */}
                    <button
                        className="md:hidden flex flex-col justify-center items-center w-8 h-8 relative"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Открыть меню"
                    >
                        <span className={`block w-6 h-0.5 bg-cwhite-1 transition-all duration-300 ${
                            isMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-1'
                        }`}></span>
                        <span className={`block w-6 h-0.5 bg-cwhite-1 transition-all duration-300 ${
                            isMenuOpen ? 'opacity-0' : 'opacity-100'
                        }`}></span>
                        <span className={`block w-6 h-0.5 bg-cwhite-1 transition-all duration-300 ${
                            isMenuOpen ? '-rotate-45 -translate-y-1' : 'translate-y-1'
                        }`}></span>
                    </button>
                </div>
            </header>

            {/* Мобильное меню */}
            <div className={`fixed top-0 left-0 w-full h-full z-210 transition-all duration-300 md:hidden ${
                isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}>
                <div className="flex flex-col items-center justify-center h-full space-y-4 pt-5">
                    {/* Иконка аккаунта в мобильном меню */}
                    <div className="mb-4">
                        {isLogin && user ? (
                            <div
                                className="flex flex-col items-center cursor-pointer relative p-4 justify-center bg-cgray-2 border border-cgray-2 bg-filter rounded-lg"
                            >
                                <UserPhoto userId={user.id} className={`size-24 rounded-full`}/>
                                <UserFrame userId={user.id} className={`absolute top-4 -mt-3.5 size-31`}/>
                                <div className="py-2">
                                    <button
                                        onClick={() => {
                                            router.push(`/user/${user.id}`)
                                            handleLinkClick();
                                        }}
                                        className="w-full px-4 py-3 text-left text-cwhite-1 hover:bg-cgray-1 transition-colors duration-200 flex items-center gap-3"
                                    >
                                        <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span>Профиль</span>
                                    </button>
                                    {!user.isBlocked && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    router.push(`/user/${user.id}/settings`)
                                                    handleLinkClick();
                                                }}
                                                className="w-full px-4 py-3 text-left text-cwhite-1 hover:bg-cgray-1 transition-colors duration-200 flex items-center gap-3"
                                            >
                                                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                </svg>
                                                <span>Настройки</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    router.push(`/user/${user.id}/personalization`)
                                                    handleLinkClick();
                                                }}
                                                className="w-full px-4 py-3 text-left text-cwhite-1 hover:bg-cgray-1 transition-colors duration-200 flex items-center gap-3"
                                            >
                                                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                                </svg>
                                                <span>Персонализация</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    router.push(`/user/${user.id}/shop`)
                                                    handleLinkClick();
                                                }}
                                                className="w-full px-4 py-3 text-left text-cwhite-1 hover:bg-cgray-1 transition-colors duration-200 flex items-center gap-3"
                                            >
                                                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                                </svg>
                                                <span>Магазин</span>
                                            </button>
                                        </>
                                    )}


                                    <div className="border-t border-cwhite-1"></div>

                                    <div className="py-2">
                                        <button
                                            onClick={async () => {
                                                await logout();
                                                router.push("/");
                                            }}
                                            className="w-full px-4 py-3 text-left text-red-1 hover:bg-cgray-1 transition-colors duration-200 flex items-center gap-3"
                                        >
                                            <span className="text-lg">🚪</span>
                                            <span>Выйти</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => {
                                    router.push("/auth/login");
                                    handleLinkClick();
                                }}
                                className="flex flex-col items-center cursor-pointer"
                            >
                                <Image
                                    src={"/account.svg"}
                                    alt={"login"}
                                    width={80}
                                    height={80}
                                    className={`mb-2`}
                                />
                                <span className="text-cwhite-1 text-lg">Войти</span>
                            </div>
                        )}
                    </div>

                    {/* Навигация для мобильных */}
                    <nav className="flex flex-col space-y-2 text-xl text-cwhite-1 bg-cgray-2 border border-cgray-2 bg-filter rounded-lg py-4 px-12">
                        <Link
                            href="/"
                            className={`transition-all hover:scale-105 hover:text-red-1 py-2`}
                            onClick={handleLinkClick}
                        >
                            Главная
                        </Link>
                        <Link
                            href="/?page=info"
                            className={`transition-all hover:scale-105 hover:text-pink-1 py-2`}
                            onClick={handleLinkClick}
                        >
                            Основное
                        </Link>
                        <Link
                            href="/?page=rules"
                            className={`transition-all hover:scale-105 hover:text-cwhite-1/70 py-2`}
                            onClick={handleLinkClick}
                        >
                            Правила
                        </Link>
                        <Link
                            href="/forum"
                            className={`transition-all hover:scale-105 hover:text-purple-1 py-2`}
                            onClick={handleLinkClick}
                        >
                            Форум
                        </Link>
                        <Link
                            href="/news"
                            className={`transition-all hover:scale-105 hover:text-cyan-1 py-2`}
                            onClick={handleLinkClick}
                        >
                            Новости
                        </Link>
                        {user && user.email_verified && !user.isBlocked ? (
                            <Link
                                  href="/messenger"
                                  className={`transition-all hover:scale-105 hover:text-cwhite-1/70`}
                                  onClick={handleLinkClick}
                            >
                                Мессенджер</Link>
                        ) : null}
                    </nav>

                    {/* Кнопка закрытия */}
                    <button
                        className="absolute top-8 right-6 text-cwhite-1 text-2xl p-2"
                        onClick={() => setIsMenuOpen(false)}
                        aria-label="Закрыть меню"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Overlay для затемнения фона */}
            <div
                className={`fixed inset-0 bg-cgray-2 rounded-lg border border-cgray-2 bg-filter z-200 transition-opacity duration-300 md:hidden ${
                    isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
                onClick={() => setIsMenuOpen(false)}
            />
        </>
    )
}