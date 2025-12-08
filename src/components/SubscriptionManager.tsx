// components/SubscriptionManager.tsx
'use client';

import { useSubscriptions } from '@/hooks/useSubscriptions';

interface SubscriptionManagerProps {
    userId: number;
    username: string;
    email: string;
    className?: string;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
                                                                            userId,
                                                                            username,
                                                                            email,
                                                                            className = ''
                                                                        }) => {
    const {
        loading,
        error,
        subscribe,
        unsubscribe,
        isSubscribed,
    } = useSubscriptions(userId);

    const newsSubscribed = isSubscribed('news');
    const votesSubscribed = isSubscribed('votes');

    return (
        <details className={`group ${className}`}>
            <summary className="flex items-center gap-1 px-3 py-2 lg:px-4 lg:py-3 rounded-xl hover:bg-cgray-1 hover:scale-105 transition-all duration-200 cursor-pointer text-sm lg:text-base list-none">
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Подписки</span>
                <svg className="w-3 h-3 lg:w-4 lg:h-4 transform group-open:rotate-180 transition-transform duration-200 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </summary>

            <div className="mt-2 p-3 bg-cgray-1 border border-cgray-2 rounded-lg animate-fadeIn w-full">
                <div className="space-y-3">
                    <p className="text-xs lg:text-sm text-gray-300">
                        Управление новостной рассылкой
                    </p>

                    {error && (
                        <div className="p-2 text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                        {newsSubscribed ? (
                            <button
                                onClick={() => unsubscribe('news')}
                                disabled={loading || !newsSubscribed}
                                className="flex-1 px-3 py-2 text-cwhite-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed border border-red-700 rounded-lg transition-all duration-200 hover:scale-95 disabled:scale-100 text-xs lg:text-sm"
                            >
                                {loading ? 'Загрузка...' : 'Отписаться'}
                            </button>
                        ) : (
                            <button
                                onClick={() => subscribe('news', username, email)}
                                disabled={loading || newsSubscribed}
                                className="flex-1 px-3 py-2 text-cwhite-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed border border-green-700 rounded-lg transition-all duration-200 hover:scale-95 disabled:scale-100 text-xs lg:text-sm"
                            >
                                {loading ? 'Загрузка...' : 'Подписаться'}
                            </button>
                        )}



                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className={`w-2 h-2 rounded-full ${newsSubscribed ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span>
                          Статус: {newsSubscribed ? 'Подписан' : 'Не подписан'}
                        </span>
                    </div>

                    <p className="text-xs text-gray-400 text-left">
                        Будьте в курсе новых новостей
                    </p>
                </div>
            </div>

            <div className="mt-2 p-3 bg-cgray-1 border border-cgray-2 rounded-lg animate-fadeIn w-full">
                <div className="space-y-3">
                    <p className="text-xs lg:text-sm text-gray-300">
                        Управление рассылкой голосований
                    </p>

                    {error && (
                        <div className="p-2 text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                        {votesSubscribed ? (
                            <button
                                onClick={() => unsubscribe('votes')}
                                disabled={loading || !votesSubscribed}
                                className="flex-1 px-3 py-2 text-cwhite-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed border border-red-700 rounded-lg transition-all duration-200 hover:scale-95 disabled:scale-100 text-xs lg:text-sm"
                            >
                                {loading ? 'Загрузка...' : 'Отписаться'}
                            </button>
                        ) : (
                            <button
                                onClick={() => subscribe('votes', username, email)}
                                disabled={loading || votesSubscribed}
                                className="flex-1 px-3 py-2 text-cwhite-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed border border-green-700 rounded-lg transition-all duration-200 hover:scale-95 disabled:scale-100 text-xs lg:text-sm"
                            >
                                {loading ? 'Загрузка...' : 'Подписаться'}
                            </button>
                        )}



                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className={`w-2 h-2 rounded-full ${votesSubscribed ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span>
                          Статус: {votesSubscribed ? 'Подписан' : 'Не подписан'}
                        </span>
                    </div>

                    <p className="text-xs text-gray-400 text-left">
                        Будьте в курсе новых голосований
                    </p>
                </div>
            </div>

        </details>
    );
};