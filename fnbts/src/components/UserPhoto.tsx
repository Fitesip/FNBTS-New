// src/components/UserPhoto.tsx
'use client';

import {useUserAvatar} from '@/hooks/useUserAvatar';
import {memo} from 'react';

interface UserPhotoProps {
    userId?: number,
    username?: string,
    width?: number,
    height?: number,
    className?: string,
    alt?: string,
    fallback?: string,
    withUsername?: boolean,
    onClick?: () => void,
}

const UserPhoto = memo(function UserPhoto({
                                              userId,
                                              username,
                                              width,
                                              height,
                                              className = '',
                                              alt = 'User avatar',
                                              fallback = '/default-avatar.png',
                                              withUsername = false,
                                              onClick
                                          }: UserPhotoProps) {
    const {avatarUrl, loading, error} = useUserAvatar(userId, username);

    const displayUrl = error ? fallback : (avatarUrl || fallback);
    const displayAlt = alt || `Avatar ${username || userId || 'user'}`;

    // Добавляем cache busting для fallback
    const finalDisplayUrl = displayUrl.includes('?')
        ? displayUrl
        : `${displayUrl}?t=${Math.floor(Date.now() / 60000)}`;

    if (loading) {
        return (
            <div className={`flex items-center gap-3 ${className}`}>
                <div
                    className={`bg-cgray-2 animate-pulse rounded-full ${className}`}
                    style={width && height ? {width: `${width}px`, height: `${height}px`} : undefined}
                />
                {withUsername && (
                    <div className="bg-cgray-2 animate-pulse h-4 w-20 rounded"></div>
                )}
            </div>
        );
    }

    // Если произошла ошибка или нет аватарки, показываем инициалы
    if (error || !avatarUrl) {
        return (
            <div className={`flex items-center gap-3 ${className}`}>
                <img
                    src={'/default-avatar.png'}
                    alt={displayAlt}
                    loading="lazy"
                    decoding="async"
                    className={`rounded-full object-cover ${className}`}
                    style={width && height ? {width: `${width}px`, height: `${height}px`} : undefined}
                    onError={(e) => {
                        // При ошибке загрузки заменяем на инициалы в следующем рендере
                        console.warn('Failed to load avatar:', finalDisplayUrl);
                    }}
                />
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={finalDisplayUrl}
                alt={displayAlt}
                loading="lazy"
                decoding="async"
                className={`rounded-full object-cover ${className}`}
                style={width && height ? {width: `${width}px`, height: `${height}px`} : undefined}
                onError={(e) => {
                    // При ошибке загрузки заменяем на инициалы в следующем рендере
                    console.warn('Failed to load avatar:', finalDisplayUrl);
                }}
            />
        </div>
    );
});

export default UserPhoto;