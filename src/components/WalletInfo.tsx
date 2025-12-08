// src/components/UserWallet.tsx
'use client';

import { useState, useEffect } from 'react';
import DiscordConnect from "@/components/DiscordConnect";

interface UserWalletProps {
    currentUserId: number | undefined;
    userId: number;
    username: string;
    onNotFound: () => void;
}

interface UserWalletState {
    id: number;
    discordID: number;
    username: string;
    hleb: number;
    sfl: number;
    rating: number;
    vaultHleb: number;
    vaultSfl: number;
    creditHleb: number;
    creditSfl: number;
    code: string;
}

export default function UserWallet({
                                       currentUserId,
                                       userId,
                                       username,
                                       onNotFound,
                                   }: UserWalletProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [data, setData] = useState<UserWalletState | null>(null)

    useEffect(() => {
        const fetchWallet = async () => {
            try {
                setLoading(true);
                setError(false);

                const url = `/api/users/wallet`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: username,
                    })
                });

                if (!response.ok) {
                    setError(true);
                }
                if (response.status == 404) {
                    setError(false);
                    onNotFound()
                    return;
                }
                const json = await response.json();
                setData(json);
            } catch (err) {
                setError(true);
                console.error('Error loading user wallet:', err);
            } finally {
                setLoading(false);
            }
        };

        if (userId && username) {
            fetchWallet();
        }

    }, [userId, username]);

    if (loading) {
        return (
            <div className="p-4 bg-cgray-2 border border-cgray-2 rounded-lg animate-pulse w-full max-w-sm">
                <div className="h-6 bg-cgray-1 rounded mb-3"></div>
                <div className="space-y-2">
                    <div className="h-4 bg-cgray-1 rounded"></div>
                    <div className="h-4 bg-cgray-1 rounded"></div>
                </div>
            </div>
        );
    }

    if (!data && currentUserId === userId) {
        return (
            <DiscordConnect/>
        )
    }
    if (!data) {
        return (
            <div className="p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter h-max w-full max-w-sm">
                Пользователь ещё не подключил кошелёк
            </div>
        )
    }
    if (error) {
        return (
                <div className="p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter h-max w-full max-w-sm">
                    Ошибка загрузки
                </div>
            )

    }

    return (
        <div className="p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg animate-none bg-filter h-max w-full max-w-sm">
            {/* Единая таблица для всех устройств */}
            <div className="flex flex-col">
                {/* Заголовки */}
                <div className="flex justify-between text-sm mb-1">
                    <div className="w-20 text-center font-medium">Валюта</div>
                    <div className="w-16 text-center font-medium">Баланс</div>
                    <div className="w-16 text-center font-medium">Вклады</div>
                    <div className="w-16 text-center font-medium">Кредиты</div>
                </div>

                {/* Разделитель */}
                <div className="border-b border-cgray-1 mb-2"></div>

                {/* Хлеб */}
                <div className="flex justify-between items-center py-2 text-sm">
                    <div className="w-20 text-center">Хлеб</div>
                    <div className="w-16 text-center">{data.hleb}</div>
                    <div className="w-16 text-center">{data.vaultHleb}</div>
                    <div className="w-16 text-center">{data.creditHleb}</div>
                </div>

                {/* Санфловеры */}
                <div className="flex justify-between items-center py-2 text-sm border-t border-cgray-1">
                    <div className="w-20 text-center">SFL</div>
                    <div className="w-16 text-center">{data.sfl}</div>
                    <div className="w-16 text-center">{data.vaultSfl}</div>
                    <div className="w-16 text-center">{data.creditSfl}</div>
                </div>
            </div>

        </div>
    );
}