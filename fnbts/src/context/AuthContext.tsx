// src/app/context/AuthContext.tsx
'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { AuthContextType } from '@/types/auth';
import { User } from '@/types/database';
import { tokenManager } from '@/lib/tokenUtils';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Единственная функция для проверки аутентификации
    const checkAuth = async (): Promise<boolean> => {

        if (typeof window === 'undefined') {
            return false;
        }

        try {
            const token = localStorage.getItem('accessToken');

            if (!token) {
                setUser(null);
                setLoading(false);
                return false;
            }

            // Проверяем валидность токена
            if (!tokenManager.isAccessTokenValid()) {
                localStorage.removeItem('accessToken');
                setUser(null);
                setLoading(false);
                return false;
            }

            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.data && data.data.user) {
                setUser(data.data.user);
                setLoading(false);
                return true;
            } else {
                // Очищаем невалидные токены
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                setUser(null);
                setLoading(false);
                return false;
            }

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('💥 checkAuth: Error occurred:', errorMessage);
            // Очищаем токены при ошибке
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
            setLoading(false);
            return false;
        }
    };

    // Инициализация при монтировании
    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.success && data.data) {
                const { accessToken, refreshToken, user: userData } = data.data;

                // Сохраняем токены
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);

                // Устанавливаем пользователя
                setUser(userData);

                return { success: true, message: 'Успешный вход!' };
            } else {
                return {
                    success: false,
                    message: data.error || 'Неверные учетные данные'
                };
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('💥 Login error:', errorMessage);
            return {
                success: false,
                message: 'Ошибка сети'
            };
        } finally {
            setLoading(false);
        }
    };

    const register = async (username: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
        setLoading(true);
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();

            if (data.success) {
                return { success: true, message: data.message };
            } else {
                return { success: false, message: data.error };
            }
        } catch {
            return { success: false, message: 'Ошибка сети' };
        } finally {
            setLoading(false);
        }
    };

    const logout = async (): Promise<void> => {

        try {
            const refreshToken = localStorage.getItem('refreshToken');

            if (refreshToken) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    },
                    body: JSON.stringify({ refreshToken }),
                }).catch();
            }
        } catch (error) {
            console.error('❌ Logout error:', error);
        } finally {
            // Всегда очищаем клиентскую сторону
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
        }
    };

    const value: AuthContextType = {
        user,
        login,
        register,
        logout,
        loading,
        checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};