// src/components/UploadBannerForm.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAvatarStore } from '@/store/avatarStore';

interface UploadBannerFormProps {
    userId: string;
    onPhotoUploaded?: (photoUrl: string) => void;
}

interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface DragState {
    isDragging: boolean;
    startX: number;
    startY: number;
    originalCrop: CropArea;
    dragType: 'move' | 'resize-top-left' | 'resize-top-right' | 'resize-bottom-left' | 'resize-bottom-right';
}

export default function UploadBannerForm({ userId, onPhotoUploaded }: UploadBannerFormProps) {
    const [isChanging, setIsChanging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showCropModal, setShowCropModal] = useState(false);
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 400, height: 100 });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 500, height: 200 });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragStateRef = useRef<DragState>({
        isDragging: false,
        startX: 0,
        startY: 0,
        originalCrop: { x: 0, y: 0, width: 0, height: 0 },
        dragType: 'move'
    });

    const { updateVersion } = useAvatarStore();

    // Получение масштаба и смещения
    const getScaleAndOffset = useCallback(() => {
        if (!originalImage || !canvasRef.current) return { scale: 1, offsetX: 0, offsetY: 0 };

        const canvas = canvasRef.current;
        const scale = Math.min(canvas.width / originalImage.width, canvas.height / originalImage.height);
        const scaledWidth = originalImage.width * scale;
        const scaledHeight = originalImage.height * scale;
        const offsetX = (canvas.width - scaledWidth) / 2;
        const offsetY = (canvas.height - scaledHeight) / 2;

        return { scale, offsetX, offsetY };
    }, [originalImage]);

    // Проверка попадания в маркер
    const getDragType = useCallback((x: number, y: number): DragState['dragType'] => {
        const { scale } = getScaleAndOffset();
        const isMobile = window.innerWidth < 768;
        const cornerSize = isMobile ? 40 / scale : 20 / scale;

        const corners = [
            { x: cropArea.x, y: cropArea.y, type: 'resize-top-left' as const },
            { x: cropArea.x + cropArea.width, y: cropArea.y, type: 'resize-top-right' as const },
            { x: cropArea.x, y: cropArea.y + cropArea.height, type: 'resize-bottom-left' as const },
            { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height, type: 'resize-bottom-right' as const }
        ];

        for (const corner of corners) {
            if (x >= corner.x - cornerSize/2 && x <= corner.x + cornerSize/2 &&
                y >= corner.y - cornerSize/2 && y <= corner.y + cornerSize/2) {
                return corner.type;
            }
        }

        if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
            y >= cropArea.y && y <= cropArea.y + cropArea.height) {
            return 'move';
        }

        return 'move';
    }, [cropArea, getScaleAndOffset]);

    // Рисуем угловые маркеры
    const drawCornerMarkers = useCallback((ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, scale: number) => {
        ctx.setLineDash([]);
        const markerSize = window.innerWidth < 768 ? 20 : 16;
        const markerColor = '#ff6b35';

        const corners = [
            { x: cropArea.x, y: cropArea.y },
            { x: cropArea.x + cropArea.width, y: cropArea.y },
            { x: cropArea.x, y: cropArea.y + cropArea.height },
            { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height }
        ];

        corners.forEach((corner) => {
            ctx.fillStyle = 'rgba(255, 107, 53, 0.9)';

            const centerX = offsetX + corner.x * scale;
            const centerY = offsetY + corner.y * scale;

            ctx.beginPath();
            ctx.arc(centerX, centerY, markerSize/2, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = markerColor;
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }, [cropArea]);

    // Отрисовка изображения и области кадрирования
    const drawImageAndCropArea = useCallback(() => {
        if (!originalImage || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const scale = Math.min(canvas.width / originalImage.width, canvas.height / originalImage.height);
        const scaledWidth = originalImage.width * scale;
        const scaledHeight = originalImage.height * scale;
        const offsetX = (canvas.width - scaledWidth) / 2;
        const offsetY = (canvas.height - scaledHeight) / 2;

        ctx.drawImage(originalImage, offsetX, offsetY, scaledWidth, scaledHeight);

        // Затемнение вокруг
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Очищаем область кадрирования
        ctx.clearRect(
            offsetX + cropArea.x * scale,
            offsetY + cropArea.y * scale,
            cropArea.width * scale,
            cropArea.height * scale
        );

        // Рамка области кадрирования
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            offsetX + cropArea.x * scale,
            offsetY + cropArea.y * scale,
            cropArea.width * scale,
            cropArea.height * scale
        );

        // Угловые маркеры
        drawCornerMarkers(ctx, offsetX, offsetY, scale);
    }, [originalImage, cropArea, drawCornerMarkers]);

    // Определяем размер canvas
    useEffect(() => {
        const updateCanvasSize = () => {
            const isMobile = window.innerWidth < 768;

            if (!originalImage) {
                if (isMobile) {
                    setCanvasSize({ width: 350, height: 150 });
                } else {
                    setCanvasSize({ width: 600, height: 250 });
                }
                return;
            }

            const imageRatio = originalImage.width / originalImage.height;

            if (isMobile) {
                const maxWidth = Math.min(window.innerWidth * 0.92, 450);
                const maxHeight = Math.min(window.innerHeight * 0.4, 200);

                let canvasWidth, canvasHeight;

                if (imageRatio > 2) {
                    canvasWidth = maxWidth;
                    canvasHeight = maxWidth / imageRatio;
                } else {
                    canvasHeight = maxHeight;
                    canvasWidth = maxHeight * imageRatio;
                }

                setCanvasSize({
                    width: Math.round(canvasWidth),
                    height: Math.round(canvasHeight)
                });
            } else {
                const maxWidth = 700;
                const maxHeight = 300;

                let canvasWidth, canvasHeight;

                if (imageRatio > 3) {
                    canvasWidth = maxWidth;
                    canvasHeight = maxWidth / imageRatio;
                } else {
                    canvasHeight = maxHeight;
                    canvasWidth = maxHeight * imageRatio;
                }

                setCanvasSize({
                    width: Math.round(canvasWidth),
                    height: Math.round(canvasHeight)
                });
            }
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, [originalImage]);

    // Обновляем отрисовку
    useEffect(() => {
        if (showCropModal && originalImage) {
            drawImageAndCropArea();
        }
    }, [showCropModal, originalImage, cropArea, canvasSize, drawImageAndCropArea]);

    // Преобразование координат
    const getImageCoordinates = useCallback((clientX: number, clientY: number) => {
        const { scale, offsetX, offsetY } = getScaleAndOffset();
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const x = (clientX - rect.left - offsetX) / scale;
        const y = (clientY - rect.top - offsetY) / scale;

        return { x, y };
    }, [getScaleAndOffset]);

    // Обработка выбора файла
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError('Неподдерживаемый формат файла');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Файл слишком большой. Максимальный размер: 5MB');
            return;
        }

        setSelectedFile(file);
        await loadImageForCrop(file);
    };

    // Загрузка изображения для кадрирования
    const loadImageForCrop = (file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                setOriginalImage(img);
                setImageUrl(url);
                setShowCropModal(true);

                // Начальная область кадрирования - прямоугольник 4:1
                const targetRatio = 4;
                let cropWidth, cropHeight;

                if (img.width / img.height > targetRatio) {
                    cropHeight = img.height * 0.6;
                    cropWidth = cropHeight * targetRatio;
                } else {
                    cropWidth = img.width * 0.8;
                    cropHeight = cropWidth / targetRatio;
                }

                const x = (img.width - cropWidth) / 2;
                const y = (img.height - cropHeight) / 2;

                setCropArea({
                    x,
                    y,
                    width: cropWidth,
                    height: cropHeight
                });

                resolve();
            };

            img.onerror = () => {
                setError('Ошибка загрузки изображения');
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    };

    // Общая функция для обработки перемещения
    const handleDragMove = useCallback((deltaX: number, deltaY: number, dragType: DragState['dragType'], originalCrop: CropArea) => {
        if (!originalImage) return;

        if (dragType === 'move') {
            const newX = originalCrop.x + deltaX;
            const newY = originalCrop.y + deltaY;

            const maxX = originalImage.width - cropArea.width;
            const maxY = originalImage.height - cropArea.height;

            setCropArea(prev => ({
                ...prev,
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            }));
        } else {
            handleResizeDrag(deltaX, deltaY, dragType, originalCrop);
        }
    }, [originalImage, cropArea.width, cropArea.height]);

    // Обработка масштабирования прямоугольной области
    const handleResizeDrag = useCallback((deltaX: number, deltaY: number, dragType: DragState['dragType'], originalCrop: CropArea) => {
        if (!originalImage) return;

        const minWidth = 200;
        const targetRatio = 4; // Соотношение 4:1 для баннера

        let newX = originalCrop.x;
        let newY = originalCrop.y;
        let newWidth = originalCrop.width;
        let newHeight = originalCrop.height;

        switch (dragType) {
            case 'resize-top-left':
                newX = originalCrop.x + deltaX;
                newY = originalCrop.y + deltaY;
                newWidth = originalCrop.width - deltaX;
                newHeight = originalCrop.height - deltaY;
                break;
            case 'resize-top-right':
                newY = originalCrop.y + deltaY;
                newWidth = originalCrop.width + deltaX;
                newHeight = originalCrop.height - deltaY;
                break;
            case 'resize-bottom-left':
                newX = originalCrop.x + deltaX;
                newWidth = originalCrop.width - deltaX;
                newHeight = originalCrop.height + deltaY;
                break;
            case 'resize-bottom-right':
                newWidth = originalCrop.width + deltaX;
                newHeight = originalCrop.height + deltaY;
                break;
        }

        // Сохраняем соотношение сторон 4:1
        newHeight = newWidth / targetRatio;

        // Корректируем позицию при изменении размера
        if (dragType === 'resize-top-left') {
            newX = originalCrop.x + (originalCrop.width - newWidth);
            newY = originalCrop.y + (originalCrop.height - newHeight);
        } else if (dragType === 'resize-top-right') {
            newY = originalCrop.y + (originalCrop.height - newHeight);
        } else if (dragType === 'resize-bottom-left') {
            newX = originalCrop.x + (originalCrop.width - newWidth);
        }

        // Ограничиваем минимальные размеры
        if (newWidth < minWidth) {
            newWidth = minWidth;
            newHeight = newWidth / targetRatio;
            if (dragType === 'resize-top-left' || dragType === 'resize-bottom-left') {
                newX = originalCrop.x + (originalCrop.width - newWidth);
            }
        }

        // Ограничиваем в пределах изображения
        newX = Math.max(0, Math.min(newX, originalImage.width - newWidth));
        newY = Math.max(0, Math.min(newY, originalImage.height - newHeight));
        newWidth = Math.min(newWidth, originalImage.width - newX);
        newHeight = Math.min(newHeight, originalImage.height - newY);

        setCropArea({
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight
        });
    }, [originalImage]);

    // Обработка перемещения мыши
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragStateRef.current.isDragging || !originalImage) return;

        const { scale } = getScaleAndOffset();
        const deltaX = (e.clientX - dragStateRef.current.startX) / scale;
        const deltaY = (e.clientY - dragStateRef.current.startY) / scale;

        handleDragMove(deltaX, deltaY, dragStateRef.current.dragType, dragStateRef.current.originalCrop);
    }, [originalImage, getScaleAndOffset, handleDragMove]);

    // Обработка окончания перетаскивания
    const handleMouseUp = useCallback(() => {
        dragStateRef.current.isDragging = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    // Обработка начала перетаскивания
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!originalImage) return;

        const { x, y } = getImageCoordinates(e.clientX, e.clientY);
        const dragType = getDragType(x, y);

        if (dragType !== 'move' ||
            (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
                y >= cropArea.y && y <= cropArea.y + cropArea.height)) {

            dragStateRef.current = {
                isDragging: true,
                startX: e.clientX,
                startY: e.clientY,
                originalCrop: { ...cropArea },
                dragType
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    };

    // Touch handlers
    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!dragStateRef.current.isDragging || !originalImage) return;

        const touch = e.touches[0];
        const { scale } = getScaleAndOffset();
        const deltaX = (touch.clientX - dragStateRef.current.startX) / scale;
        const deltaY = (touch.clientY - dragStateRef.current.startY) / scale;

        handleDragMove(deltaX, deltaY, dragStateRef.current.dragType, dragStateRef.current.originalCrop);
        e.preventDefault();
    }, [originalImage, getScaleAndOffset, handleDragMove]);

    const handleTouchEnd = useCallback(() => {
        dragStateRef.current.isDragging = false;
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (!originalImage) return;

        const touch = e.touches[0];
        const { x, y } = getImageCoordinates(touch.clientX, touch.clientY);
        const dragType = getDragType(x, y);

        if (dragType !== 'move' ||
            (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
                y >= cropArea.y && y <= cropArea.y + cropArea.height)) {

            dragStateRef.current = {
                isDragging: true,
                startX: touch.clientX,
                startY: touch.clientY,
                originalCrop: { ...cropArea },
                dragType
            };

            e.preventDefault();
        }
    };

    // Изменение размера кнопками
    const handleCropResize = (delta: number) => {
        if (!originalImage) return;

        const targetRatio = 4;
        const minWidth = 200;
        const maxWidth = Math.min(originalImage.width, 1200);

        let newWidth = cropArea.width + delta;
        newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
        const newHeight = newWidth / targetRatio;

        const centerX = cropArea.x + cropArea.width / 2;
        const centerY = cropArea.y + cropArea.height / 2;

        const newX = centerX - newWidth / 2;
        const newY = centerY - newHeight / 2;

        const maxX = originalImage.width - newWidth;
        const maxY = originalImage.height - newHeight;

        setCropArea({
            width: newWidth,
            height: newHeight,
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY))
        });
    };

    // Обрезка и сохранение баннера
    const cropAndUploadImage = async () => {
        if (!originalImage || !selectedFile) return;

        setLoading(true);
        setShowCropModal(false);

        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1280; // Фиксированная ширина баннера
            canvas.height = 320; // Фиксированная высота баннера
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('Не удалось создать контекст canvas');
            }

            // Рисуем обрезанное изображение
            ctx.drawImage(
                originalImage,
                cropArea.x, cropArea.y, cropArea.width, cropArea.height,
                0, 0, 1280, 320
            );

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    throw new Error('Не удалось создать изображение');
                }

                const croppedFile = new File([blob], selectedFile.name, {
                    type: selectedFile.type,
                    lastModified: Date.now()
                });

                await uploadFile(croppedFile);

                if (imageUrl) {
                    URL.revokeObjectURL(imageUrl);
                }
            }, selectedFile.type, 0.9);

        } catch (err) {
            setError('Ошибка при обработке изображения');
            console.error('Crop error:', err);
            setLoading(false);

            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        }
    };

    // Загрузка файла на сервер
    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append('banner', file);
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setError('Требуется авторизация');
            return;
        }
        try {
            const response = await fetch(`/api/users/${userId}/banner`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                setMessage('Баннер успешно загружен!');
                updateVersion(userId);

                if (onPhotoUploaded) {
                    onPhotoUploaded(result.data.photoUrl);
                }
            } else {
                setError(result.error || 'Ошибка при загрузке баннера');
            }
        } catch (err) {
            setError('Ошибка сети');
            console.error('Upload error:', err);
        } finally {
            setLoading(false);
            setSelectedFile(null);
            setOriginalImage(null);
        }
    };

    // Отмена кадрирования
    const handleCancelCrop = () => {
        setShowCropModal(false);
        setSelectedFile(null);
        setOriginalImage(null);

        if (imageUrl) {
            URL.revokeObjectURL(imageUrl);
            setImageUrl('');
        }
    };

    // Добавляем обработчики для touch событий
    useEffect(() => {
        if (showCropModal) {
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);

            return () => {
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
            };
        }
    }, [showCropModal, handleTouchMove, handleTouchEnd]);

    const handleToggleChanging = () => {
        setIsChanging(!isChanging);
        setError('');
        setMessage('');
    };

    return (
        <>
            <div
                className={`fixed transition-all duration-300 z-50 ${
                    !isChanging
                        ? `w-94 lg:w-320 h-40 lg:h-80 hover:bg-cgray-1/70 hover:opacity-100 flex items-center justify-center text-center rounded-lg opacity-0`
                        : `w-11/12 lg:w-99 max-w-95vw lg:max-w-none max-h-64 p-3 lg:p-4 bg-cgray-1 border rounded-lg text-cwhite-1 opacity-100 lg:translate-x-170 lg:translate-y-30 overflow-hidden left-1/2 lg:left-auto transform -translate-x-1/2 top-1/2 lg:top-auto -translate-y-1/2`
                } flex`}
                onClick={() => !isChanging && handleToggleChanging()}
            >
                <p className={`transition-all overflow-hidden text-xs lg:text-sm ${
                    !isChanging
                        ? 'max-h-6 lg:max-h-24 w-full ml-100 opacity-100'
                        : 'max-h-0 max-w-0 opacity-0'
                }`}>
                    Изменить баннер
                </p>

                <div className={`flex flex-col overflow-hidden w-full ${
                    isChanging
                        ? 'max-h-48 opacity-100'
                        : 'max-h-0 opacity-0'
                }`}>
                    <div className="flex justify-between items-center mb-2 lg:mb-3">
                        <h3 className="text-sm lg:text-lg font-semibold text-nowrap truncate max-w-40 lg:max-w-none">
                            Загрузить баннер профиля
                        </h3>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggleChanging();
                            }}
                            className="text-red-1 hover:text-red-2/50 transition-all text-lg lg:text-xl flex-shrink-0 ml-2"
                        >
                            ✕
                        </button>
                    </div>

                    <input
                        type="file"
                        accept="image/jpeg, image/jpg, image/png, image/webp"
                        onChange={handleFileSelect}
                        disabled={loading}
                        className="block w-full text-xs lg:text-sm file:rounded-lg file:mr-2 lg:file:mr-4 file:py-1 lg:file:py-2 file:px-2 lg:file:px-4 file:border file:text-xs lg:file:text-sm file:font-semibold file:bg-cgray-2 file:text-cwhite-1 hover:file:bg-cgray-1 file:transition-colors"
                    />

                    <p className="text-xs mt-1 lg:mt-2 text-gray-300 leading-relaxed">
                        Поддерживаемые форматы: JPEG, PNG, WebP.<br/>
                        Максимальный размер: 5MB.<br/>
                        Рекомендуемое разрешение: 1280x320
                    </p>

                    {loading && (
                        <div className="mt-1 lg:mt-2 text-cwhite-1/50 text-xs lg:text-sm">Загрузка...</div>
                    )}

                    {message && (
                        <div className="mt-1 lg:mt-2 p-1 lg:p-2 bg-cwhite-1 border text-green-1 w-full rounded-lg text-xs lg:text-sm">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="mt-1 lg:mt-2 p-1 lg:p-2 bg-cwhite-1 border text-red-1 w-full rounded-lg text-xs lg:text-sm">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Модальное окно кадрирования баннера */}
            {showCropModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-cgray-1 rounded-lg p-3 sm:p-4 lg:p-6 w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-auto mx-2">
                        <div className="flex justify-between items-center mb-3 sm:mb-4">
                            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-cwhite-1">
                                Обрежьте баннер
                            </h3>
                            <button
                                onClick={handleCancelCrop}
                                className="text-red-1 hover:text-red-2/50 text-lg sm:text-xl lg:text-2xl flex-shrink-0 ml-2"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 lg:gap-8">
                            <div className="flex-1">
                                <div className="bg-cgray-2 rounded-lg p-4 sm:p-5 flex justify-center items-center">
                                    <div
                                        ref={containerRef}
                                        className="relative bg-cgray-3 rounded-lg overflow-hidden flex justify-center items-center"
                                        onMouseDown={handleMouseDown}
                                        onTouchStart={handleTouchStart}
                                        style={{
                                            minHeight: '200px',
                                            minWidth: '300px',
                                            maxWidth: '100%'
                                        }}
                                    >
                                        <canvas
                                            ref={canvasRef}
                                            width={canvasSize.width}
                                            height={canvasSize.height}
                                            className="max-w-full max-h-full cursor-move bg-transparent touch-none"
                                            style={{
                                                userSelect: 'none',
                                                aspectRatio: originalImage ? `${originalImage.width}/${originalImage.height}` : '4'
                                            }}
                                        />
                                        {!originalImage && (
                                            <div className="absolute inset-0 flex items-center justify-center text-cwhite-1 text-sm sm:text-base">
                                                Загрузка изображения...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-3 sm:gap-4 mt-4 sm:mt-5">
                                    <div className="flex gap-3 sm:gap-4 flex-wrap justify-center w-full max-w-md">
                                        <button
                                            onClick={() => handleCropResize(-50)}
                                            className="px-4 sm:px-5 py-3 bg-cgray-2 text-cwhite-1 rounded-lg hover:bg-cgray-3 active:bg-cgray-4 transition-colors text-sm sm:text-base flex-1 sm:flex-none min-w-[120px] touch-manipulation font-medium"
                                        >
                                            📉 Уменьшить
                                        </button>
                                        <button
                                            onClick={() => handleCropResize(50)}
                                            className="px-4 sm:px-5 py-3 bg-cgray-2 text-cwhite-1 rounded-lg hover:bg-cgray-3 active:bg-cgray-4 transition-colors text-sm sm:text-base flex-1 sm:flex-none min-w-[120px] touch-manipulation font-medium"
                                        >
                                            📈 Увеличить
                                        </button>
                                    </div>
                                    <span className="text-cwhite-1 text-sm sm:text-base text-center font-medium">
                                        Размер: {Math.round(cropArea.width)}×{Math.round(cropArea.height)}px
                                    </span>
                                    <div className="text-cgray-4 text-xs sm:text-sm text-center max-w-md">
                                        <p className="text-green-400 font-semibold">
                                            👆 Тяните за оранжевые кружки по углам
                                        </p>
                                        <p>Соотношение сторон: 4:1 (широкий формат)</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 xl:w-80 lg:mt-0">
                                <div className="bg-cgray-2 rounded-lg p-4 sm:p-5">
                                    <div className="text-cwhite-1 text-sm sm:text-base">
                                        <p className="font-semibold mb-3 text-base sm:text-lg">
                                            Управление баннером
                                        </p>
                                        <ul className="space-y-2 sm:space-y-3 text-sm">
                                            <li className="flex items-start gap-2">
                                                <span className="text-green-400">•</span>
                                                <span>Перетащите <strong>центр</strong> для перемещения</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-orange-400">•</span>
                                                <span>Тяните <strong>оранжевые углы</strong> для масштабирования</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-blue-400">•</span>
                                                <span>Соотношение <strong>4:1</strong> сохраняется автоматически</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-purple-400">•</span>
                                                <span>Результат: <strong>1280×320px</strong></span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={cropAndUploadImage}
                                        disabled={loading}
                                        className="px-4 py-3 bg-green-1 text-cwhite-1 rounded-lg hover:bg-green-2 active:bg-green-3 transition-colors disabled:opacity-50 text-sm sm:text-base touch-manipulation font-semibold flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <span className="animate-spin">⏳</span>
                                                Загрузка...
                                            </>
                                        ) : (
                                            <>
                                                <span>✅</span>
                                                Сохранить баннер
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleCancelCrop}
                                        disabled={loading}
                                        className="px-4 py-3 bg-red-1 text-cwhite-1 rounded-lg hover:bg-red-2 active:bg-red-3 transition-colors disabled:opacity-50 text-sm sm:text-base touch-manipulation font-medium flex items-center justify-center gap-2"
                                    >
                                        <span>❌</span>
                                        Отмена
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}