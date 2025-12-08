'use client'
import {useAuth} from "@/context/AuthContext";
import {useEffect, useState} from "react";
import {useSearchParams, useRouter} from "next/navigation";
import Link from "next/link";
import { points } from "@/constants";
import type { Points } from "@/types/shop";

export default function SuccessPage() {
    const [loading, setLoading] = useState<boolean>(true);
    const [success, setSuccess] = useState<boolean>(false);
    const [pointsPack, setPointsPack] = useState<Points | null>(null);
    const [isCanceled, setIsCanceled] = useState<boolean>(false);
    const { user } = useAuth()
    const [token, setToken] = useState<string | null>(null);
    const [orderId, setOrderId] = useState<string | null>(null);
    const router = useRouter()
    const params = useSearchParams()

    useEffect(() => {
        const orderId = localStorage.getItem('orderId');
        setOrderId(orderId);
        const isCanceled = params.get('type');
        if (isCanceled == 'canceled') {
            setIsCanceled(true);
        }
    }, [params]);

    useEffect(() => {
        if (!isCanceled) return;
        const cancelOrder = async () => {
            try {
                const response = await fetch(`/api/payment/${orderId}/`, {
                    method: "DELETE",
                })
                const body = await response.json()
                console.log(body)


            } catch (err) {
                console.error(err);
            }
        }
        cancelOrder()
    }, [isCanceled]);

    useEffect(() => {
        if (!user || !orderId) return
        const getOrderInfo = async () => {
            try {
                const response = await fetch(`/api/payment/${orderId}/`)
                const body = await response.json()
                if (body.success) {
                    const data = body.data
                    if (data.status == 'canceled') {
                        const metadata = data.metadata

                        const pointsPack = points.find(point => point.id === parseInt(metadata.packId as string));
                        if (!pointsPack) return;
                        setPointsPack(pointsPack);
                        setToken(metadata.token);
                        localStorage.removeItem('orderId');
                    }

                }
            } catch (err) {
                console.error(err);
            }
        }
        getOrderInfo()
    }, [user, orderId]);

    useEffect(() => {
        if (!user || !token || !pointsPack) return;
        const revokePaymentToken = async () => {
            try {
                const response = await fetch(`/api/users/${user.id}/payment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    },
                    body: JSON.stringify({
                        token: token,
                    })
                })
                const data = await response.json();

                if (data.success) {
                    setSuccess(true)
                    setLoading(false);
                }
            }
            catch (err) {
                console.error(err)
                setLoading(false);
            } finally {
                setLoading(false);
            }
        }
        revokePaymentToken()
    }, [user, token, pointsPack]);

    if (!user) {
        return (
            <div className="max-w-4xl p-4 lg:p-6 mt-5 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 mb-5 mx-4 lg:mx-auto text-cwhite-1">
                <div className="text-center py-8">
                    <div className="mb-4">
                        <svg className="w-16 h-16 text-red-1 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold mb-4">Требуется авторизация</h2>
                    <p className="text-gray-400 mb-6">Для просмотра этой страницы необходимо войти в систему</p>
                    <button
                        onClick={() => router.push('/auth/login')}
                        className="px-6 py-3 bg-red-1 text-cwhite-1 rounded-lg hover:bg-red-1/80 transition-colors font-medium"
                    >
                        Войти в аккаунт
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl p-4 lg:p-6 mt-5 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 mb-5 mx-4 lg:mx-auto text-cwhite-1">
            {/* Заголовок и навигация */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <Link
                        href={`/user/${user?.id}/shop`}
                        className="back-link inline-flex items-center gap-2 hover:text-red-1/70 font-medium transition-colors duration-200 group text-sm lg:text-base mb-2"
                    >
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Назад в магазин
                    </Link>
                    <h1 className="text-xl lg:text-3xl font-bold mb-2">Ошибка оплаты</h1>
                    {isCanceled ? (
                        <p className="text-gray-400 text-sm lg:text-base">Вы отменили платёж</p>
                        ) : (
                        <p className="text-gray-400 text-sm lg:text-base">Произошла ошибка при обработке платежа</p>
                        )}
                </div>

                {user && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-cgray-1 px-4 py-2 rounded-lg">
                            <span className="text-gray-400 text-sm">Ваши баллы:</span>
                            <span className="text-red-1 font-bold text-lg">{user.points || 0}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Основной контент */}
            <div className="bg-cgray-1 rounded-lg p-6 lg:p-8 border border-red-500/30">
                <div className="text-center py-4">
                    {/* Анимация ошибки */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <div className="absolute inset-0 animate-ping bg-red-500/30 rounded-full"></div>
                        </div>
                    </div>

                    <h2 className="text-2xl lg:text-3xl font-bold text-red-500 mb-4">Оплата не завершена</h2>

                    {/* Сообщение об ошибке */}
                    <div className="max-w-2xl mx-auto mb-8">
                        <div className="bg-gradient-to-br from-cgray-2 to-red-500/10 rounded-lg p-6 border-2 border-red-500/30">
                            <div className="flex items-center gap-3 mb-4">
                                <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <h3 className="text-lg font-semibold text-cwhite-1">Платеж не был завершен</h3>
                            </div>
                            {isCanceled ? (
                                <p className="text-gray-400 text-sm lg:text-base">Вы отменили платёж. Можете попробовать ещё раз, либо вернуться в магазин.</p>
                            ) : (
                                <p className="text-gray-400 text-sm mb-4">
                                    К сожалению, произошла ошибка при обработке вашего платежа. Попробуйте ещё раз.
                                </p>
                            )}

                        </div>
                    </div>

                    {/*/!* Возможные причины *!/*/}
                    {/*<div className="bg-cgray-2 rounded-lg p-6 mb-8 border border-gray-600">*/}
                    {/*    <h3 className="text-lg font-semibold mb-4 text-cwhite-1">Возможные причины:</h3>*/}
                    {/*    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">*/}
                    {/*        <div className="flex items-start gap-3">*/}
                    {/*            <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">*/}
                    {/*                <span className="text-red-500 text-xs font-bold">!</span>*/}
                    {/*            </div>*/}
                    {/*            <div>*/}
                    {/*                <p className="text-cwhite-1 font-medium mb-1">Недостаточно средств</p>*/}
                    {/*                <p className="text-gray-400 text-xs">Проверьте баланс вашей карты</p>*/}
                    {/*            </div>*/}
                    {/*        </div>*/}
                    {/*        <div className="flex items-start gap-3">*/}
                    {/*            <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">*/}
                    {/*                <span className="text-red-500 text-xs font-bold">!</span>*/}
                    {/*            </div>*/}
                    {/*            <div>*/}
                    {/*                <p className="text-cwhite-1 font-medium mb-1">Превышен лимит</p>*/}
                    {/*                <p className="text-gray-400 text-xs">Проверьте лимиты по вашей карте</p>*/}
                    {/*            </div>*/}
                    {/*        </div>*/}
                    {/*        <div className="flex items-start gap-3">*/}
                    {/*            <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">*/}
                    {/*                <span className="text-red-500 text-xs font-bold">!</span>*/}
                    {/*            </div>*/}
                    {/*            <div>*/}
                    {/*                <p className="text-cwhite-1 font-medium mb-1">Техническая ошибка</p>*/}
                    {/*                <p className="text-gray-400 text-xs">Попробуйте повторить попытку</p>*/}
                    {/*            </div>*/}
                    {/*        </div>*/}
                    {/*        <div className="flex items-start gap-3">*/}
                    {/*            <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">*/}
                    {/*                <span className="text-red-500 text-xs font-bold">!</span>*/}
                    {/*            </div>*/}
                    {/*            <div>*/}
                    {/*                <p className="text-cwhite-1 font-medium mb-1">Время сессии истекло</p>*/}
                    {/*                <p className="text-gray-400 text-xs">Начните процесс оплаты заново</p>*/}
                    {/*            </div>*/}
                    {/*        </div>*/}
                    {/*    </div>*/}
                    {/*</div>*/}

                    {/* Кнопки действий */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                        <button
                            onClick={() => router.push(`/user/${user?.id}/shop/payment/prepare?pointsPackId=${pointsPack?.id}`)}
                            className="px-6 py-3 bg-red-1 text-cwhite-1 rounded-lg hover:bg-red-1/80 transition-colors font-medium text-center flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Попробовать снова
                        </button>
                        <Link
                            href={`/user/${user?.id}`}
                            className="px-6 py-3 bg-cgray-2 text-cwhite-1 border border-gray-600 rounded-lg hover:bg-cgray-1 transition-colors font-medium text-center flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            В профиль
                        </Link>
                    </div>

                    {/* Информация для поддержки */}
                    <div className="mt-8 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div className="text-left">
                                <p className="text-yellow-400 text-sm font-medium mb-1">Нужна помощь?</p>
                                <p className="text-gray-400 text-xs">
                                    Если ошибка повторяется, пожалуйста, обратитесь в техническую поддержку.
                                    Укажите время операции и использованный способ оплаты.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Контакты поддержки */}
            <div className="mt-6 text-center">
                <p className="text-gray-400 text-xs">
                    По вопросам оплаты обращайтесь в поддержку:{" "}
                    <a href="mailto:locasad124@gmail.com" className="text-red-1 hover:text-red-1/80 transition-colors">
                        lokasad124@gmail.com
                    </a>
                </p>
            </div>
        </div>
    );
}