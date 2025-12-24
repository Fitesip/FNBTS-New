import { subDays, format, parseISO, parse } from 'date-fns';

// Определяем все необходимые типы
export interface ActivityDataPoint {
    date: string;
    posts: number;
    messages: number;
    transactions: number;
    comments: number;
    total: number;
}

export interface RawActivityData {
    posts: Array<{ date: string; time: string; username: string }>;
    messages: Array<{ created_at: string; sender_id: string }>;
    transactions: Array<{ datetime: string; user_id: string }>;
    answers: Array<{ date: string; time: string; author: string }>;
}

export type UserMap = Record<string, string>;

export interface ActivitySummary {
    totalPosts: number;
    totalMessages: number;
    totalTransactions: number;
    totalComments: number;
    totalActivities: number;
    peakDay: ActivityDataPoint | null;
    dailyAverage: number;
    mostActiveType: string;
    activityRatio: {
        posts: string;
        messages: string;
        transactions: string;
        comments: string;
    };
}

export interface HourlyActivity {
    hour: number;
    count: number;
    type: string;
}

export class ActivityDataProcessor {
    private userMap: UserMap;

    constructor(userMap: UserMap) {
        this.userMap = userMap;
    }

    // Метод для парсинга даты и времени из строк
    private parseDateTime(dateStr: string, timeStr?: string): Date {
        try {
            if (timeStr) {
                // Объединяем дату и время в формате 'YYYY-MM-DD HH:MM:SS'
                return parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm:ss', new Date());
            }
            // Если время не указано, используем только дату
            return parse(dateStr, 'yyyy-MM-dd', new Date());
        } catch (error) {
            console.warn('Error parsing date/time:', dateStr, timeStr, error);
            return new Date();
        }
    }

    processActivityData(
        userId: string,
        rawData: RawActivityData,
        days: number = 30
    ): ActivityDataPoint[] {
        const username = this.userMap[userId];
        
        
        
        
        console.log('Raw data counts:', {
            posts: rawData.posts.length,
            messages: rawData.messages.length,
            transactions: rawData.transactions.length,
            answers: rawData.answers.length
        });

        if (!username) {
            console.error('Username not found for user ID:', userId);
            return [];
        }

        // Создаем массив дней
        const results: ActivityDataPoint[] = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const dateStr = format(date, 'yyyy-MM-dd');

            results.push({
                date: dateStr,
                posts: 0,
                messages: 0,
                transactions: 0,
                comments: 0,
                total: 0
            });
        }


        // Создаем Map для быстрого доступа к данным дня
        const resultsMap = new Map<string, ActivityDataPoint>();
        results.forEach(day => resultsMap.set(day.date, day));

        // === ОБРАБОТКА ПОСТОВ ===
        
        const userPosts = rawData.posts.filter(post => {
            const matches = post.username === username;
            if (!matches) {
                
            }
            return matches;
        });


        userPosts.forEach(post => {
            try {
                // Нормализуем дату - берем только часть до пробела если есть время
                const dateStr = this.normalizeDate(post.date);

                // Проверяем, существует ли такой день в результатах
                const dayData = resultsMap.get(dateStr);
                if (dayData) {
                    dayData.posts++;
                    dayData.total++;
                    
                } else {
                    
                }
            } catch (error) {
                console.error('Error processing post:', post, error);
            }
        });

        // === ОБРАБОТКА СООБЩЕНИЙ ===
        
        const userMessages = rawData.messages.filter(msg => {
            const matches = msg.sender_id === userId;
            return matches;
        });

        userMessages.forEach(msg => {
            try {
                const date = parseISO(msg.created_at);
                const dateStr = format(date, 'yyyy-MM-dd');

                const dayData = resultsMap.get(dateStr);
                if (dayData) {
                    dayData.messages++;
                    dayData.total++;
                    
                } else {
                    
                }
            } catch (error) {
                console.error('Error processing message:', msg, error);
            }
        });

        // === ОБРАБОТКА ТРАНЗАКЦИЙ ===
        
        const userTransactions = rawData.transactions.filter(transaction => {
            const matches = transaction.user_id === userId;
            return matches;
        });

        userTransactions.forEach(transaction => {
            try {
                const date = parseISO(transaction.datetime);
                const dateStr = format(date, 'yyyy-MM-dd');

                const dayData = resultsMap.get(dateStr);
                if (dayData) {
                    dayData.transactions++;
                    dayData.total++;
                    
                } else {
                    
                }
            } catch (error) {
                console.error('Error processing transaction:', transaction, error);
            }
        });

        // === ОБРАБОТКА ОТВЕТОВ ===
        
        const userAnswers = rawData.answers.filter(answer => {
            const matches = answer.author === username;
            if (!matches) {
                
            }
            return matches;
        });

        userAnswers.forEach(answer => {
            try {
                const dateStr = this.normalizeDate(answer.date);

                const dayData = resultsMap.get(dateStr);
                if (dayData) {
                    dayData.comments++;
                    dayData.total++;
                    
                } else {
                    
                }
            } catch (error) {
                console.error('Error processing answer:', answer, error);
            }
        });

