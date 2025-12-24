// src/app/components/CollapsibleLayoutOpacity.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";

interface CollapsibleLayoutOpacityProps {
    children: React.ReactNode;
    triggerElement: React.ReactNode;
    defaultOpen?: boolean;
    duration?: number;
    className?: string;
    contentClassName?: string;
}

export default function CollapsibleLayoutOpacity({
                                                     children,
                                                     triggerElement,
                                                     defaultOpen = true,
                                                     duration = 300,
                                                     className = '',
                                                     contentClassName = ''
                                                 }: CollapsibleLayoutOpacityProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [isVisible, setIsVisible] = useState(defaultOpen);
    const [secret, setSecret] = useState<boolean>(false);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        if (isOpen) {
            // При открытии: сразу показываем, затем анимируем opacity
            setIsVisible(true);
        } else {
            // При закрытии: анимируем opacity, затем скрываем
            timeoutId = setTimeout(() => {
                setIsVisible(false);
            }, duration);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isOpen, duration]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        const timeout = setTimeout(() => {
            setSecret(true);
        }, 10000)
        if (isOpen) {
            clearTimeout(timeout);
            setSecret(false);
        }
    };

    return (
        <div className={className}>
            {/* Триггер */}
            <div
                onClick={handleToggle}
                className="cursor-pointer select-none"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggle();
                    }
                }}
            >
                {triggerElement}
            </div>

            {/* Контент с анимацией прозрачности */}
            {isVisible && (
                <div
                    style={{
                        opacity: isOpen ? 1 : 0,
                        transition: `opacity ${duration}ms ease-in-out`
                    }}
                    className={contentClassName}
                >
                    {children}
                </div>
            )}
            {!isVisible && secret && (
                <div className={`opacity-2`}>
                    <div className="flex flex-col h-full">
                        <div className="text-center">
                            <Link href="/other/SecretPrize2.exe" download className={`text-cwhite-1`}>Секрет</Link>
                        </div>

                    </div>

                </div>
            )}
        </div>
    );
}