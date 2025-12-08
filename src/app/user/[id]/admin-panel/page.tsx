// src/app/admin/users/page.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { User, ApiResponse } from '@/types/database'
import Image from 'next/image'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from "next/navigation";

interface UsersResponse extends ApiResponse {
    success: boolean;
    data: {
        page: number;
        total: number;
        totalPages: number;
        users: User[]
    }
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [saving, setSaving] = useState(false)
    const [blocking, setBlocking] = useState<number | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const { user: currentAdmin } = useAuth()
    const router = useRouter()

    const fetchUsers = useCallback(async (page: number = 1, search: string = '') => {
        if (!currentAdmin) return
        if (currentAdmin.role !== 'Гл. Администратор') return

        const token = localStorage.getItem('accessToken')
        if (!token) return
        setLoading(true)
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            })

            if (search) {
                queryParams.append('search', search)
            }

            const response = await fetch(`/api/admin/users?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token,
                },
            })
            const result: UsersResponse = await response.json()
            console.log(result)
            if (result.success && result.data.users) {
                setUsers(result.data.users)
                setTotalPages(Math.ceil((result.data.total || 0) / 20))
            } else {
                setError('Ошибка загрузки пользователей')
            }
        } catch (err) {
            setError('Неизвестная ошибка, попробуйте позже')
            console.error('Ошибка загрузки пользователей:', err)
        } finally {
            setLoading(false)
        }
    }, [currentAdmin])

    useEffect(() => {
        fetchUsers(currentPage, searchTerm)
    }, [fetchUsers, currentPage, searchTerm])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setCurrentPage(1)
        fetchUsers(1, searchTerm)
    }

    const handleEdit = (user: User) => {
        setEditingUser({ ...user })
    }

    const handleSave = async () => {
        if (!editingUser) return
        const token = localStorage.getItem('accessToken')
        if (!token) return

        setSaving(true)
        try {
            const formData = new FormData()
            formData.append('points', editingUser.points.toString())
            formData.append('role', editingUser.role)

            const response = await fetch(`/api/users/${editingUser.id}/admin`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                },
                body: formData,
            })

            const result: ApiResponse = await response.json()

            if (result.success) {
                setUsers(users.map(user =>
                    user.id === editingUser.id ? editingUser : user
                ))
                setEditingUser(null)
                setError(null)
            } else {
                setError(result.message || 'Ошибка сохранения')
            }
        } catch (err) {
            setError('Ошибка сохранения')
            console.error('Ошибка сохранения:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleBlockUser = async (userId: number, ban: boolean) => {
        const token = localStorage.getItem('accessToken')
        if (!token) return

        setBlocking(userId)
        try {


            const response = await fetch(`/api/users/${userId}/ban`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                },
                body: JSON.stringify({
                    isBlocked: ban.toString(),
                }),
            })

            const result: ApiResponse = await response.json()

            if (result.success) {
                // Обновляем состояние пользователя
                setUsers(users.map(user =>
                    user.id === userId ? { ...user, isBlocked: ban } : user
                ))
                setError(null)
            } else {
                setError(result.message || 'Ошибка блокировки пользователя')
            }
        } catch (err) {
            setError('Ошибка блокировки пользователя')
            console.error('Ошибка блокировки:', err)
        } finally {
            setBlocking(null)
        }
    }

    const handleCancel = () => {
        setEditingUser(null)
    }

    const handleInputChange = (field: keyof User, value: string | number) => {
        if (editingUser) {
            setEditingUser({ ...editingUser, [field]: value })
        }
    }

    // Проверка прав администратора
    if (currentAdmin?.role !== 'Гл. Администратор') {
        return (
            <div className="bg-cgray-2 bg-filter border border-cgray-2 mb-5 rounded-lg text-white flex items-center justify-center p-4 z-40">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-400 mb-4">Доступ запрещен</h1>
                    <p className="text-gray-400">У вас нет прав для доступа к этой странице</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-cgray-2 bg-filter border border-cgray-2 text-white p-4 lg:p-6 rounded-lg mb-5">
            <div className="mx-auto">
                {/* Заголовок */}
                <div className="mb-6 lg:mb-8">
                    <h1 className="text-xl lg:text-3xl font-bold text-white mb-2">
                        Панель администратора
                    </h1>
                    <p className="text-gray-400 text-sm lg:text-base">
                        Управление пользователями системы
                    </p>
                </div>

                {/* Поиск */}
                <div className="mb-6">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Поиск по username или ID..."
                            className="flex-1 p-3 lg:p-4 text-white bg-cgray-2 border border-cgray-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-sm lg:text-base"
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
                    <div className="mb-6 p-3 lg:p-4 bg-red-500/20 border border-red-500 rounded-lg">
                        <p className="text-red-400 text-sm lg:text-base">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="mt-2 text-red-400 hover:text-red-300 text-xs lg:text-sm"
                        >
                            Закрыть
                        </button>
                    </div>
                )}

                {/* Таблица пользователей - мобильная версия */}
                <div className="bg-cgray-2 border border-cgray-3 rounded-lg overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center p-8 text-gray-400 text-sm lg:text-base">
                            Пользователи не найдены
                        </div>
                    ) : (
                        <>
                            {/* Десктопная таблица */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                    <tr className="border-b border-cgray-3">
                                        <th className="text-left p-4 font-medium text-gray-400">Пользователь</th>
                                        <th className="text-left p-4 font-medium text-gray-400">ID</th>
                                        <th className="text-left p-4 font-medium text-gray-400">Роль</th>
                                        <th className="text-left p-4 font-medium text-gray-400">Поинты</th>
                                        <th className="text-left p-4 font-medium text-gray-400">Заблокирован</th>
                                        <th className="text-left p-4 font-medium text-gray-400">Дата регистрации</th>
                                        <th className="text-left p-4 font-medium text-gray-400">Верификация</th>
                                        <th className="text-left p-4 font-medium text-gray-400">Email подтвержден</th>
                                        <th className="text-left p-4 font-medium text-gray-400">Действия</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-b border-cgray-3 hover:bg-cgray-3/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/user/${user.id}`)}>
                                                    <div className="relative">
                                                        <Image
                                                            src={user.photo || '/default-avatar.png'}
                                                            alt={user.username}
                                                            width={40}
                                                            height={40}
                                                            className="rounded-full"
                                                        />
                                                        {user.verify ? (
                                                            <div className="absolute -top-1 -right-1">
                                                                <Image
                                                                    src="/verify.png"
                                                                    alt="Verified"
                                                                    width={16}
                                                                    height={16}
                                                                />
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">{user.username}</p>
                                                        <p className="text-sm text-gray-400 truncate max-w-32">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-300 font-mono text-sm">{user.id}</td>
                                            <td className="p-4">
                                                {(editingUser?.id === user.id) && (user.id !== currentAdmin.id) ? (
                                                    <select
                                                        value={editingUser.role}
                                                        onChange={(e) => handleInputChange('role', e.target.value)}
                                                        className={"p-2 bg-cgray-1 border border-cgray-3 rounded text-white focus:outline-none focus:border-blue-500 text-sm"}
                                                    >
                                                        <option value="Игрок">Игрок</option>
                                                        <option value="Креатор">Креатор</option>
                                                        <option value="Администратор">Администратор</option>
                                                    </select>
                                                ) : (
                                                    <span className={`px-2 py-1 rounded-lg border text-xs font-medium text-nowrap ${
                                                        user.role === 'Гл. Администратор'
                                                            ? 'bg-red-1/20 text-red-1'
                                                            : user.role === 'Администратор' ? 'bg-pink-1/20 text-pink-1'
                                                                : user.role === 'Креатор'
                                                                    ? 'bg-purple-1/20 text-purple-1'
                                                                    : 'bg-cyan-1/20 text-cyan-1'
                                                    }`}>
                                                      {user.role}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {editingUser?.id === user.id ? (
                                                    <input
                                                        type="number"
                                                        value={editingUser.points}
                                                        onChange={(e) => handleInputChange('points', parseInt(e.target.value) || 0)}
                                                        className="p-2 bg-cgray-1 border border-cgray-3 rounded text-white w-20 focus:outline-none focus:border-blue-500 text-sm"
                                                    />
                                                ) : (
                                                    <span className="font-medium">{user.points}</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                                                    user.isBlocked
                                                        ? 'bg-red-1/20 text-red-1 border-red-1'
                                                        : 'bg-green-1/20 text-green-1 border-green-1'
                                                }`}>
                                                    {user.isBlocked ? 'Да' : 'Нет'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-300 text-sm">
                                                {new Date(user.regDate).toLocaleDateString('ru-RU')}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                                                    user.verify
                                                        ? 'bg-green-1/20 text-green-1/70'
                                                        : 'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                  {user.verify ? 'Да' : 'Нет'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                                                    user.email_verified
                                                        ? 'bg-green-1/20 text-green-1/70'
                                                        : 'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                  {user.email_verified ? 'Да' : 'Нет'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-2">
                                                    {editingUser?.id === user.id ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={handleSave}
                                                                disabled={saving}
                                                                className="px-3 py-1 bg-green-1/70 hover:bg-green-1/50 rounded-lg text-sm transition-colors disabled:opacity-50"
                                                            >
                                                                {saving ? '...' : 'Сохранить'}
                                                            </button>
                                                            <button
                                                                onClick={handleCancel}
                                                                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                                                            >
                                                                Отмена
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleEdit(user)}
                                                            className="px-3 py-1 bg-cyan-1 hover:bg-cyan-1/70 rounded-lg text-sm transition-colors"
                                                        >
                                                            Редактировать
                                                        </button>
                                                    )}

                                                    {/* Кнопки блокировки/разблокировки */}
                                                    {user.id !== currentAdmin.id && (
                                                        <div className="flex gap-1">
                                                            {user.isBlocked ? (
                                                                <button
                                                                    onClick={() => handleBlockUser(user.id, false)}
                                                                    disabled={blocking === user.id}
                                                                    className="flex-1 px-2 py-1 bg-green-1/70 hover:bg-green-1/50 rounded-lg text-xs transition-colors disabled:opacity-50"
                                                                >
                                                                    {blocking === user.id ? '...' : 'Разблок.'}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleBlockUser(user.id, true)}
                                                                    disabled={blocking === user.id}
                                                                    className="flex-1 px-2 py-1 bg-red-1/70 hover:bg-red-1/50 rounded-lg text-xs transition-colors disabled:opacity-50"
                                                                >
                                                                    {blocking === user.id ? '...' : 'Заблок.'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Мобильная версия - карточки */}
                            <div className="lg:hidden space-y-3 p-3">
                                {users.map((user) => (
                                    <div key={user.id} className="bg-cgray-3 border border-cgray-4 rounded-lg p-4 space-y-3">
                                        {/* Заголовок карточки */}
                                        <div className="flex items-center justify-between">
                                            <div
                                                className="flex items-center gap-3 flex-1 cursor-pointer"
                                                onClick={() => router.push(`/user/${user.id}`)}
                                            >
                                                <div className="relative">
                                                    <Image
                                                        src={user.photo || '/default-avatar.png'}
                                                        alt={user.username}
                                                        width={48}
                                                        height={48}
                                                        className="rounded-full"
                                                    />
                                                    {user.verify && (
                                                        <div className="absolute -top-1 -right-1">
                                                            <Image
                                                                src="/verify.png"
                                                                alt="Verified"
                                                                width={16}
                                                                height={16}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-white truncate">{user.username}</p>
                                                    <p className="text-sm text-gray-400 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Основная информация */}
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-gray-400 text-xs">ID</p>
                                                <p className="text-gray-300 font-mono">{user.id}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-xs">Поинты</p>
                                                {editingUser?.id === user.id ? (
                                                    <input
                                                        type="number"
                                                        value={editingUser.points}
                                                        onChange={(e) => handleInputChange('points', parseInt(e.target.value) || 0)}
                                                        className="w-full p-1 bg-cgray-1 border border-cgray-4 rounded text-white focus:outline-none focus:border-blue-500 text-sm"
                                                    />
                                                ) : (
                                                    <p className="font-medium">{user.points}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Роль и блокировка */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-gray-400 text-xs mb-1">Роль</p>
                                                {(editingUser?.id === user.id) && (user.id !== currentAdmin.id) ? (
                                                    <select
                                                        value={editingUser.role}
                                                        onChange={(e) => handleInputChange('role', e.target.value)}
                                                        className="w-full p-2 bg-cgray-1 border border-cgray-4 rounded text-white focus:outline-none focus:border-blue-500 text-sm"
                                                    >
                                                        <option value="Игрок">Игрок</option>
                                                        <option value="Креатор">Креатор</option>
                                                        <option value="Администратор">Администратор</option>
                                                    </select>
                                                ) : (
                                                    <span className={`inline-block px-2 py-1 rounded-lg border text-xs font-medium ${
                                                        user.role === 'Гл. Администратор'
                                                            ? 'bg-red-1/20 text-red-1'
                                                            : user.role === 'Администратор' ? 'bg-pink-1/20 text-pink-1'
                                                                : user.role === 'Креатор'
                                                                    ? 'bg-purple-1/20 text-purple-1'
                                                                    : 'bg-cyan-1/20 text-cyan-1'
                                                    }`}>
                                                        {user.role}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-xs mb-1">Заблокирован</p>
                                                <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium border ${
                                                    user.isBlocked
                                                        ? 'bg-red-1/20 text-red-1 border-red-1'
                                                        : 'bg-green-1/20 text-green-1 border-green-1'
                                                }`}>
                                                    {user.isBlocked ? 'Да' : 'Нет'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Статусы */}
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-gray-400 text-xs">Верификация</p>
                                                <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium border mt-1 ${
                                                    user.verify
                                                        ? 'bg-green-1/20 text-green-1/70'
                                                        : 'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                    {user.verify ? 'Да' : 'Нет'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-xs">Email подтвержден</p>
                                                <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium border mt-1 ${
                                                    user.email_verified
                                                        ? 'bg-green-1/20 text-green-1/70'
                                                        : 'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                    {user.email_verified ? 'Да' : 'Нет'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Дата регистрации */}
                                        <div>
                                            <p className="text-gray-400 text-xs">Дата регистрации</p>
                                            <p className="text-gray-300 text-sm">
                                                {new Date(user.regDate).toLocaleDateString('ru-RU')}
                                            </p>
                                        </div>

                                        {/* Действия */}
                                        <div className="pt-2 space-y-2">
                                            {editingUser?.id === user.id ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleSave}
                                                        disabled={saving}
                                                        className="flex-1 px-3 py-2 bg-green-1/70 hover:bg-green-1/50 rounded-lg text-sm transition-colors disabled:opacity-50"
                                                    >
                                                        {saving ? '...' : 'Сохранить'}
                                                    </button>
                                                    <button
                                                        onClick={handleCancel}
                                                        className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                                                    >
                                                        Отмена
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="w-full px-3 py-2 bg-cyan-1 hover:bg-cyan-1/70 rounded-lg text-sm transition-colors"
                                                >
                                                    Редактировать
                                                </button>
                                            )}

                                            {/* Кнопки блокировки/разблокировки */}
                                            {user.id !== currentAdmin.id && (
                                                <div className="flex gap-2">
                                                    {user.isBlocked ? (
                                                        <button
                                                            onClick={() => handleBlockUser(user.id, false)}
                                                            disabled={blocking === user.id}
                                                            className="flex-1 px-3 py-2 bg-green-1/70 hover:bg-green-1/50 rounded-lg text-sm transition-colors disabled:opacity-50"
                                                        >
                                                            {blocking === user.id ? '...' : 'Разблокировать'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleBlockUser(user.id, true)}
                                                            disabled={blocking === user.id}
                                                            className="flex-1 px-3 py-2 bg-red-1/70 hover:bg-red-1/50 rounded-lg text-sm transition-colors disabled:opacity-50"
                                                        >
                                                            {blocking === user.id ? '...' : 'Заблокировать'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Пагинация */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-3 mt-6">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 bg-cgray-2 border border-cgray-2 rounded-lg hover:bg-cgray-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                        >
                            Назад
                        </button>

                        <span className="text-gray-400 text-sm lg:text-base">
                            Страница {currentPage} из {totalPages}
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