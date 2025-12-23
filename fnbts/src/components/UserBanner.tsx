// src/components/UserBanner.tsx
'use client';

import { useState, useEffect } from 'react';
import { useBannerStore } from '@/store/bannerStore';

interface UserBannerProps {
    userId: number;
    width?: number;
    height?: number;
    quality?: number;
    className?: string;
    alt?: string;
    fallback?: string;
}

export default function UserBanner({
                                      userId,
                                      width,
                                      height,
                                      quality = 80,
                                      className = 'object-cover',
                                      alt = 'User banner',
                                      fallback = '/default-avatar.png'
                                  }: UserBannerProps) {
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const { getVersion } = useBannerStore();
    const version = getVersion(userId.toString());
    useEffect(() => {
        let currentPhotoUrl: string | null = null;

        const fetchBanner = async () => {
            try {
                setLoading(true);
                setError(false);

                const params = new URLSearchParams();

                if (width) params.append('w', width.toString());
                if (height) params.append('h', height.toString());
                if (quality) params.append('q', quality.toString());
                params.append('v', version);

                const url = `/api/users/${userId}/banner${params.toString() ? `?${params.toString()}` : ''}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Cache-Control': 'no-cache',
                    },
                });

                if (!response.ok) {
                    setError(true);
                }
                if (response.status == 404) {
                    setError(false);
                    setPhotoUrl(null);
                    return;
                }
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                currentPhotoUrl = objectUrl;
                setPhotoUrl(objectUrl);
            } catch (err) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchBanner();
        }

        return () => {
            if (currentPhotoUrl) {
                URL.revokeObjectURL(currentPhotoUrl);
            }
        };
    }, [userId, width, height, quality, version]);

    if (loading) {
        return (
            <div
                className={`bg-cgray-2 animate-pulse ${className}`}
                style={width && height ? { width: `${width}px`, height: `${height}px` } : undefined}
            />
        );
    }

    if (error) {
        return null;
    }

    if (!photoUrl) {
        return null;
    }

    return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
            src={photoUrl}
            alt={alt}
            loading="eager"
            decoding="sync"
            className={className}
            style={width && height ? { width: `${width}px`, height: `${height}px` } : undefined}
            onError={() => setError(true)}
        />
    );
}