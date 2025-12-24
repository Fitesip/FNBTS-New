// components/UserDropdown.tsx
'use client'
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useRef } from "react";

interface UserDropdownProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function UserDropdown({ isOpen, onClose }: UserDropdownProps) {
    const router = useRouter();
    const { user, logout } = useAuth();
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Закрытие дропдауна при клике вне его области
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Если клик был вне дропдауна и вне аватарки - закрываем
            const avatarElement = document.querySelector('[data-avatar]');
            if (dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                avatarElement &&
                !avatarElement.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Закрытие дропдауна при нажатии Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    const handleNavigation = (path: string) => {
        router.push(path);
        onClose();
    };

    const handleLogout = async () => {
        await logout();
        onClose();
        router.push("/");
    };

    if (!isOpen || !user) return null;

    return (
        <div
            ref={dropdownRef}
            className={"absolute z-150 top-full right-0 mt-2 w-64 overflow-hidden bg-cgray-1 rounded-lg"}
        >
            <div className="bg-cgray-2 border border-cgray-2 bg-filter rounded-lg shadow-lg z-100">
                <div className="p-4 border-b border-cgray-1">
                    <p className="text-cwhite-1 font-semibold truncate">{user.username || user.email}</p>
                    <p className="text-cwhite-1/70 text-sm truncate">{user.email}</p>
                </div>

                {/* Опции меню */}
                <div className="py-2">
                    <button
                        onClick={() => handleNavigation(`/user/${user.id}`)}
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
                                onClick={() => handleNavigation(`/user/${user.id}/settings`)}
                                className="w-full px-4 py-3 text-left text-cwhite-1 hover:bg-cgray-1 transition-colors duration-200 flex items-center gap-3"
                            >
                                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                <span>Настройки</span>
                            </button>

                            <button
                                onClick={() => handleNavigation(`/user/${user.id}/personalization`)}
                                className="w-full px-4 py-3 text-left text-cwhite-1 hover:bg-cgray-1 transition-colors duration-200 flex items-center gap-3"
                            >
                                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                                <span>Персонализация</span>
                            </button>

                            <button
                                onClick={() => handleNavigation(`/user/${user.id}/shop`)}
                                className="w-full px-4 py-3 text-left text-cwhite-1 hover:bg-cgray-1 transition-colors duration-200 flex items-center gap-3"
                            >
                                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                <span>Магазин</span>
                            </button>
                        </>
                    )}


                </div>

                {/* Разделитель */}
                <div className="border-t border-cgray-1"></div>

                {/* Выход */}
                <div className="py-2">
                    <button
                        onClick={handleLogout}
                        className="w-full px-4 py-3 text-left text-red-1 hover:bg-cgray-1 transition-colors duration-200 flex items-center gap-3"
                    >
                        <svg
                            className='w-4 h-4 lg:w-5 lg:h-5'
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                        </svg>
                        <span>Выйти</span>
                    </button>
                </div>
            </div>

        </div>
    );
}