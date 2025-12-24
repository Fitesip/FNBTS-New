'use client'
import {useParams, useRouter, useSearchParams} from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { points } from "@/constants";
import type { Points } from "@/types/shop";
import Image from "next/image";

export default function PreparePaymentPage() {
    const [pointsPack, setPointsPack] = useState<Points | null>(null);
    const [paymentToken, setPaymentToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { user } = useAuth();
    const params = useSearchParams()
    const packId = params.get("pointsPackId");

    const router = useRouter();

    useEffect(() => {
        const pointsPack = points.find(point => point.id === parseInt(packId as string));
        if (!pointsPack) return;
        setPointsPack(pointsPack);
    }, [packId]);

    const generatePaymentToken = async () => {
        if (!user || !pointsPack) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/users/${user.id}/payment`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('accessToken')}`,
                }
            });

            const data = await response.json();

            if (data.success) {
                const paymentToken = data.data.token;
                const tokenId = data.data.tokenId.id;
                setPaymentToken(paymentToken);

                const redirectUrlResponse = await fetch('/api/payment', {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tokenId: tokenId,
                        paymentToken: paymentToken,
                        packId: pointsPack.id,
                        userId: user.id,
                        cost: pointsPack.cost,
                        amount: pointsPack.pointsAmount,
                        email: user.email,
                    })
                })
                const redirectUrlResponseData = await redirectUrlResponse.json();
                console.log(redirectUrlResponseData);
                localStorage.setItem('orderId', redirectUrlResponseData.orderId);
                const redirectUrl = redirectUrlResponseData.link;
                localStorage.setItem('redirectUrl', redirectUrl);
                router.push(redirectUrl);

            } else {
                setError('Не удалось создать платеж. Попробуйте еще раз.');
            }
        } catch (err) {
            console.error(err);
            setError('Произошла ошибка при создании платежа.');
        } finally {
            setIsLoading(false);
        }
    }

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
                    <p className="text-gray-400 mb-6">Для совершения покупки необходимо войти в систему</p>
                </div>
            </div>
        );
    }

    if (!pointsPack) {
        return (
            <div className="max-w-4xl p-4 lg:p-6 mt-5 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter z-10 mb-5 mx-4 lg:mx-auto text-cwhite-1">
                <div className="text-center py-8">
                    <div className="mb-4">
                        <svg className="w-16 h-16 text-red-1 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold mb-4">Набор не найден</h2>
                    <p className="text-gray-400 mb-6">Выбранный набор баллов не существует или был удален</p>
                    <Link
                        href={`/user/${user.id}/shop`}
                        className="px-6 py-3 bg-red-1 text-cwhite-1 rounded-lg hover:bg-red-1/80 transition-colors font-medium"
                    >
                        Вернуться в магазин
                    </Link>
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
                        href={`/user/${user.id}/shop`}
                        className="back-link inline-flex items-center gap-2 hover:text-red-1/70 font-medium transition-colors duration-200 group text-sm lg:text-base mb-2"
                    >
                        <svg className="w-4 h-4 lg:w-5 lg:h-5 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Назад в магазин
                    </Link>
                    <h1 className="text-xl lg:text-3xl font-bold mb-2">Оплата баллов</h1>
                    <p className="text-gray-400 text-sm lg:text-base">Завершите покупку для пополнения баланса</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-cgray-1 px-4 py-2 rounded-lg">
                        <span className="text-gray-400 text-sm">Ваши баллы:</span>
                        <span className="text-red-1 font-bold text-lg">{user.points || 0}</span>
                    </div>
                </div>
            </div>

            {/* Основной контент */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Информация о заказе */}
                <div className="bg-cgray-1 rounded-lg p-6 border border-gray-600">
                    <h2 className="text-lg lg:text-xl font-semibold mb-4 text-cwhite-1">Детали заказа</h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-br from-cgray-2 to-red-500/10 rounded-lg border-2 border-red-500/30">
                            <div>
                                <h3 className="font-semibold text-cwhite-1">{pointsPack.name}</h3>
                                <p className="text-gray-400 text-sm">{pointsPack.description}</p>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1 bg-red-1/50 border border-red-1 px-3 py-1 rounded-full">
                                    <span className="text-cwhite-1 text-sm font-bold">+{pointsPack.pointsAmount}</span>
                                    <span className="text-cwhite-1 text-xs">баллов</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-600">
                                <span className="text-gray-400">Количество баллов:</span>
                                <span className="text-cwhite-1 font-semibold">{pointsPack.pointsAmount}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-600">
                                <span className="text-gray-400">Стоимость:</span>
                                <span className="text-cwhite-1 text-xl font-bold">{pointsPack.cost} ₽</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-400">Статус:</span>
                                <span className="text-yellow-400 font-semibold">Ожидает оплаты</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Форма оплаты */}
                <div className="bg-cgray-1 rounded-lg p-6 border border-gray-600">
                    <h2 className="text-lg lg:text-xl font-semibold mb-4 text-cwhite-1">Способ оплаты</h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-500 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Скрытая форма ЮKassa */}
                        <link rel="stylesheet" href="https://yookassa.ru/integration/simplepay/css/yookassa_construct_form.css?v=1.29.0"/>
                        <form
                            className="yoomoney-payment-form"
                            action="https://yookassa.ru/integration/simplepay/payment"
                            method="post"
                            acceptCharset="utf-8"
                        >
                            <div className="ym-customer-info">
                                <input
                                    name="cps_email"
                                    className="ym-input ym-display-none"
                                    placeholder="Email"
                                    type="text"
                                    readOnly
                                    value={user.email}
                                />
                            </div>

                            <div className="ym-hidden-inputs">
                                <input
                                    name="shopSuccessURL"
                                    type="hidden"
                                    readOnly
                                    value={`http://localhost:3000/user/${user.id}/shop/payment/success?token=${paymentToken}&packId=${pointsPack.id}`}
                                />
                                <input
                                    name="shopFailURL"
                                    type="hidden"
                                    readOnly
                                    value={`http://localhost:3000/user/${user.id}/shop/payment/error?token=${paymentToken}&packId=${pointsPack.id}`}
                                />
                            </div>

                            <div className="ym-payment-btn-block">
                                <div className="ym-input-icon-rub ym-display-none">
                                    <input
                                        name="sum"
                                        placeholder="0.00"
                                        className="ym-input ym-sum-input ym-required-input"
                                        type="number"
                                        step="any"
                                        readOnly
                                        value={pointsPack.cost}
                                    />
                                </div>
                            </div>
                            <input name="shopId" type="hidden" value="1213127"/>
                        </form>

                        {/* Кастомная кнопка оплаты */}
                        <button
                            onClick={generatePaymentToken}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r bg-red-1/50 border hover:bg-red-1/30 border-red-1 text-cwhite-1 p-4 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span>Подготовка платежа...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                    <span>Перейти к оплате</span>
                                    <span className="ml-auto">{pointsPack.cost} ₽</span>
                                </>
                            )}
                        </button>

                        {/* Логотип ЮKassa */}
                        <div className="flex justify-center pt-4 border-t border-gray-600">
                            <Image
                                src="https://yookassa.ru/integration/simplepay/img/iokassa-gray.svg?v=1.29.0"
                                className="ym-logo opacity-70"
                                width={114}
                                height={27}
                                alt="ЮKassa"
                            />
                        </div>

                    </div>
                </div>
            </div>

            <script src="https://yookassa.ru/integration/simplepay/js/yookassa_construct_form.js?v=1.29.0" async></script>
        </div>
    );
}