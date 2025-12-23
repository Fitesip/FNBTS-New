// src/components/UploadPhotoForm.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAvatarStore } from '@/store/avatarStore';
import {clearAvatarCache, notifyAvatarUpdate} from "@/hooks/useUserAvatar";

interface UploadPhotoFormProps {
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
    dragType: 'move' | 'resize-top-left' | 'resize-top-right' | 'resize-bottom-left' | 'resize-bottom-right' | 'resize-edge';
}

export default function UploadPhotoForm({ userId, onPhotoUploaded }: UploadPhotoFormProps) {
    const [isChanging, setIsChanging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showCropModal, setShowCropModal] = useState(false);
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isPortrait, setIsPortrait] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });
    const [activeControl, setActiveControl] = useState<string | null>(null);

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

    // Получение масштаба и смещения для преобразования координат
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

    // Преобразование координат мыши в координаты изображения
    const getImageCoordinates = useCallback((clientX: number, clientY: number) => {
        const { scale, offsetX, offsetY } = getScaleAndOffset();
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const x = (clientX - rect.left - offsetX) / scale;
        const y = (clientY - rect.top - offsetY) / scale;

        return { x, y };
    }, [getScaleAndOffset]);

    // Проверка попадания точки в маркер (увеличенные зоны для мобильных)
    const getDragType = useCallback((x: number, y: number): DragState['dragType'] => {
        const { scale } = getScaleAndOffset();
        const isMobile = window.innerWidth < 768;
        const cornerSize = isMobile ? 40 / scale : 20 / scale; // Увеличиваем зоны на мобильных
        const edgeSize = isMobile ? 30 / scale : 15 / scale; // Зоны для краев

        // Проверяем углы (приоритет)
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

        // Проверяем края для масштабирования
        if (x >= cropArea.x - edgeSize && x <= cropArea.x + edgeSize &&
            y >= cropArea.y && y <= cropArea.y + cropArea.height) {
            return 'resize-edge'; // Левый край
        }
        if (x >= cropArea.x + cropArea.width - edgeSize && x <= cropArea.x + cropArea.width + edgeSize &&
            y >= cropArea.y && y <= cropArea.y + cropArea.height) {
            return 'resize-edge'; // Правый край
        }
        if (y >= cropArea.y - edgeSize && y <= cropArea.y + edgeSize &&
            x >= cropArea.x && x <= cropArea.x + cropArea.width) {
            return 'resize-edge'; // Верхний край
        }
        if (y >= cropArea.y + cropArea.height - edgeSize && y <= cropArea.y + cropArea.height + edgeSize &&
            x >= cropArea.x && x <= cropArea.x + cropArea.width) {
            return 'resize-edge'; // Нижний край
        }

        // Если кликнули внутри области - перемещение
        if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
            y >= cropArea.y && y <= cropArea.y + cropArea.height) {
            return 'move';
        }

        return 'move';
    }, [cropArea, getScaleAndOffset]);

    // Рисуем угловые маркеры
    const drawCornerMarkers = useCallback((ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, scale: number, isMobile: boolean) => {
        ctx.setLineDash([]);
        const markerSize = isMobile ? 24 : 16; // Увеличиваем маркеры на мобильных
        const markerColor = '#333333';

        const corners = [
            { x: cropArea.x, y: cropArea.y, type: 'resize-top-left' },
            { x: cropArea.x + cropArea.width, y: cropArea.y, type: 'resize-top-right' },
            { x: cropArea.x, y: cropArea.y + cropArea.height, type: 'resize-bottom-left' },
            { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height, type: 'resize-bottom-right' }
        ];

        corners.forEach((corner) => {
            // Большие маркеры с градиентом для лучшей видимости
            ctx.fillStyle = 'rgba(33, 33, 33, 1)';

            // Рисуем круглые маркеры вместо квадратных (легче попасть)
            const centerX = offsetX + corner.x * scale;
            const centerY = offsetY + corner.y * scale;

            ctx.beginPath();
            ctx.arc(centerX, centerY, markerSize/2, 0, Math.PI * 2);
            ctx.fill();

            // Обводка
            ctx.strokeStyle = markerColor;
            ctx.lineWidth = isMobile ? 3 : 2;
            ctx.stroke();
        });
    }, [cropArea]);

    // Вертикальная рамка (для портретных фото и мобильных)
    const drawVerticalCropArea = useCallback((ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, scale: number) => {
        const isMobile = window.innerWidth < 768;

        // Основная рамка
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = isMobile ? 2 : 3;
        ctx.setLineDash([]);

        ctx.strokeRect(
            offsetX + cropArea.x * scale,
            offsetY + cropArea.y * scale,
            cropArea.width * scale,
            cropArea.height * scale
        );

        // Дополнительная подсветка активного элемента
        if (activeControl) {
            switch (activeControl) {
                case 'resize-top-left':
                    ctx.strokeRect(
                        offsetX + cropArea.x * scale - 5,
                        offsetY + cropArea.y * scale - 5,
                        20, 20
                    );
                    break;
                case 'resize-top-right':
                    ctx.strokeRect(
                        offsetX + (cropArea.x + cropArea.width) * scale - 15,
                        offsetY + cropArea.y * scale - 5,
                        20, 20
                    );
                    break;
                case 'resize-bottom-left':
                    ctx.strokeRect(
                        offsetX + cropArea.x * scale - 5,
                        offsetY + (cropArea.y + cropArea.height) * scale - 15,
                        20, 20
                    );
                    break;
                case 'resize-bottom-right':
                    ctx.strokeRect(
                        offsetX + (cropArea.x + cropArea.width) * scale - 15,
                        offsetY + (cropArea.y + cropArea.height) * scale - 15,
                        20, 20
                    );
                    break;
            }
        }

        drawCornerMarkers(ctx, offsetX, offsetY, scale, true);
    }, [cropArea, activeControl, drawCornerMarkers]);

    // Горизонтальная рамка (для альбомных фото на десктопе)
    const drawHorizontalCropArea = useCallback((ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, scale: number) => {
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(
            offsetX + cropArea.x * scale,
            offsetY + cropArea.y * scale,
            cropArea.width * scale,
            cropArea.height * scale
        );

        drawCornerMarkers(ctx, offsetX, offsetY, scale, false);
    }, [cropArea, drawCornerMarkers]);

    // Рисуем адаптивную область кадрирования
    const drawAdaptiveCropArea = useCallback((ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, scale: number) => {
        const isMobile = window.innerWidth < 768;

        if (isPortrait || isMobile) {
            drawVerticalCropArea(ctx, offsetX, offsetY, scale);
        } else {
            drawHorizontalCropArea(ctx, offsetX, offsetY, scale);
        }
    }, [isPortrait, drawVerticalCropArea, drawHorizontalCropArea]);

    // Отрисовка изображения и области кадрирования
    const drawImageAndCropArea = useCallback(() => {
        if (!originalImage || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Рассчитываем масштаб чтобы изображение вписывалось в canvas с сохранением пропорций
        const scale = Math.min(
            canvas.width / originalImage.width,
            canvas.height / originalImage.height
        );

        const scaledWidth = originalImage.width * scale;
        const scaledHeight = originalImage.height * scale;
        const offsetX = (canvas.width - scaledWidth) / 2;
        const offsetY = (canvas.height - scaledHeight) / 2;

        // Рисуем изображение с правильными пропорциями
        ctx.drawImage(originalImage, offsetX, offsetY, scaledWidth, scaledHeight);
        drawAdaptiveCropArea(ctx, offsetX, offsetY, scale);
    }, [originalImage, drawAdaptiveCropArea]);

    // Обновляем отрисовку при изменении
    useEffect(() => {
        if (showCropModal && originalImage) {
            drawImageAndCropArea();
        }
    }, [showCropModal, originalImage, cropArea, canvasSize, isPortrait, activeControl, drawImageAndCropArea]);

    // Определяем размер canvas в зависимости от устройства и ориентации
    useEffect(() => {
        const updateCanvasSize = () => {
            const isMobile = window.innerWidth < 768;

            if (!originalImage) {
                // Если изображение еще не загружено, используем стандартные размеры
                if (isMobile) {
                    setCanvasSize({ width: 350, height: 350 });
                } else {
                    setCanvasSize({ width: 500, height: 400 });
                }
                return;
            }

            const imageRatio = originalImage.width / originalImage.height;

            if (isMobile) {
                // На мобильных - рассчитываем размеры на основе оригинальных пропорций
                const maxWidth = Math.min(window.innerWidth * 0.92, 450);
                const maxHeight = Math.min(window.innerHeight * 0.6, 400);

                let canvasWidth, canvasHeight;

                if (imageRatio > 1) {
                    // Горизонтальное изображение (альбомная ориентация)
                    canvasWidth = maxWidth;
                    canvasHeight = maxWidth / imageRatio;
                    // Если высота получилась слишком большой, ограничиваем
                    if (canvasHeight > maxHeight) {
                        canvasHeight = maxHeight;
                        canvasWidth = maxHeight * imageRatio;
                    }
                } else {
                    // Вертикальное изображение (портретная ориентация)
                    canvasHeight = maxHeight;
                    canvasWidth = maxHeight * imageRatio;
                    // Если ширина получилась слишком большой, ограничиваем
                    if (canvasWidth > maxWidth) {
                        canvasWidth = maxWidth;
                        canvasHeight = maxWidth / imageRatio;
                    }
                }

                setCanvasSize({
                    width: Math.round(canvasWidth),
                    height: Math.round(canvasHeight)
                });
            } else {
                // На десктопах - адаптивные размеры с учетом пропорций
                const maxWidth = 800;
                const maxHeight = 600;

                let canvasWidth, canvasHeight;

                if (imageRatio > 1.2) {
                    // Широкие горизонтальные изображения
                    canvasWidth = maxWidth;
                    canvasHeight = maxWidth / imageRatio;
                } else if (imageRatio < 0.8) {
                    // Высокие вертикальные изображения
                    canvasHeight = maxHeight;
                    canvasWidth = maxHeight * imageRatio;
                } else {
                    // Квадратные или близкие к квадрату
                    if (imageRatio > 1) {
                        // Горизонтальные квадратные
                        canvasWidth = 550;
                        canvasHeight = 550 / imageRatio;
                    } else {
                        // Вертикальные квадратные
                        canvasHeight = 450;
                        canvasWidth = 450 * imageRatio;
                    }
                }

                // Ограничиваем максимальные размеры
                canvasWidth = Math.min(canvasWidth, maxWidth);
                canvasHeight = Math.min(canvasHeight, maxHeight);

                // Обеспечиваем минимальные размеры
                canvasWidth = Math.max(canvasWidth, 400);
                canvasHeight = Math.max(canvasHeight, 300);

                setCanvasSize({
                    width: Math.round(canvasWidth),
                    height: Math.round(canvasHeight)
                });
            }
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, [isPortrait, originalImage]);

    // Обработка перемещения мыши
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragStateRef.current.isDragging || !originalImage) return;

        const { scale } = getScaleAndOffset();
        const deltaX = (e.clientX - dragStateRef.current.startX) / scale;
        const deltaY = (e.clientY - dragStateRef.current.startY) / scale;

        handleDragMove(deltaX, deltaY, dragStateRef.current.dragType, dragStateRef.current.originalCrop);
    }, [originalImage, getScaleAndOffset]);

    // Обработка окончания перетаскивания мышью
    const handleMouseUp = useCallback(() => {
        dragStateRef.current.isDragging = false;
        setActiveControl(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    // Touch handlers для мобильных устройств
    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!dragStateRef.current.isDragging || !originalImage) return;

        const touch = e.touches[0];
        const { scale } = getScaleAndOffset();
        const deltaX = (touch.clientX - dragStateRef.current.startX) / scale;
        const deltaY = (touch.clientY - dragStateRef.current.startY) / scale;

        handleDragMove(deltaX, deltaY, dragStateRef.current.dragType, dragStateRef.current.originalCrop);
        e.preventDefault();
    }, [originalImage, getScaleAndOffset]);

    const handleTouchEnd = useCallback(() => {
        dragStateRef.current.isDragging = false;
        setActiveControl(null);
    }, []);

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

    // Обработка масштабирования
    const handleResizeDrag = useCallback((deltaX: number, deltaY: number, dragType: DragState['dragType'], originalCrop: CropArea) => {
        if (!originalImage) return;

        let newX = originalCrop.x;
        let newY = originalCrop.y;
        let newWidth = originalCrop.width;
        let newHeight = originalCrop.height;

        switch (dragType) {
            case 'resize-top-left':
                // При движении вниз-вправо - увеличиваем, вверх-влево - уменьшаем
                newX = originalCrop.x + deltaX;
                newY = originalCrop.y + deltaY;
                newWidth = originalCrop.width - deltaX;
                newHeight = originalCrop.height - deltaY;
                break;
            case 'resize-top-right':
                // При движении вниз-вправо - увеличиваем, вверх-влево - уменьшаем
                newY = originalCrop.y + deltaY;
                newWidth = originalCrop.width + deltaX;
                newHeight = originalCrop.height - deltaY;
                break;
            case 'resize-bottom-left':
                // При движении вниз-вправо - увеличиваем, вверх-влево - уменьшаем
                newX = originalCrop.x + deltaX;
                newWidth = originalCrop.width - deltaX;
                newHeight = originalCrop.height + deltaY;
                break;
            case 'resize-bottom-right':
                // При движении вниз-вправо - увеличиваем, вверх-влево - уменьшаем
                newWidth = originalCrop.width + deltaX;
                newHeight = originalCrop.height + deltaY;
                break;
            case 'resize-edge':
                // Упрощенное масштабирование со всех сторон
                newX = originalCrop.x - deltaX/2;
                newY = originalCrop.y - deltaY/2;
                newWidth = originalCrop.width + deltaX;
                newHeight = originalCrop.height + deltaY;
                break;
        }

        const minSize = 80;

        // Корректируем размер если он стал меньше минимального
        if (newWidth < minSize) {
            const widthDiff = minSize - newWidth;
            newWidth = minSize;

            // Корректируем позицию для левых маркеров
            if (dragType === 'resize-top-left' || dragType === 'resize-bottom-left') {
                newX -= widthDiff;
            }
        }

        if (newHeight < minSize) {
            const heightDiff = minSize - newHeight;
            newHeight = minSize;

            // Корректируем позицию для верхних маркеров
            if (dragType === 'resize-top-left' || dragType === 'resize-top-right') {
                newY -= heightDiff;
            }
        }

        // Ограничиваем в пределах изображения
        newX = Math.max(0, Math.min(newX, originalImage.width - newWidth));
        newY = Math.max(0, Math.min(newY, originalImage.height - newHeight));
        newWidth = Math.min(newWidth, originalImage.width - newX);
        newHeight = Math.min(newHeight, originalImage.height - newY);

        // Сохраняем квадратную форму
        const newSize = Math.min(newWidth, newHeight);

        // Корректируем позицию при изменении размера для сохранения квадратной формы
        if (dragType === 'resize-top-left') {
            newX = originalCrop.x + (originalCrop.width - newSize);
            newY = originalCrop.y + (originalCrop.height - newSize);
        } else if (dragType === 'resize-top-right') {
            newY = originalCrop.y + (originalCrop.height - newSize);
        } else if (dragType === 'resize-bottom-left') {
            newX = originalCrop.x + (originalCrop.width - newSize);
        }

        setCropArea({
            x: Math.max(0, newX),
            y: Math.max(0, newY),
            width: newSize,
            height: newSize
        });
    }, [originalImage]);

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
                const portrait = img.height > img.width;
                setIsPortrait(portrait);

                setOriginalImage(img);
                setImageUrl(url);
                setShowCropModal(true);

                // Установка начальной области кадрирования с учетом пропорций
                const minSize = Math.min(img.width, img.height, 250);
                const x = (img.width - minSize) / 2;
                const y = (img.height - minSize) / 2;

                setCropArea({
                    x,
                    y,
                    width: minSize,
                    height: minSize
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

    // Обработка начала перетаскивания мышью
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

            setActiveControl(dragType);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    };

    // Touch handlers для мобильных устройств
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

            setActiveControl(dragType);
            e.preventDefault();
        }
    };

    // Изменение размера области кадрирования кнопками
    const handleCropResize = (delta: number) => {
        if (!originalImage) return;

        const newSize = Math.max(80, Math.min( // Увеличиваем минимальный размер
            cropArea.width + delta,
            Math.min(originalImage.width, originalImage.height, 500)
        ));

        const centerX = cropArea.x + cropArea.width / 2;
        const centerY = cropArea.y + cropArea.height / 2;

        const newX = centerX - newSize / 2;
        const newY = centerY - newSize / 2;

        const maxX = originalImage.width - newSize;
        const maxY = originalImage.height - newSize;

        setCropArea({
            width: newSize,
            height: newSize,
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY))
        });
    };

    // Обрезка и сохранение изображения
    const cropAndUploadImage = async () => {
        if (!originalImage || !selectedFile) return;

        setLoading(true);
        setShowCropModal(false);

        try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('Не удалось создать контекст canvas');
            }

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 200, 200);

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(
                originalImage,
                cropArea.x, cropArea.y, cropArea.width, cropArea.height,
                0, 0, 200, 200
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
            }, selectedFile.type, 0.95);

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
        formData.append('photo', file);
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setError('Требуется авторизация');
            return;
        }
        try {
            const response = await fetch(`/api/users/${userId}/avatar`, {
                method: 'POST',
                headers: {
                    'authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                setMessage('Изображение успешно загружено!');

                // УВЕДОМЛЯЕМ ОБ ОБНОВЛЕНИИ АВАТАРА
                notifyAvatarUpdate(parseInt(userId));

                // Вызов колбэка для родительского компонента
                if (onPhotoUploaded) {
                    onPhotoUploaded(result.data.photoUrl);
                }
            } else {
                setError(result.error || 'Ошибка при загрузке изображения');
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

    const handleToggleChanging = () => {
        setIsChanging(!isChanging);
        setError('');
        setMessage('');
    };

    return (
        <>
            <div
                className={`fixed transition-all duration-300 z-40 ${
                    !isChanging
                        ? `size-30 hover:bg-cgray-1/70 hover:opacity-100 flex items-center justify-center text-center rounded-maxx opacity-0 -translate-x-20 -translate-y-5 lg:translate-y-0 lg:-translate-x-25`
                        : `min-w-80 lg:min-w-99 max-w-95vw lg:max-w-none max-h-64 p-3 lg:p-4 bg-cgray-1 border rounded-lg text-cwhite-1 opacity-100 -translate-x-40 -translate-y-10 lg:translate-y-0 lg:translate-x-30 overflow-hidden`
                } flex`}
                onClick={() => !isChanging && handleToggleChanging()}
            >
                <p className={`transition-all overflow-hidden text-xs lg:text-sm ${
                    !isChanging
                        ? 'max-h-6 lg:max-h-24 ml-3 w-20 lg:w-250 opacity-100'
                        : 'max-h-0 max-w-0 opacity-0'
                }`}>
                    Изменить фото
                </p>

                <div className={`flex flex-col overflow-hidden w-full ${
                    isChanging
                        ? 'max-h-48 opacity-100'
                        : 'max-h-0 opacity-0'
                }`}>
                    <div className="flex justify-between items-center mb-2 lg:mb-3">
                        <h3 className="text-sm lg:text-lg font-semibold text-nowrap truncate max-w-40 lg:max-w-none">
                            Загрузить фото профиля
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
                        Рекомендуемое разрешение: 200x200
                    </p>

                    {loading && (
                        <div className="mt-1 lg:mt-2 text-cwhite-1/70 text-xs lg:text-sm">Загрузка...</div>
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

            {showCropModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-cgray-1 rounded-lg p-3 sm:p-4 lg:p-6 w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-auto mx-2">
                        <div className="flex justify-between items-center mb-3 sm:mb-4">
                            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-cwhite-1">
                                {originalImage && originalImage.height > originalImage.width ? 'Настройте портрет' : 'Обрежьте изображение'}
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
                                            minHeight: window.innerWidth < 768 ? '300px' : '350px',
                                            minWidth: window.innerWidth < 768 ? '280px' : '400px',
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
                                                // Сохраняем оригинальные пропорции
                                                aspectRatio: originalImage ? `${originalImage.width}/${originalImage.height}` : '1'
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
                                            onClick={() => handleCropResize(-30)}
                                            className="px-4 sm:px-5 py-3 bg-cgray-2 text-cwhite-1 rounded-lg hover:bg-cgray-3 active:bg-cgray-4 transition-colors text-sm sm:text-base flex-1 sm:flex-none min-w-[120px] touch-manipulation font-medium"
                                        >
                                            📉 Уменьшить
                                        </button>
                                        <button
                                            onClick={() => handleCropResize(30)}
                                            className="px-4 sm:px-5 py-3 bg-cgray-2 text-cwhite-1 rounded-lg hover:bg-cgray-3 active:bg-cgray-4 transition-colors text-sm sm:text-base flex-1 sm:flex-none min-w-[120px] touch-manipulation font-medium"
                                        >
                                            📈 Увеличить
                                        </button>
                                    </div>
                                    <span className="text-cwhite-1 text-sm sm:text-base text-center font-medium">
                            Размер области: {Math.round(cropArea.width)}×{Math.round(cropArea.height)}px
                        </span>
                                    <div className="text-cgray-4 text-xs sm:text-sm text-center max-w-md">
                                        {window.innerWidth < 768 ? (
                                            <>
                                                <p className="text-green-400 font-semibold">
                                                    👆 Тяните за оранжевые кружки по углам
                                                </p>
                                                <p>Или используйте кнопки для точной настройки</p>
                                            </>
                                        ) : (
                                            <>
                                                <p>• Перетащите изображение для перемещения</p>
                                                <p>• Перетащите углы для масштабирования</p>
                                                <p>• Или используйте кнопки для точной настройки</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 xl:w-80 lg:mt-0">
                                <div className="bg-cgray-2 rounded-lg p-4 sm:p-5">
                                    <div className="text-cwhite-1 text-sm sm:text-base">
                                        <p className="font-semibold mb-3 text-base sm:text-lg">
                                            Управление
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
                                                <span>Используйте кнопки для точной настройки</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-purple-400">•</span>
                                                <span>Результат будет обрезан до <strong>200×200px</strong></span>
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
                                                Сохранить фото
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