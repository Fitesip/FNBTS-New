// src/utils/dateFormatter.ts

export function extractDateAndTime(dateString: string): { date: string; time: string } {
    if (!dateString) return { date: '', time: '' };

    let datePart = dateString;
    let timePart = '';

    // Обрабатываем ISO строки (2025-01-08T21:00:00.000Z)
    if (dateString.includes('T')) {
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                // Форматируем дату и время локально
                datePart = date.toLocaleDateString('ru-RU');
                timePart = date.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                return { date: datePart, time: timePart };
            }
        } catch (error) {
            console.warn('Failed to parse ISO date:', error);
        }
    }

    // Обрабатываем строки формата "29.12.2024 21:00"
    const timeMatch = dateString.match(/(\d{1,2}:\d{1,2}(?::\d{1,2})?)/);
    if (timeMatch) {
        timePart = timeMatch[0];
        datePart = dateString.replace(timeMatch[0], '').trim();
    }

    // Очищаем дату от лишних частей
    datePart = datePart
        .replace(/T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    return { date: datePart, time: timePart };
}

export function formatForumDate(dateString: string, timeString?: string): string {
    try {

        let date: Date;

        // Пытаемся создать Date из строки (работает для ISO формата)
        if (dateString.includes('T') || dateString.includes('-')) {
            date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return formatDateObject(date, timeString);
            }
        }

        // Парсим строку формата "29.12.2024"
        const dateMatch = dateString.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (dateMatch) {
            const [, day, month, year] = dateMatch;

            // Создаем дату в локальном времени, а не UTC
            date = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day)
            );

            // Добавляем время если есть
            if (timeString) {
                const timeMatch = timeString.match(/(\d{1,2}):(\d{1,2})/);
                if (timeMatch) {
                    const [, hours, minutes] = timeMatch;
                    date.setHours(parseInt(hours));
                    date.setMinutes(parseInt(minutes));
                }
            } else {
                // Ищем время в самой dateString
                const timeMatch = dateString.match(/(\d{1,2}):(\d{1,2})/);
                if (timeMatch) {
                    const [, hours, minutes] = timeMatch;
                    date.setHours(parseInt(hours));
                    date.setMinutes(parseInt(minutes));
                }
            }

            if (!isNaN(date.getTime())) {
                return formatDateObject(date);
            }
        }

        throw new Error('Could not parse date');

    } catch (error) {
        console.error('❌ Date formatting error:', error, 'Input:', dateString, timeString);
        return formatForumDateSimple(dateString, timeString);
    }
}

// Вспомогательная функция для форматирования объекта Date
function formatDateObject(date: Date, timeString?: string): string {
    // Если передано отдельное время, применяем его
    if (timeString) {
        const timeMatch = timeString.match(/(\d{1,2}):(\d{1,2})/);
        if (timeMatch) {
            const [, hours, minutes] = timeMatch;
            date.setHours(parseInt(hours));
            date.setMinutes(parseInt(minutes));
        }
    }

    const formattedDate = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Проверяем, есть ли время в дате (не 00:00)
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;

    if (hasTime) {
        const formattedTime = date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        return `${formattedDate} в ${formattedTime}`;
    }

    return formattedDate;
}

export function formatForumDateSimple(dateString: string, timeString?: string): string {
    try {
        // Если есть timeString, используем его как основной источник времени
        const finalTimeString = timeString || '';

        // Пытаемся создать Date объект для ISO строк
        if (dateString.includes('T') || dateString.includes('-')) {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                const day = date.getDate();
                const month = date.getMonth();
                const year = date.getFullYear();

                const months = [
                    'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
                    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
                ];

                const monthName = months[month];

                // Определяем есть ли время
                const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0 || finalTimeString;

                if (hasTime) {
                    let hours: string, minutes: string;

                    // Если есть отдельный timeString, используем его
                    if (finalTimeString) {
                        const timeMatch = finalTimeString.match(/(\d{1,2}):(\d{1,2})/);
                        if (timeMatch) {
                            [, hours, minutes] = timeMatch;
                        } else {
                            // Если timeString не в правильном формате, используем время из даты
                            hours = date.getHours().toString().padStart(2, '0');
                            minutes = date.getMinutes().toString().padStart(2, '0');
                        }
                    } else {
                        // Используем время из даты
                        hours = date.getHours().toString().padStart(2, '0');
                        minutes = date.getMinutes().toString().padStart(2, '0');
                    }
                    return `${day} ${monthName} ${year} ${hours}:${minutes}`;
                }

                return `${day} ${monthName} ${year}`;
            }
        }

        // Обрабатываем строки формата "29.12.2024" или "29.12.2024 21:00"
        let day, month, year, hours, minutes;

        // Извлекаем дату из формата "29.12.2024"
        const dateMatch = dateString.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (dateMatch) {
            [, day, month, year] = dateMatch;
        }

        // Извлекаем время (приоритет: timeString > dateString)
        if (finalTimeString) {
            const timeMatch = finalTimeString.match(/(\d{1,2}):(\d{1,2})/);
            if (timeMatch) {
                [, hours, minutes] = timeMatch;
            }
        } else {
            // Ищем время в dateString (формат "21:00")
            const timeMatch = dateString.match(/(\d{1,2}):(\d{1,2})/);
            if (timeMatch) {
                [, hours, minutes] = timeMatch;
            }
        }

        // Если нашли все компоненты даты
        if (day && month && year) {
            const months = [
                'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
                'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
            ];

            const monthName = months[parseInt(month) - 1];

            // Формируем строку времени если есть часы и минуты
            let timePart = '';
            if (hours !== undefined && minutes !== undefined) {
                timePart = ` ${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
            }

            return `${parseInt(day)} ${monthName} ${year}${timePart}`;
        }

        // Если ничего не распарсили, возвращаем очищенную версию
        const { date: cleanDate, time: cleanTime } = extractDateAndTime(dateString);
        if (cleanTime) {
            return `${cleanDate} ${cleanTime}`;
        }
        return cleanDate;

    } catch (error) {
        console.error('❌ Simple date formatting error:', error);
        return dateString;
    }
}

export function formatTime(timeString: string): string {
    try {
        if (!timeString) return '';

        // Пытаемся парсить ISO строку времени
        if (timeString.includes('T')) {
            const date = new Date(timeString);
            if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        }

        const timeMatch = timeString.match(/(\d{1,2}):(\d{1,2})/);
        if (timeMatch) {
            const [, hours, minutes] = timeMatch;
            return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }

        return timeString;
    } catch (error) {
        console.error('Time formatting error:', error);
        return timeString;
    }
}