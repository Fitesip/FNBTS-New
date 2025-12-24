import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { ActivityDataProcessor, UserMap } from '@/utils/activityChart';
import { format, subDays } from 'date-fns';

interface ForumPost {
    date: string;
    time: string;
    author: string;
}

interface Message {
    created_at: Date | string;
    sender_id: string;
}

interface Transaction {
    datetime: Date | string;
    user_id: string;
}

interface Answer {
    date: string;
    time: string;
    author: string;
}

interface UserRow {
    username: string;
    [key: string]: unknown;
}

interface ForumRow {
    date: string | Date;
    time: string;
    author: string;
}

interface MessageRow {
    created_at: Date | string;
    sender_id: string;
}

interface TransactionRow {
    datetime: Date | string;
    user_id: string;
}

interface AnswerRow {
    date: string | Date;
    time: string;
    author: string;
}

// Безопасная проверка на Date
const isDateObject = (value: unknown): value is Date => {
    return (
        value instanceof Date ||
        (typeof value === 'object' &&
            value !== null &&
            'getTime' in value &&
            typeof (value as Date).getTime === 'function')
    );
};

// Безопасное преобразование в строку ISO
const toISOStringSafe = (value: unknown): string => {
    if (isDateObject(value)) {
        return value.toISOString();
    }

    // Если это уже строка, проверяем формат
    if (typeof value === 'string') {
        // Пробуем преобразовать строку в Date для проверки
        try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch {
            console.warn('Could not parse date string:', value);
        }
    }

    // Если ничего не работает, возвращаем текущую дату
    return new Date().toISOString();
};

// Правильное преобразование даты в строку
const formatDateToString = (dateValue: unknown): string => {
    try {
        if (dateValue instanceof Date) {
            // Если это объект Date, форматируем его
            return format(dateValue, 'yyyy-MM-dd');
        }

        // Если это строка, пробуем преобразовать
        if (typeof dateValue === 'string') {
            // Удаляем время и часовой пояс если есть
            const dateStr = dateValue.split(' ')[0];
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return format(date, 'yyyy-MM-dd');
            }
        }

        // В крайнем случае возвращаем как есть
        console.warn('Could not format date:', dateValue);
        return String(dateValue);
    } catch (error) {
        console.error('Error formatting date:', error);
        return format(new Date(), 'yyyy-MM-dd');
    }
};

