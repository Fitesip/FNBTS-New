'use client'

import {useAuth} from "@/context/AuthContext";
import Link from "next/link";
import {FormEvent, useState} from "react";
import {useRouter} from "next/navigation";
import {codes, frames} from "@/constants";
import {Codes} from "@/types/shop";


export default function CodePage() {
    const { user } = useAuth()
    const [code, setCode] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const router = useRouter();
    const [success, setSuccess] = useState<boolean>(false);
    const [codeData, setCodeData] = useState<Codes | null>(null);

    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        if (!code) {
            setMessage('Пожалуйста, заполните все поля');
            setLoading(false);
            return;
        }
        if (!user) return
        const response = await fetch(`/api/users/${user.id}/code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ code: code }),
        });
        const result = await response.json();

        if (result.success) {
            const codeData = codes.find(f => f.code === code);
            if (!codeData) {
                return
            }
            setCodeData(codeData);
            setMessage('Успешная активация!');
            setSuccess(true);
        } else {
            setMessage(result.message || 'Ошибка активации');
            console.log(result);
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="p-4 lg:p-6 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter mx-4 lg:mx-0">
                <div className="text-center py-6 lg:py-8">
                    <p className="mb-4 text-sm lg:text-base">Для использования кода необходимо авторизоваться</p>
                    <button
                        onClick={() => { window.location.href = '/auth/login?redirect=/code'; }}
                        className="p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:bg-cgray-1 hover:scale-95 transition-all text-sm lg:text-base"
                    >
                        Войти
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container mt-40 text-cwhite-1 flex z-10 w-full justify-center">
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8 -mt-30">
                        <h2 className="text-3xl font-bold mb-2">Активация кода</h2>
                    </div>

                    <div className="lg:bg-transparent rounded-2xl lg:rounded-none p-0 relative">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="form-group">
                                <label className="block text-sm font-semibold mb-2">
                                    Код
                                </label>
                                <input
                                    type="text"
                                    onChange={(e) => setCode(e.target.value)}
                                    required
                                    disabled={loading}
                                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                                    className="w-full p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter"
                                />
                            </div>
                            {!success && !codeData && (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:scale-95 hover:bg-cgray-1 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Активация...' : 'Активировать'}
                                </button>
                            )}

                        </form>

                        {message && (
                            <div className={`text-center w-full mt-5 p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 text-sm lg:text-xl rounded-lg bg-filter ${
                                message.includes('Успешная') ? 'text-green-1' : 'text-red-1'
                            }`}>
                                {message}
                            </div>
                        )}

                        {success && codeData && (
                            <div
                                className={`relative bg-cgray-1 rounded-lg p-4 lg:p-6 border mt-5 transition-all`}
                            >



                                <div className="flex flex-col h-full">
                                    <div className="text-center mb-4">
                                        <h3 className="text-lg lg:text-xl font-bold text-cwhite-1 mb-2">
                                            Код
                                        </h3>
                                        <p className="text-gray-400 text-sm">
                                            {code}
                                        </p>
                                    </div>

                                    <div className="grow mb-4">
                                        <div className="space-y-2">
                                            {codeData.hleb > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 text-sm">Хлеб:</span>
                                                    <span className="text-yellow-800 font-bold">{codeData.hleb.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {codeData.sfl > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 text-sm">СФЛ:</span>
                                                    <span className="text-yellow-500 font-bold">{codeData.sfl.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {codeData.points > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 text-sm">Поинты:</span>
                                                    <span className="text-green-1 font-bold">{codeData.points.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                                <button
                                    type="button"
                                    onClick={() => router.push(`/user/${user.id}`)}
                                    className="w-full p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:scale-95 hover:bg-cgray-1 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    К профилю
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}