// src/app/auth/verify-email/[code]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VerifyEmailPage() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState<string>('');

    const params = useParams();
    const router = useRouter();
    const code = params.code as string;

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                const response = await fetch('/api/auth/verify-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ code }),
                });

                const data = await response.json();

                if (data.success) {
                    setStatus('success');
                    setMessage(data.message);

                    // Перенаправляем на страницу входа через 3 секунды
                    setTimeout(() => {
                        router.push('/auth/login');
                    }, 3000);
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Ошибка при подтверждении email');
                }
            } catch {
                setStatus('error');
                setMessage('Ошибка сети. Пожалуйста, попробуйте позже.');
            }
        };

        if (code) {
            verifyEmail();
        }
    }, [code, router]);

    return (
        <div className="h-96 p-4 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter">
            <div className="max-w-md w-full bg-cgray-2 rounded-lg p-8 border border-cgray-1 text-center">
                {status === 'loading' && (
                    <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-1 mx-auto mb-4"></div>
                        <h2 className="text-2xl font-bold text-cwhite-1 mb-4">Подтверждение email</h2>
                        <p className="text-gray-400">Проверяем ваш код подтверждения...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-green-1/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-green-1 mb-4">Email подтвержден!</h2>
                        <p className="text-cwhite-1 mb-6">{message}</p>
                        <p className="text-gray-400 text-sm">
                            Вы будете перенаправлены на страницу входа через 3 секунды...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-1/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-red-1 mb-4">Ошибка</h2>
                        <p className="text-cwhite-1 mb-6">{message}</p>
                        <div className="space-y-3">
                            <Link
                                href="/auth/login"
                                className="block w-full p-3 bg-cyan-1 text-white rounded-lg hover:bg-cyan-2 transition-colors"
                            >
                                Перейти к входу
                            </Link>
                            <Link
                                href="/"
                                className="block w-full p-3 bg-cgray-1 text-cwhite-1 rounded-lg hover:bg-cgray-3 transition-colors"
                            >
                                На главную
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}