        return results;
    }

    // Метод для получения активности по часам дня
    getHourlyActivity(
        userId: string,
        rawData: RawActivityData
    ): HourlyActivity[] {
        const hourlyData: HourlyActivity[] = [];

        // Инициализируем часы (0-23)
        for (let hour = 0; hour < 24; hour++) {
            hourlyData.push({ hour, count: 0, type: 'all' });
        }

        // Обработка постов по часам
        rawData.posts
            .filter(post => post.username === this.userMap[userId])
            .forEach(post => {
                try {
                    const dateTime = this.parseDateTime(post.date, post.time);
                    const hour = dateTime.getHours();
                    hourlyData[hour].count++;
                } catch (error) {
                    console.warn('Error processing post hour:', error);
                }
            });

        // Обработка сообщений по часам
        rawData.messages
            .filter(msg => msg.sender_id === userId)
            .forEach(msg => {
                try {
                    const date = parseISO(msg.created_at);
                    const hour = date.getHours();
                    hourlyData[hour].count++;
                } catch (error) {
                    console.warn('Error processing message hour:', error);
                }
            });

        // Обработка транзакций по часам
        rawData.transactions
            .filter(transaction => transaction.user_id === userId)
            .forEach(transaction => {
                try {
                    const date = parseISO(transaction.datetime);
                    const hour = date.getHours();
                    hourlyData[hour].count++;
                } catch (error) {
                    console.warn('Error processing transaction hour:', error);
                }
            });

        // Обработка ответов по часам
        rawData.answers
            .filter(answer => answer.author === this.userMap[userId])
            .forEach(answer => {
                try {
                    const dateTime = this.parseDateTime(answer.date, answer.time);
                    const hour = dateTime.getHours();
                    hourlyData[hour].count++;
                } catch (error) {
                    console.warn('Error processing answer hour:', error);
                }
            });

        return hourlyData;
    }

    getActivitySummary(data: ActivityDataPoint[]): ActivitySummary {
        if (data.length === 0) {
            return {
                totalPosts: 0,
                totalMessages: 0,
                totalTransactions: 0,
                totalComments: 0,
                totalActivities: 0,
                peakDay: null,
                dailyAverage: 0,
                mostActiveType: 'none',
                activityRatio: {
                    posts: '0%',
                    messages: '0%',
                    transactions: '0%',
                    comments: '0%'
                }
            };
        }

        const totals = data.reduce((acc, day) => ({
            posts: acc.posts + day.posts,
            messages: acc.messages + day.messages,
            transactions: acc.transactions + day.transactions,
            comments: acc.comments + day.comments,
            total: acc.total + day.total
        }), { posts: 0, messages: 0, transactions: 0, comments: 0, total: 0 });

        const peakDay = data.reduce((max, day) =>
            day.total > max.total ? day : max, data[0]
        );

        // Определяем наиболее активный тип
        const typeCounts = {
            posts: totals.posts,
            messages: totals.messages,
            transactions: totals.transactions,
            comments: totals.comments
        };

        const mostActiveType = Object.entries(typeCounts)
            .reduce((a, b) => a[1] > b[1] ? a : b)[0];

        // Рассчитываем проценты
        const calculatePercentage = (value: number, total: number): string => {
            if (total === 0) return '0%';
            return ((value / total) * 100).toFixed(1) + '%';
        };

        return {
            totalPosts: totals.posts,
            totalMessages: totals.messages,
            totalTransactions: totals.transactions,
            totalComments: totals.comments,
            totalActivities: totals.total,
            peakDay,
            dailyAverage: totals.total / data.length,
            mostActiveType,
            activityRatio: {
                posts: calculatePercentage(totals.posts, totals.total),
                messages: calculatePercentage(totals.messages, totals.total),
                transactions: calculatePercentage(totals.transactions, totals.total),
                comments: calculatePercentage(totals.comments, totals.total)
            }
        };
    }

    // Метод для получения активности по типам за период
    getActivityByType(data: ActivityDataPoint[]) {
        return {
            posts: data.reduce((sum, day) => sum + day.posts, 0),
            messages: data.reduce((sum, day) => sum + day.messages, 0),
            transactions: data.reduce((sum, day) => sum + day.transactions, 0),
            comments: data.reduce((sum, day) => sum + day.comments, 0)
        };
    }

    // Метод для получения тренда активности
    getActivityTrend(data: ActivityDataPoint[]): 'increasing' | 'decreasing' | 'stable' {
        if (data.length < 2) return 'stable';

        const firstHalf = data.slice(0, Math.floor(data.length / 2));
        const secondHalf = data.slice(Math.floor(data.length / 2));

        const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.total, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.total, 0) / secondHalf.length;

        const threshold = 0.1; // 10% порог для определения тренда

        if (secondHalfAvg > firstHalfAvg * (1 + threshold)) return 'increasing';
        if (secondHalfAvg < firstHalfAvg * (1 - threshold)) return 'decreasing';
        return 'stable';
    }

    // В ActivityDataProcessor добавьте эту функцию
    private normalizeDate(dateStr: string): string {
        try {
            // Убираем время если оно есть
            const dateOnly = dateStr.split(' ')[0];

            // Пробуем разные форматы дат
            const formats = [
                'yyyy-MM-dd',
                'dd.MM.yyyy',
                'dd/MM/yyyy',
                'yyyy/MM/dd',
                'MM/dd/yyyy',
                'dd-MM-yyyy'
            ];

            for (const fmt of formats) {
                try {
                    const date = parse(dateOnly, fmt, new Date());
                    if (!isNaN(date.getTime())) {
                        return format(date, 'yyyy-MM-dd');
                    }
                } catch {
                    continue;
                }
            }

            // Если не удалось распарсить, возвращаем как есть
            console.warn('Could not parse date:', dateStr);
            return dateOnly;
        } catch {
            return dateStr;
        }
    }
}

// Экспортируем утилитные функции
export const formatDateForDisplay = (dateStr: string): string => {
    try {
        const date = new Date(dateStr);
        return format(date, 'dd.MM.yyyy');
    } catch {
        return dateStr;
    }
};

export const formatTimeForDisplay = (timeStr: string): string => {
    try {
        const [hours, minutes] = timeStr.split(':');
        return `${hours}:${minutes}`;
    } catch {
        return timeStr;
    }
};