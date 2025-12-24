'use client';

import React from 'react';
import { ActivityDataPoint } from '@/utils/activityChart';
import { TrendingUp, TrendingDown, Minus, MessageSquare, FileText, CreditCard, MessageCircle } from 'lucide-react';

interface ActivitySummaryProps {
    data: ActivityDataPoint[];
}

export const ActivitySummary: React.FC<ActivitySummaryProps> = ({ data }) => {
    const summary = {
        totalPosts: data.reduce((sum, day) => sum + day.posts, 0),
        totalMessages: data.reduce((sum, day) => sum + day.messages, 0),
        totalTransactions: data.reduce((sum, day) => sum + day.transactions, 0),
        totalComments: data.reduce((sum, day) => sum + day.comments, 0),
        totalActivities: data.reduce((sum, day) => sum + day.total, 0),
    };

    const peakDay = data.length > 0 ? data.reduce((max, day) =>
        day.total > max.total ? day : max, data[0]
    ) : { total: 0, date: 'Нет данных' };

    const dailyAverage = data.length > 0 ? summary.totalActivities / data.length : 0;

    // Данные для прогресс-бара
    const progressBarData = [
        { value: summary.totalPosts, color: '#20C0C0', label: 'Посты' },
        { value: summary.totalMessages, color: '#DF66D2', label: 'Сообщения' },
        { value: summary.totalTransactions, color: '#DDD132', label: 'Транзакции' },
        { value: summary.totalComments, color: '#9B39D4', label: 'Комментарии' }
    ].filter(item => item.value > 0);

    const totalForProgress = progressBarData.reduce((sum, item) => sum + item.value, 0);

    return (
        <div>
            <h3 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6 text-white border-b border-cgray-2 pb-2 lg:pb-3">
                Сводка активности
            </h3>

            {/* Карточки статистики */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
                {/* Посты */}
                <div className="bg-cgray-2 border border-cgray-2 rounded-lg p-3 lg:p-4">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs lg:text-sm text-cyan-1 font-medium mb-1 truncate">Посты на форуме</p>
                            <p className="text-xl lg:text-2xl font-bold text-white mb-1 lg:mb-2">{summary.totalPosts}</p>
                            <div className="flex items-center">
                                <FileText className="w-3 h-3 lg:w-4 lg:h-4 text-cyan-1 mr-1 lg:mr-2 shrink-0" />
                                <span className="text-xs text-gray-400 truncate">Темы и обсуждения</span>
                            </div>
                        </div>
                        <div className="bg-cyan-1/20 p-2 lg:p-3 rounded-full ml-2 lg:ml-3 shrink-0">
                            <FileText className="w-4 h-4 lg:w-6 lg:h-6 text-cyan-1" />
                        </div>
                    </div>
                </div>

                {/* Сообщения */}
                <div className="bg-cgray-2 border border-cgray-2 rounded-lg p-3 lg:p-4">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs lg:text-sm text-pink-1 font-medium mb-1 truncate">Сообщения</p>
                            <p className="text-xl lg:text-2xl font-bold text-white mb-1 lg:mb-2">{summary.totalMessages}</p>
                            <div className="flex items-center">
                                <MessageSquare className="w-3 h-3 lg:w-4 lg:h-4 text-pink-1 mr-1 lg:mr-2 shrink-0" />
                                <span className="text-xs text-gray-400 truncate">В чатах и ЛС</span>
                            </div>
                        </div>
                        <div className="bg-pink-1/20 p-2 lg:p-3 rounded-full ml-2 lg:ml-3 shrink-0">
                            <MessageSquare className="w-4 h-4 lg:w-6 lg:h-6 text-pink-1" />
                        </div>
                    </div>
                </div>

                {/* Транзакции */}
                <div className="bg-cgray-2 border border-cgray-2 rounded-lg p-3 lg:p-4">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs lg:text-sm text-yellow-500 font-medium mb-1 truncate">Транзакции</p>
                            <p className="text-xl lg:text-2xl font-bold text-white mb-1 lg:mb-2">{summary.totalTransactions}</p>
                            <div className="flex items-center">
                                <CreditCard className="w-3 h-3 lg:w-4 lg:h-4 text-yellow-500 mr-1 lg:mr-2 flex-shrink-0" />
                                <span className="text-xs text-gray-400 truncate">Платежи и покупки</span>
                            </div>
                        </div>
                        <div className="bg-yellow-500/20 p-2 lg:p-3 rounded-full ml-2 lg:ml-3 flex-shrink-0">
                            <CreditCard className="w-4 h-4 lg:w-6 lg:h-6 text-yellow-500" />
                        </div>
                    </div>
                </div>

                {/* Комментарии */}
                <div className="bg-cgray-2 border border-cgray-2 rounded-lg p-3 lg:p-4">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs lg:text-sm text-purple-1 font-medium mb-1 truncate">Комментарии</p>
                            <p className="text-xl lg:text-2xl font-bold text-white mb-1 lg:mb-2">{summary.totalComments}</p>
                            <div className="flex items-center">
                                <MessageCircle className="w-3 h-3 lg:w-4 lg:h-4 text-purple-1 mr-1 lg:mr-2 flex-shrink-0" />
                                <span className="text-xs text-gray-400 truncate">Ответы и обсуждения</span>
                            </div>
                        </div>
                        <div className="bg-purple-1/20 p-2 lg:p-3 rounded-full ml-2 lg:ml-3 flex-shrink-0">
                            <MessageCircle className="w-4 h-4 lg:w-6 lg:h-6 text-purple-1" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Общая статистика */}
            <div className="bg-cgray-2 border border-cgray-2 rounded-lg p-4 lg:p-6">
                {/* Сетка общей статистики */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-4 lg:mb-6">
                    {/* Общая активность */}
                    <div className="space-y-1 lg:space-y-2">
                        <p className="text-xs lg:text-sm text-gray-400">Общая активность</p>
                        <p className="text-2xl lg:text-3xl font-bold text-white">{summary.totalActivities}</p>
                        <p className="text-xs lg:text-sm text-gray-400">
                            Среднедневная: <span className="text-cyan-1 font-medium">{dailyAverage.toFixed(1)}</span>
                        </p>
                    </div>

                    {/* Пиковый день */}
                    <div className="space-y-1 lg:space-y-2">
                        <p className="text-xs lg:text-sm text-gray-400">Пиковый день</p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <p className="text-xl lg:text-2xl font-bold text-white">{peakDay.total}</p>
                            <div className="bg-cyan-1/20 px-2 py-1 rounded text-xs text-cyan-1 font-medium max-w-fit">
                                {peakDay.date}
                            </div>
                        </div>
                        <p className="text-xs lg:text-sm text-gray-400">
                            Наибольшая активность за период
                        </p>
                    </div>

                    {/* Период анализа */}
                    <div className="space-y-1 lg:space-y-2">
                        <p className="text-xs lg:text-sm text-gray-400">Период анализа</p>
                        <p className="text-lg lg:text-xl font-medium text-white">{data.length} дней</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                            <span className="px-2 py-1 bg-green-1/20 text-green-1 rounded text-xs whitespace-nowrap">
                                {data.filter(day => day.total > 0).length} активных дней
                            </span>
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs whitespace-nowrap">
                                {data.length > 0 ? ((data.filter(day => day.total > 0).length / data.length) * 100).toFixed(1) : 0}% активности
                            </span>
                        </div>
                    </div>
                </div>

                {/* Прогресс-бар распределения активности */}
                {totalForProgress > 0 && (
                    <div className="mt-6 lg:mt-8">
                        <p className="text-xs lg:text-sm text-gray-400 mb-2 lg:mb-3">Распределение по типам активности</p>

                        {/* Прогресс-бар */}
                        <div className="h-2 lg:h-3 bg-cgray-2 rounded-full overflow-hidden mb-2">
                            <div className="flex h-full">
                                {progressBarData.map((item, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            width: `${(item.value / totalForProgress) * 100}%`,
                                            backgroundColor: item.color
                                        }}
                                        className="h-full transition-all duration-300"
                                        title={`${item.label}: ${item.value} (${((item.value / totalForProgress) * 100).toFixed(1)}%)`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Легенда для мобильных */}
                        <div className="sm:hidden mt-3">
                            <div className="space-y-2">
                                {progressBarData.map((item, index) => {
                                    const percentage = ((item.value / totalForProgress) * 100).toFixed(1);
                                    return (
                                        <div key={index} className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <div
                                                    className="w-3 h-3 rounded mr-2"
                                                    style={{ backgroundColor: item.color }}
                                                />
                                                <span className="text-xs text-gray-300">{item.label}</span>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {item.value} ({percentage}%)
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Легенда для планшетов и десктопов */}
                        <div className="hidden md:block">
                            <div className="flex flex-col lg:flex-row justify-between text-xs lg:text-sm text-gray-400 mt-2 lg:mt-3">
                                {progressBarData.map((item, index) => {
                                    const percentage = ((item.value / totalForProgress) * 100).toFixed(1);
                                    return (
                                        <div key={index} className="flex items-center mb-1 lg:mb-0">
                                            <div
                                                className="size-2 lg:size-3 rounded mr-1 lg:mr-2"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span>{item.label}: {item.value} ({percentage}%)</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};