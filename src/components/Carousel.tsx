import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface CarouselProps {
    images: {
        src: string;
        alt: string;
    }[];
    autoPlayInterval?: number;
}

export default function Carousel({ images, autoPlayInterval = 5000 }: CarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const nextSlide = useCallback(() => {
        setCurrentIndex((current) =>
            current === images.length - 1 ? 0 : current + 1
        );
    }, [images.length]);

    const prevSlide = () => {
        setCurrentIndex((current) =>
            current === 0 ? images.length - 1 : current - 1
        );
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    // Автопрокрутка
    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            nextSlide();
        }, autoPlayInterval);

        return () => clearInterval(interval);
    }, [currentIndex, isPaused, autoPlayInterval, nextSlide]);

    const handleMouseEnter = () => setIsPaused(true);
    const handleMouseLeave = () => setIsPaused(false);

    if (!images || images.length === 0) {
        return <div>No images provided</div>;
    }

    return (
        <div
            className="relative w-full max-w-4xl mx-auto"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Основной контейнер карусели */}
            <div className="relative overflow-hidden rounded-lg size-75">
                <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {images.map((image, index) => (
                        <div key={index} className="w-full shrink-0">
                            <Image
                                src={image.src}
                                alt={image.alt}
                                width={300}
                                height={300}
                                className="w-75 h-75 object-cover"
                                priority={index === 0}
                            />
                        </div>
                    ))}
                </div>

                {/* Кнопки навигации */}
                <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-cgray-1/70 hover:bg-cgray-1 text-white p-2 rounded-full transition-colors duration-200"
                    aria-label="Previous image"
                >
                    {/*<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">*/}
                    {/*    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />*/}
                    {/*</svg>*/}
                    <Image src={"/arrow.svg"} alt={"arrow"} width={25} height={25} className={"rotate-90"}/>
                </button>

                <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-cgray-1/70 hover:bg-cgray-1 text-white p-2 rounded-full transition-colors duration-200"
                    aria-label="Next image"
                >
                    {/*<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">*/}
                    {/*    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />*/}
                    {/*</svg>*/}
                    <Image src={"/arrow.svg"} alt={"arrow"} width={25} height={25} className={"rotate-270"}/>
                </button>
            </div>

            {/* Индикаторы */}
            <div className="flex justify-center mt-2 space-x-2">
                {images.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                            index === currentIndex ? 'bg-cgray-1' : 'bg-cwhite-1 hover:bg-cgray-1/50'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}