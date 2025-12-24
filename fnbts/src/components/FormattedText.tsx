// src/components/FormattedText.tsx
'use client';

interface FormattedTextProps {
    content: string;
    className?: string;
}

export default function FormattedText({ content, className = '' }: FormattedTextProps) {
    // Функция для безопасного рендеринга HTML
    const createMarkup = (html: string) => {
        return { __html: html };
    };

    return (
        <div
            className={`formatted-text ${className}`}
            dangerouslySetInnerHTML={createMarkup(content)}
        />
    );
}