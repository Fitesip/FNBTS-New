// src/app/admin/layout.tsx
import AdminNavigation from '@/components/AdminNavigation'

export default function AdminLayout({
                                        children,
                                    }: {
    children: React.ReactNode
}) {
    return (
        <div className="z-40">
            <AdminNavigation />
            {children}
        </div>
    )
}