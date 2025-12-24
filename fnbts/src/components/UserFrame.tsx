// src/components/UserPhoto.tsx
'use client';

import { useState, useEffect } from 'react';
import { useFrameStore } from '@/store/frameStore';

interface UserFrameProps {
    userId: number;
    width?: number;
    height?: number;
    quality?: number;
    className?: string;
    alt?: string;
}

export default function UserFrame({
                                      userId,
                                      width,
                                      height,
                                      quality = 80,
                                      className = 'size-55 object-cover',
                                      alt = 'User frame',
                                  }: UserFrameProps) {
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const { getVersion } = useFrameStore();
    const version = getVersion(userId.toString());

    useEffect(() => {
        let objectUrl: string | null = null;

        const fetchPhoto = async () => {
            try {
                setLoading(true);
                setError(false);

                const params = new URLSearchParams();

                if (width) params.append('w', width.toString());
                if (height) params.append('h', height.toString());
                if (quality) params.append('q', quality.toString());
                params.append('v', version);

                const url = `/api/users/${userId}/frame${params.toString() ? `?${params.toString()}` : ''}`;

                const response = await fetch(url, {
                    headers: {
                        'Cache-Control': 'no-cache',
                    },
                });

                if (!response.ok) {
                    throw new Error(`${response.status}, ${response.statusText}`);
                }

                const blob = await response.blob();
                objectUrl = URL.createObjectURL(blob);
                setPhotoUrl(objectUrl);

            } catch (err) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchPhoto();
        }

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [userId, width, height, quality, version]); // Убрал photoUrl из зависимостей

    if (loading) {
        return (
            <div
                className={`bg-cgray-2 animate-pulse rounded-full ${className}`}
                style={width && height ? { width: `${width}px`, height: `${height}px` } : undefined}
            />
        );
    }

    if (error || !photoUrl) {
        return null;
    }

    return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
            src={photoUrl}
            alt={alt}
            className={className}
            style={width && height ? { width: `${width}px`, height: `${height}px` } : undefined}
            onError={() => setError(true)}
        />
    );
}