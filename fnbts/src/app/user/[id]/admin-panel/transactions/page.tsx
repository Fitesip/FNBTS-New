// src/app/admin/transactions/page.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'

interface Transaction {
    id: number
    user_id: number
    type: string;
    amount: number
    currency_type: 'hleb&sfl' | 'hleb' | 'sfl' | 'points'
    description: string
    datetime: string
}

interface TransactionsApiResponse {
    success: boolean
    transactions?: Transaction[]
    total?: number
    page?: number
    totalPages?: number
    error?: string
}

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const { user: currentAdmin } = useAuth()

    const fetchTransactions = useCallback(async (page: number = 1, search: string = '') => {
        if (!currentAdmin) return
        if (currentAdmin.role !== 'Гл. Администратор') return

        setLoading(true)
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            })

            const token = localStorage.getItem('accessToken')
            if (!token) return

            if (search) {
                queryParams.append('search', search)
            }

            const response = await fetch(`/api/admin/transactions?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const result: TransactionsApiResponse = await response.json()

            console.log('API Response:', result)

            if (result.success) {
                setTransactions(result.transactions || [])
                setTotalPages(result.totalPages || 1)
                setError(null)
            } else {
                setError(result.error || 'Ошибка загрузки транзакций')
            }
        } catch (err) {
            console.error('Fetch transactions error:', err)
            setError('Неизвестная ошибка, попробуйте позже')
        } finally {
            setLoading(false)
        }
    }, [currentAdmin])

    useEffect(() => {
        fetchTransactions(currentPage, searchTerm)
    }, [fetchTransactions, currentPage, searchTerm])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setCurrentPage(1)
        fetchTransactions(1, searchTerm)
    }

    const getTransactionCurrencyTypeDisplay = (currency_type: string) => {
        switch (currency_type) {
            case 'hleb&sfl':
                return 'Хлеб и СФЛ'
            case 'hleb':
                return 'Хлеб'
            case 'sfl':
                return 'СФЛ'
            case 'points':
                return 'Поинты'
            case 'frame':
                return 'Рамка'
            default:
                return currency_type
        }
    }

    const getTransactionTypeDisplay = (type: string) => {
        switch (type) {
            case 'currency_purchase':
                return 'Покупка валюты'
            case 'points_purchase':
                return 'Покупка поинтов'
            case 'frame_purchase':
                return 'Покупка рамки'
            case 'frame_sale':
                return 'Продажа рамки'
            case 'currency_sale':
                return 'Продажа валюты'
            default:
                return type
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'points_purchase':
                return 'bg-green-1/20 text-green-1 border'
            case 'points':
                return 'bg-green-1/20 text-green-1 border'
            case 'frame_purchase':
                return 'bg-pink-1/20 text-pink-1 border'
            case 'frame_sale':
                return 'bg-pink-1/20 text-pink-1 border'
            case 'currency_sale':
                return 'bg-cyan-1/20 text-cyan-1 border'
            case 'frame':
                return 'bg-pink-1/20 text-pink-1 border'
            case 'sfl':
                return 'bg-yellow-1/20 text-yellow-1 border'
            case 'hleb':
                return 'bg-yellow-800/20 text-yellow-700 border'
            case 'hleb&sfl':
                return 'bg-gradient-to-r from-yellow-800/20 to-yellow-1/20 text-yellow-1 border'
            default:
                return 'bg-cyan-1/20 text-cyan-1 border'
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatDateMobile = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Проверка прав администратора
    if (currentAdmin?.role !== 'Гл. Администратор') {
        return (
            <div className="bg-cgray-2 border border-cgray-2 mb-5 rounded-lg text-white flex items-center justify-center p-4 min-h-[200px]">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-red-400 mb-4">Доступ запрещен</h1>
                    <p className="text-gray-400">У вас нет прав для доступа к этой странице</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen  bg-cgray-2 border border-cgray-2 bg-filter rounded-lg mb-5 text-white p-3 lg:p-6">
            <div className="lg:w-400 mx-auto">
                {/* Заголовок */}
                <div className="mb-4 lg:mb-8">
                    <h1 className="text-xl lg:text-3xl font-bold text-white mb-2">
                        Транзакции
                    </h1>
                    <p className="text-gray-400 text-sm lg:text-base">
                        Просмотр всех транзакций системы
                    </p>
                </div>

                {/* Поиск */}
                <div className="mb-4 lg:mb-6">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Поиск по ID или описанию..."
                            className="flex-1 p-3 text-white bg-cgray-2 border border-cgray-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-sm lg:text-base"
                        />
                        <button
                            type="submit"
                            className="px-4 py-3 bg-cyan-1 hover:bg-cyan-1/70 rounded-lg transition-colors font-medium whitespace-nowrap text-sm lg:text-base"
                        >
                            Найти
                        </button>
                    </form>
                </div>

                {/* Сообщения об ошибках */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="mt-2 text-red-400 hover:text-red-300 text-xs"
                        >
                            Закрыть
                        </button>
                    </div>
                )}

                {/* Статистика - мобильная версия */}
                <div className="grid grid-cols-2 gap-3 mb-4 lg:hidden">
                    <div className="bg-cgray-2 border border-cgray-3 rounded-lg p-3">
                        <p className="text-gray-400 text-xs">Всего</p>
                        <p className="text-lg font-bold text-white">{transactions.length}</p>
                    </div>
                    <div className="bg-cgray-2 border border-cgray-3 rounded-lg p-3">
                        <p className="text-gray-400 text-xs">Поинты</p>
                        <p className="text-lg font-bold text-green-1/70">
                            {transactions.filter(t => t.currency_type === 'points').length}
                        </p>
                    </div>
                    <div className="bg-cgray-2 border border-cgray-3 rounded-lg p-3">
                        <p className="text-gray-400 text-xs">Хлеб</p>
                        <p className="text-lg font-bold text-yellow-700">
                            {transactions.filter(t => t.currency_type === 'hleb' || t.currency_type === 'hleb&sfl').length}
                        </p>
                    </div>
                    <div className="bg-cgray-2 border border-cgray-3 rounded-lg p-3">
                        <p className="text-gray-400 text-xs">СФЛ</p>
                        <p className="text-lg font-bold text-yellow-1">
                            {transactions.filter(t => t.currency_type === 'sfl' || t.currency_type === 'hleb&sfl').length}
                        </p>
                    </div>
                </div>

                {/* Статистика - десктоп версия */}
                <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-cgray-2 border border-cgray-3 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Всего транзакций</p>
                        <p className="text-2xl font-bold text-white">{transactions.length}</p>
                    </div>
                    <div className="bg-cgray-2 border border-cgray-3 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Транзакции с поинтами</p>
                        <p className="text-2xl font-bold text-green-1/70">
                            {transactions.filter(t => t.currency_type === 'points').length}
                        </p>
                    </div>
                    <div className="bg-cgray-2 border border-cgray-3 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Транзакции Хлеб</p>
                        <p className="text-2xl font-bold text-yellow-700">
                            {transactions.filter(t => t.currency_type === 'hleb' || t.currency_type === 'hleb&sfl').length}
                        </p>
                    </div>
                    <div className="bg-cgray-2 border border-cgray-3 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Транзакции СФЛ</p>
                        <p className="text-2xl font-bold text-yellow-1">
                            {transactions.filter(t => t.currency_type === 'sfl' || t.currency_type === 'hleb&sfl').length}
                        </p>
                    </div>
                </div>

                {/* Таблица транзакций - мобильная версия */}
                <div className="lg:hidden">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center p-8 text-gray-400">
                            Транзакции не найдены
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((transaction) => (
                                <div key={transaction.id} className="bg-cgray-2 bg-filter border border-cgray-2 rounded-lg p-3 hover:bg-cgray-3/50 transition-colors">
                                    {/* Верхняя строка - ID и дата */}
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 text-xs">ID:</span>
                                            <span className="text-gray-300 font-mono text-sm">
                                                {transaction.id}
                                            </span>
                                        </div>
                                        <span className="text-gray-300 text-xs">
                                            {transaction.datetime ? formatDateMobile(transaction.datetime) : 'Не указана'}
                                        </span>
                                    </div>

                                    {/* Пользователь и сумма */}
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <span className="text-gray-400 text-xs block">Пользователь:</span>
                                            <span className="text-white font-medium text-sm">
                                                {transaction.user_id}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-gray-400 text-xs block">Сумма:</span>
                                            <span className={`font-bold text-sm ${
                                                transaction.type == 'currency_sale' ? 'text-green-1' : transaction.type == 'frame_sale' ? 'text-green-1' : 'text-red-1'
                                            }`}>
                                                {transaction.type == 'currency_sale' ? '+' : transaction.type == 'frame_sale' ? '+' : '-'}{transaction.amount}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Тип и валюта */}
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}>
                                            {getTransactionTypeDisplay(transaction.type)}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction.currency_type)}`}>
                                            {getTransactionCurrencyTypeDisplay(transaction.currency_type)}
                                        </span>
                                    </div>

                                    {/* Описание */}
                                    <div>
                                        <span className="text-gray-400 text-xs block mb-1">Описание:</span>
                                        <p className="text-white text-sm line-clamp-2">
                                            {transaction.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Таблица транзакций - десктоп версия */}
                <div className="hidden lg:block bg-cgray-2 bg-filter border border-cgray-2 rounded-lg overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center p-8 text-gray-400">
                            Транзакции не найдены
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="border-b border-cgray-1">
                                    <th className="text-left p-4 font-medium text-gray-400">ID</th>
                                    <th className="text-left p-4 font-medium text-gray-400">ID пользователя</th>
                                    <th className="text-left p-4 font-medium text-gray-400">Тип</th>
                                    <th className="text-left p-4 font-medium text-gray-400">Сумма</th>
                                    <th className="text-left p-4 font-medium text-gray-400">Валюта</th>
                                    <th className="text-left p-4 font-medium text-gray-400">Описание</th>
                                    <th className="text-left p-4 font-medium text-gray-400">Дата</th>
                                </tr>
                                </thead>
                                <tbody>
                                {transactions.map((transaction) => (
                                    <tr key={transaction.id} className="border-b border-cgray-2 hover:bg-cgray-1/50 transition-colors">
                                        <td className="p-4 text-gray-300 font-mono text-sm">
                                            {transaction.id}
                                        </td>
                                        <td className="p-4">
                        <span className="text-white font-medium">
                          {transaction.user_id}
                        </span>
                                        </td>
                                        <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}>
                          {getTransactionTypeDisplay(transaction.type)}
                        </span>
                                        </td>
                                        <td className="p-4">
                        <span className={`font-bold ${
                            transaction.type == 'currency_sale' ? 'text-green-1' : transaction.type == 'frame_sale' ? 'text-green-1' : 'text-red-1'
                        }`}>
                          {transaction.type == 'currency_sale' ? '+' : transaction.type == 'frame_sale' ? '+' : '-'}{transaction.amount}
                        </span>
                                        </td>
                                        <td className={`p-4`} >
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction.currency_type)}`}>
                                                {getTransactionCurrencyTypeDisplay(transaction.currency_type)}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-white text-sm max-w-130 truncate" title={transaction.description}>
                                                {transaction.description}
                                            </p>
                                        </td>
                                        <td className="p-4 text-gray-300 text-sm">
                                            {transaction.datetime ? formatDate(transaction.datetime) : 'Не указана'}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Пагинация */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-3 mt-4 lg:mt-6">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 bg-cgray-2 border border-cgray-2 rounded-lg hover:bg-cgray-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                        >
                            Назад
                        </button>

                        <span className="text-gray-400 text-sm lg:text-base">
                            {currentPage} / {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 bg-cgray-2 border border-cgray-2 rounded-lg hover:bg-cgray-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                        >
                            Вперед
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}