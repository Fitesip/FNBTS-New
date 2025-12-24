// src/components/AdminNavigation.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {useAuth} from "@/context/AuthContext";

export default function AdminNavigation() {
    const pathname = usePathname()
    const { user } = useAuth()

    const navItems = [
        { href: `/user/${user?.id}/admin-panel`, label: 'Пользователи' },
        { href: `/user/${user?.id}/admin-panel/transactions`, label: 'Транзакции' },
    ]

    return (
        <nav className="bg-cgray-2 bg-filter border border-cgray-2 rounded-lg mb-2 p-4 mt-5">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-bold text-white">Админ-панель</h1>
                    <div className="flex gap-4">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    pathname === item.href
                                        ? 'bg-cyan-1 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-cgray-2'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    )
}