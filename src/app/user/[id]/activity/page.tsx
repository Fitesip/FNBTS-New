'use client'
import { ActivityChart } from "@/components/ActivityChart";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {useEffect} from "react";

export default function ActivityPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const currentUser = params.id;

    useEffect(() => {
        document.title = 'Активность | ФНБТС';

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Просмотр активности пользователя на ФНБТС.');
        } else {
            const newMeta = document.createElement('meta');
            newMeta.name = 'description';
            newMeta.content = 'Просмотр активности пользователя на ФНБТС.';
            document.head.appendChild(newMeta);
        }
    }, []);

    useEffect(() => {
        if (user && user.id !== parseInt(currentUser?.toString() as string)) {
            router.push(`/user/${user.id}/activity`);
        }
    }, [user]);

    if (!user) {
        return (
            <div className="p-4 lg:p-6 mt-5 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter mx-4 lg:mx-0">
                <div className="text-center py-6 lg:py-8">
                    <p className="mb-4 text-sm lg:text-base">Для доступа к просмотру активности необходимо авторизоваться</p>
                    <button
                        onClick={() => router.push(`/auth/login?redirect=/user/0/activity`)}
                        className="p-3 lg:p-4 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg bg-filter hover:bg-cgray-1 hover:scale-95 transition-all text-sm lg:text-base"
                    >
                        Войти
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <ActivityChart
                userId={user.id.toString()}
                username={user.username}
            />
        </>
    )
}