export async function GET(request: NextRequest) {
    let connection;

    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        const days = parseInt(searchParams.get('days') || '30');
        const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        connection = await pool.getConnection();

        // 1. Получаем username пользователя
        const [userRows] = (await connection.execute(
            `SELECT username
             FROM fnbts.users
             WHERE id = ?`,
            [userId]
        )) as unknown as [UserRow[]];

        if (userRows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const username = userRows[0].username;

        // 2. Получаем посты на форуме - ВАЖНО: используем DATE() для преобразования
        const [postRows] = (await connection.execute(
            `SELECT DATE(date) as date, -- Используем DATE() для преобразования в дату без времени
                    TIME(time) as time,
                    author
             FROM fnbts.forum
             WHERE author = ?
               AND date >= ?
             ORDER BY date ASC, time ASC`,
            [username, startDate]
        )) as unknown as [ForumRow[]];

        // 3. Получаем сообщения в мессенджере
        const [messageRows] = (await connection.execute(
            `SELECT created_at,
                    sender_id
             FROM fnbts.messages
             WHERE sender_id = ?
               AND DATE(created_at) >= ?
             ORDER BY created_at ASC`,
            [userId, startDate]
        )) as unknown as [MessageRow[]];

        // 4. Получаем транзакции
        const [transactionRows] = (await connection.execute(
            `SELECT datetime,
                    user_id
             FROM fnbts.transactions
             WHERE user_id = ?
               AND DATE(datetime) >= ?
             ORDER BY datetime ASC`,
            [userId, startDate]
        )) as unknown as [TransactionRow[]];

        // 5. Получаем ответы на комментарии
        const [answerRows] = (await connection.execute(
            `SELECT DATE(date) as date, -- Используем DATE() для преобразования
                    TIME(time) as time,
                    author
             FROM fnbts.answers
             WHERE author = ?
               AND date >= ?
             ORDER BY date ASC, time ASC`,
            [username, startDate]
        )) as unknown as [AnswerRow[]];

        // Подготавливаем данные в правильном формате
        const rawData = {
            posts: postRows.map((row: ForumRow) => ({
                date: formatDateToString(row.date), // Преобразуем в строку "YYYY-MM-DD"
                time: row.time ? String(row.time) : '00:00:00',
                username: String(row.author),
            })),
            messages: messageRows.map((row: MessageRow) => {
                // Преобразуем MySQL DATETIME/TIMESTAMP в строку ISO
                const createdDate = isDateObject(row.created_at)
                    ? row.created_at.toISOString()
                    : String(row.created_at);
                return {
                    created_at: createdDate,
                    sender_id: String(row.sender_id),
                };
            }),
            transactions: transactionRows.map((row: TransactionRow) => {
                // Преобразуем MySQL DATETIME/TIMESTAMP в строку ISO
                const datetime = isDateObject(row.datetime)
                    ? row.datetime.toISOString()
                    : String(row.datetime);
                return {
                    datetime: datetime,
                    user_id: String(row.user_id),
                };
            }),
            answers: answerRows.map((row: AnswerRow) => ({
                date: formatDateToString(row.date), // Преобразуем в строку "YYYY-MM-DD"
                time: row.time ? String(row.time) : '00:00:00',
                author: String(row.author),
            })),
        };

        // Создаем user map
        const userMap: UserMap = { [userId]: username };

        // Обрабатываем данные с дополнительной отладкой
        const processor = new ActivityDataProcessor(userMap); // true = debug mode
        const processedData = processor.processActivityData(userId, rawData, days);

        const summary = processor.getActivitySummary(processedData);

        return NextResponse.json({
            success: true,
            userId,
            username,
            period: days,
            startDate,
            data: processedData,
            summary,
            rawCounts: {
                posts: postRows.length,
                messages: messageRows.length,
                transactions: transactionRows.length,
                answers: answerRows.length,
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                dataPoints: processedData.length,
                timeRange: `${days} дней`,
                debug: {
                    postDatesSample: postRows.slice(0, 3).map((p: ForumRow) => ({
                        original: p.date,
                        formatted: formatDateToString(p.date),
                    })),
                    answerDatesSample: answerRows.slice(0, 3).map((a: AnswerRow) => ({
                        original: a.date,
                        formatted: formatDateToString(a.date),
                    })),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching activity data:', error);

        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// Улучшенный POST endpoint для сравнения нескольких пользователей
export async function POST(request: NextRequest) {
    let connection;

    try {
        const body = await request.json();
        const { userIds, days = 30, compareBy = 'total' } = body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json(
                { error: 'Array of user IDs is required' },
                { status: 400 }
            );
        }

        connection = await pool.getConnection();

        // Получаем username для всех пользователей одним запросом
        const placeholders = userIds.map(() => '?').join(',');
        const [userRows] = (await connection.execute(
            `SELECT id, username
             FROM fnbts.users
             WHERE id IN (${placeholders})`,
            userIds
        )) as unknown as [{ id: string; username: string }[]];

        const userMap: Record<string, string> = {};
        userRows.forEach((row: { id: string; username: string }) => {
            userMap[row.id] = row.username;
        });

        const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
        const results = [];

        // Оптимизированные запросы для нескольких пользователей
        for (const userId of userIds) {
            const username = userMap[userId];
            if (!username) continue;

            // Используем Promise.all для параллельного выполнения запросов
            const [postsResult, messagesResult, transactionsResult, answersResult] =
                await Promise.all([
                    connection.execute(
                        `SELECT date, time, author
                         FROM fnbts.forum
                         WHERE author = ?
                           AND date >= ?`,
                        [username, startDate]
                    ) as unknown as Promise<[ForumPost[]]>,

                    connection.execute(
                        `SELECT created_at, sender_id
                         FROM fnbts.messages
                         WHERE sender_id = ?
                           AND DATE(created_at) >= ?`,
                        [userId, startDate]
                    ) as unknown as Promise<[Message[]]>,

                    connection.execute(
                        `SELECT datetime, user_id
                         FROM fnbts.transactions
                         WHERE user_id = ?
                           AND DATE(datetime) >= ?`,
                        [userId, startDate]
                    ) as unknown as Promise<[Transaction[]]>,

                    connection.execute(
                        `SELECT date, time, author
                         FROM fnbts.answers
                         WHERE author = ?
                           AND date >= ?`,
                        [username, startDate]
                    ) as unknown as Promise<[Answer[]]>,
                ]);

            const posts = postsResult[0];
            const messages = messagesResult[0];
            const transactions = transactionsResult[0];
            const answers = answersResult[0];

            const rawData = {
                posts: posts.map((row) => ({
                    date: row.date,
                    time: row.time,
                    username: row.author,
                })),
                messages: messages.map((row) => ({
                    created_at: toISOStringSafe(row.created_at),
                    sender_id: row.sender_id,
                })),
                transactions: transactions.map((row) => ({
                    datetime: toISOStringSafe(row.datetime),
                    user_id: row.user_id,
                })),
                answers: answers.map((row) => ({
                    date: row.date,
                    time: row.time,
                    author: row.author,
                })),
            };

            const processor = new ActivityDataProcessor(userMap);
            const processedData = processor.processActivityData(userId, rawData, days);
            const summary = processor.getActivitySummary(processedData);

            results.push({
                userId,
                username,
                data: processedData,
                summary,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    username
                )}&background=random`,
            });
        }

        // Сортируем результаты по выбранному параметру
        if (compareBy && compareBy !== 'none') {
            results.sort((a, b) => {
                let aValue: number;
                let bValue: number;

                if (compareBy === 'total') {
                    aValue = a.summary.totalActivities;
                    bValue = b.summary.totalActivities;
                } else {
                    const compareByCapitalized =
                        compareBy.charAt(0).toUpperCase() + compareBy.slice(1);
                    aValue = a.summary[
                        `total${compareByCapitalized}` as keyof typeof a.summary
                        ] as number;
                    bValue = b.summary[
                        `total${compareByCapitalized}` as keyof typeof b.summary
                        ] as number;
                }

                return bValue - aValue;
            });
        }

        return NextResponse.json({
            success: true,
            users: results,
            totalUsers: results.length,
            period: days,
            comparisonBy: compareBy,
        });
    } catch (error) {
        console.error('Error fetching multiple users activity:', error);

        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    } finally {
        if (connection) {
            connection.release();
        }
    }
}