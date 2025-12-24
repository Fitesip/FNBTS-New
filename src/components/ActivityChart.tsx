'use client';

import React, { useState, useEffect } from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { ActivityDataPoint } from '@/utils/activityChart';
import { ActivitySummary } from './ActivitySummary';

interface ActivityChartProps {
    userId: string;
    username: string;
    initialData?: ActivityDataPoint[];
    showDetails?: boolean;
}

// Единые цвета для всех типов диаграмм
const COLORS = {
    posts: '#20C0C0',
    messages: '#DF66D2',
    transactions: '#DDD132',
    comments: '#9B39D4',
    total: '#C92929'
};

export const ActivityChart: React.FC<ActivityChartProps> = ({
                                                                userId,
                                                                username,
                                                                initialData,
                                                                showDetails = true
                                                            }) => {
    const [data, setData] = useState<ActivityDataPoint[]>(initialData || []);
    const [viewType, setViewType] = useState<'line' | 'bar' | 'pie'>('line');
    const [loading, setLoading] = useState(!initialData);
    const [timeRange, setTimeRange] = useState(30);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [windowWidth, setWindowWidth] = useState(0);

    useEffect(() => {
        if (!initialData) {
            fetchActivityData();
        }
    }, [timeRange]);

    // Определяем размер экрана
    useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            setWindowWidth(width);
            setIsMobile(width < 640);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => {
            window.removeEventListener('resize', checkScreenSize);
        };
    }, []);

    const fetchActivityData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/activity?userId=${userId}&days=${timeRange}`);

            if (!response.ok) {
                throw new Error(`Ошибка загрузки данных: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                setData(result.data || []);
            } else {
                setError(result.error || 'Не удалось загрузить данные');
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
        } finally {
            setLoading(false);
        }
    };

    // Проверяем, есть ли реальные данные
    const hasActualData = data.length > 0 && data.some(day =>
        day.posts > 0 || day.messages > 0 || day.transactions > 0 || day.comments > 0
    );

    // Подготовка данных для круговой диаграммы
    const pieData = [
        { name: 'Посты', value: data.reduce((sum, day) => sum + day.posts, 0), color: COLORS.posts },
        { name: 'Сообщения', value: data.reduce((sum, day) => sum + day.messages, 0), color: COLORS.messages },
        { name: 'Транзакции', value: data.reduce((sum, day) => sum + day.transactions, 0), color: COLORS.transactions },
        { name: 'Комментарии', value: data.reduce((sum, day) => sum + day.comments, 0), color: COLORS.comments },
    ].filter(item => item.value > 0);

    const totalPieValue = pieData.reduce((sum, item) => sum + item.value, 0);

    const renderChart = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center h-64 sm:h-80 lg:h-96">
                    <div className="animate-spin rounded-full h-6 sm:h-8 w-6 sm:w-8 border-b-2 border-white mb-3 sm:mb-4"></div>
                    <p className="text-gray-400 text-sm sm:text-base">Загрузка данных активности...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-64 sm:h-80 lg:h-96 p-4">
                    <div className="text-red-400 text-base sm:text-lg mb-2">Ошибка</div>
                    <p className="text-gray-400 text-center text-sm sm:text-base mb-4">{error}</p>
                    <button
                        onClick={fetchActivityData}
                        className="px-4 py-2 bg-cyan-1 hover:bg-cyan-1/70 rounded-lg transition-colors font-medium text-sm sm:text-base"
                    >
                        Попробовать снова
                    </button>
                </div>
            );
        }

        if (!hasActualData) {
            return (
                <div className="flex flex-col items-center justify-center h-64 sm:h-80 lg:h-96 text-center p-4">
                    <div className="text-gray-400 text-4xl sm:text-5xl lg:text-6xl mb-3 sm:mb-4">📊</div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Нет данных об активности</h3>
                    <p className="text-gray-400 text-sm sm:text-base">
                        У вас нет зафиксированной активности за последние {timeRange} дней
                    </p>
                </div>
            );
        }

        switch (viewType) {
            case 'line':
                return (
                    <ResponsiveContainer width="100%" height="100%" minHeight={320} className="sm:min-h-[360px] lg:min-h-[440px]">
                        <LineChart
                            data={data}
                            margin={{ top: 10, right: 10, left: 5, bottom: 30 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                                dataKey="date"
                                stroke="#9CA3AF"
                                fontSize={10}
                                tickFormatter={(date) => {
                                    const [year, month, day] = date.split('-');
                                    return `${day}.${month}`;
                                }}
                                tickMargin={5}
                                minTickGap={data.length > 20 ? 30 : 10}
                                angle={data.length > 20 ? -45 : 0}
                                textAnchor={data.length > 20 ? "end" : "middle"}
                                height={data.length > 20 ? 60 : 40}
                            />
                            <YAxis
                                stroke="#9CA3AF"
                                fontSize={10}
                                width={35}
                                tickMargin={5}
                                domain={[0, 'auto']}
                                allowDataOverflow={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#333333',
                                    borderColor: 'rgba(240, 240, 240, 0.05)',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    padding: '8px 12px',
                                    maxWidth: '200px'
                                }}
                                formatter={(value, name) => [value, name]}
                                labelFormatter={(date) => `Дата: ${date}`}
                            />
                            <Legend
                                wrapperStyle={{
                                    color: '#9CA3AF',
                                    fontSize: '11px',
                                    paddingTop: '10px'
                                }}
                                iconSize={8}
                                iconType="circle"
                            />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke={COLORS.total}
                                name="Всего"
                                strokeWidth={1.5}
                                dot={{ r: 2, fill: COLORS.total }}
                                activeDot={{ r: 4, fill: COLORS.total }}
                            />
                            <Line
                                type="monotone"
                                dataKey="posts"
                                stroke={COLORS.posts}
                                name="Посты"
                                strokeWidth={1.5}
                                dot={{ r: 2, fill: COLORS.posts }}
                            />
                            <Line
                                type="monotone"
                                dataKey="messages"
                                stroke={COLORS.messages}
                                name="Сообщения"
                                strokeWidth={1.5}
                                dot={{ r: 2, fill: COLORS.messages }}
                            />
                            <Line
                                type="monotone"
                                dataKey="transactions"
                                stroke={COLORS.transactions}
                                name="Транзакции"
                                strokeWidth={1.5}
                                dot={{ r: 2, fill: COLORS.transactions }}
                            />
                            <Line
                                type="monotone"
                                dataKey="comments"
                                stroke={COLORS.comments}
                                name="Комментарии"
                                strokeWidth={1.5}
                                dot={{ r: 2, fill: COLORS.comments }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height="100%" minHeight={320} className="sm:min-h-[360px] lg:min-h-[400px]">
                        <BarChart
                            data={data}
                            margin={{ top: 10, right: 10, left: 5, bottom: 30 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                                dataKey="date"
                                stroke="#9CA3AF"
                                fontSize={10}
                                tickFormatter={(date) => {
                                    const [year, month, day] = date.split('-');
                                    return `${day}.${month}`;
                                }}
                                tickMargin={5}
                                minTickGap={data.length > 20 ? 30 : 10}
                                angle={data.length > 20 ? -45 : 0}
                                textAnchor={data.length > 20 ? "end" : "middle"}
                                height={data.length > 20 ? 60 : 40}
                            />
                            <YAxis
                                stroke="#9CA3AF"
                                fontSize={10}
                                width={35}
                                tickMargin={5}
                                domain={[0, 'auto']}
                                allowDataOverflow={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1F2937',
                                    borderColor: '#374151',
                                    color: 'white',
                                    fontSize: '12px',
                                    padding: '8px 12px',
                                    maxWidth: '200px'
                                }}
                                formatter={(value, name) => [value, name]}
                                labelFormatter={(date) => `Дата: ${date}`}
                            />
                            <Legend
                                wrapperStyle={{
                                    color: '#9CA3AF',
                                    fontSize: '11px',
                                    paddingTop: '10px'
                                }}
                                iconSize={8}
                            />
                            <Bar dataKey="posts" fill={COLORS.posts} name="Посты" radius={[2, 2, 0, 0]} barSize={data.length > 30 ? 10 : 20} />
                            <Bar dataKey="messages" fill={COLORS.messages} name="Сообщения" radius={[2, 2, 0, 0]} barSize={data.length > 30 ? 10 : 20} />
                            <Bar dataKey="transactions" fill={COLORS.transactions} name="Транзакции" radius={[2, 2, 0, 0]} barSize={data.length > 30 ? 10 : 20} />
                            <Bar dataKey="comments" fill={COLORS.comments} name="Комментарии" radius={[2, 2, 0, 0]} barSize={data.length > 30 ? 10 : 20} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'pie':
                return (
                    <div className="flex flex-col items-center w-full h-full">
                        {pieData.length > 0 ? (
                            <div className="w-full h-full">
                                {/* Для мобильных: диаграмма меньше + блок с процентами */}
                                {isMobile ? (
                                    <>
                                        <ResponsiveContainer width="100%" height="60%" minHeight={220}>
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={false}
                                                    outerRadius={70}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    paddingAngle={2}
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#1F2937',
                                                        borderColor: '#374151',
                                                        color: 'white',
                                                        fontSize: '12px',
                                                        padding: '8px 12px'
                                                    }}
                                                    formatter={(value, name, props) => [
                                                        value,
                                                        props.payload.name || 'Количество'
                                                    ]}
                                                />
                                                <Legend
                                                    wrapperStyle={{
                                                        color: '#9CA3AF',
                                                        fontSize: '11px',
                                                        paddingTop: '10px'
                                                    }}
                                                    iconSize={8}
                                                    layout="horizontal"
                                                    verticalAlign="bottom"
                                                    align="center"
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>

                                        {/* Блок с процентами для мобильных */}
                                        <div className="mt-4 sm:mt-6 w-full">
                                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                                {pieData.map((item, index) => {
                                                    const percentage = totalPieValue > 0 ? ((item.value / totalPieValue) * 100).toFixed(0) : '0';
                                                    return (
                                                        <div
                                                            key={index}
                                                            className="flex items-center justify-between bg-cgray-1 p-2 sm:p-3 rounded-lg border border-cgray-1"
                                                        >
                                                            <div className="flex items-center">
                                                                <div
                                                                    className="w-3 h-3 sm:w-4 sm:h-4 rounded mr-2 sm:mr-3"
                                                                    style={{ backgroundColor: item.color }}
                                                                />
                                                                <span className="text-xs sm:text-sm text-gray-300 truncate">{item.name}</span>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-sm sm:text-base font-semibold text-white">{item.value}</span>
                                                                <span className="text-xs text-gray-400">{percentage}%</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* Для ПК и планшетов: полная диаграмма с подписями */
                                    <ResponsiveContainer width="100%" height="100%" minHeight={320} className="sm:min-h-[360px] lg:min-h-[400px]">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent = 0 }) => {
                                                    return `${name}: ${(percent * 100).toFixed(0)}%`;
                                                }}
                                                outerRadius={windowWidth < 1024 ? 100 : 130}
                                                fill="#8884d8"
                                                dataKey="value"
                                                paddingAngle={2}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#1F2937',
                                                    borderColor: '#374151',
                                                    color: 'white',
                                                    fontSize: '12px',
                                                    padding: '8px 12px'
                                                }}
                                                formatter={(value, name, props) => [
                                                    value,
                                                    props.payload.name || 'Количество'
                                                ]}
                                            />
                                            <Legend
                                                wrapperStyle={{
                                                    color: '#9CA3AF',
                                                    fontSize: '12px',
                                                    paddingTop: '10px'
                                                }}
                                                iconSize={10}
                                                layout="horizontal"
                                                verticalAlign="bottom"
                                                align="center"
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-64 sm:h-80 lg:h-96">
                                <p className="text-gray-500 text-sm sm:text-base">Нет данных для круговой диаграммы</p>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="bg-cgray-2 border border-cgray-1 text-white p-4 sm:p-5 lg:p-6 rounded-lg mb-5 mt-5 z-10">
            <div className="mx-auto">
                {/* Заголовок */}
                <div className="mb-4 sm:mb-6 lg:mb-8">
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2">
                        Активность пользователя
                    </h1>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-2">
                        <p className="text-gray-400 text-xs sm:text-sm lg:text-base">
                            Анализ активности за последние {timeRange} дней
                        </p>
                    </div>
                </div>

                {/* Управление графиком */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="flex-1">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(Number(e.target.value))}
                            className="w-full p-3 sm:p-3 lg:p-4 text-white bg-cgray-1 border border-cgray-1 rounded-lg focus:outline-none focus:border-cyan-1 transition-colors text-xs sm:text-sm lg:text-base"
                        >
                            <option value={7}>7 дней</option>
                            <option value={30}>30 дней</option>
                            <option value={90}>90 дней</option>
                            <option value={180}>180 дней</option>
                            <option value={360}>360 дней</option>
                        </select>
                    </div>

                    <div className="flex bg-cgray-1 border border-cgray-1 rounded-lg p-1">
                        <button
                            onClick={() => setViewType('line')}
                            className={`px-3 sm:px-4 py-2 rounded-md transition text-xs sm:text-sm lg:text-base flex-1 min-w-[70px] sm:min-w-0 ${
                                viewType === 'line' ? 'bg-cyan-1/20 text-cyan-1 border border-cyan-1/30' : 'hover:bg-gray-700 text-gray-400'
                            }`}
                        >
                            <span className="hidden sm:inline">Линии</span>
                            <span className="sm:hidden">📈</span>
                        </button>
                        <button
                            onClick={() => setViewType('bar')}
                            className={`px-3 sm:px-4 py-2 rounded-md transition text-xs sm:text-sm lg:text-base flex-1 min-w-[70px] sm:min-w-0 ${
                                viewType === 'bar' ? 'bg-cyan-1/20 text-cyan-1 border border-cyan-1/30' : 'hover:bg-gray-700 text-gray-400'
                            }`}
                        >
                            <span className="hidden sm:inline">Столбцы</span>
                            <span className="sm:hidden">📊</span>
                        </button>
                        <button
                            onClick={() => setViewType('pie')}
                            className={`px-3 sm:px-4 py-2 rounded-md transition text-xs sm:text-sm lg:text-base flex-1 min-w-[70px] sm:min-w-0 ${
                                viewType === 'pie' ? 'bg-cyan-1/20 text-cyan-1 border border-cyan-1/30' : 'hover:bg-gray-700 text-gray-400'
                            }`}
                        >
                            <span className="hidden sm:inline">Круговая</span>
                            <span className="sm:hidden">🥧</span>
                        </button>
                    </div>
                </div>

                {/* Сообщения об ошибках */}
                {error && (
                    <div className="mb-4 sm:mb-6 p-3 sm:p-3 lg:p-4 bg-red-500/20 border border-red-500 rounded-lg">
                        <p className="text-red-400 text-xs sm:text-sm lg:text-base break-words">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="mt-2 text-red-400 hover:text-red-300 text-xs lg:text-sm"
                        >
                            Закрыть
                        </button>
                    </div>
                )}

                {/* График */}
                <div className="bg-cgray-1 border border-cgray-1 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6"
                     style={{
                         height: viewType === 'pie' && isMobile ? '500px' :
                             viewType === 'pie' && !isMobile ? '450px' : '400px'
                     }}>
                    {renderChart()}
                </div>

                {/* Сводка */}
                {showDetails && hasActualData && (
                    <div className="bg-cgray-1 border border-cgray-1 rounded-lg p-3 sm:p-4">
                        <ActivitySummary data={data} />
                    </div>
                )}
            </div>
        </div>
    );
};