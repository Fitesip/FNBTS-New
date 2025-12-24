// src/hooks/useTextArea.ts
import { useRef, RefObject } from 'react';

interface UseTextAreaReturn {
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    insertText: (text: string, cursorOffset?: number) => void;
    wrapSelection: (before: string, after?: string, defaultText?: string, moveCursorToEnd?: boolean) => void;
    getSelection: () => { start: number; end: number; text: string };
}

export function useTextArea(): UseTextAreaReturn {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const getSelection = () => {
        if (!textareaRef.current) return { start: 0, end: 0, text: '' };

        const textarea = textareaRef.current;
        return {
            start: textarea.selectionStart,
            end: textarea.selectionEnd,
            text: textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
        };
    };

    const insertText = (text: string, cursorOffset: number = text.length) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = textarea.value;

        const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
        textarea.value = newValue;

        // Устанавливаем курсор
        const newCursorPos = start + cursorOffset;
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const wrapSelection = (before: string, after: string = '', defaultText: string = '', moveCursorToEnd: boolean = false) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const hasSelection = selectedText.length > 0;

        const textToInsert = hasSelection ? selectedText : defaultText;
        const wrappedText = before + textToInsert + after;

        const newValue = textarea.value.substring(0, start) + wrappedText + textarea.value.substring(end);
        textarea.value = newValue;

        // Позиция курсора
        let newCursorPos: number;
        if (moveCursorToEnd) {
            // Курсор в самом конце
            newCursorPos = start + wrappedText.length;
        } else if (hasSelection) {
            // Если был выделен текст, курсор после всего блока
            newCursorPos = start + wrappedText.length;
        } else {
            // Если не было выделения, курсор между before и after
            newCursorPos = start + before.length + textToInsert.length;
        }

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    return {
        textareaRef,
        insertText,
        wrapSelection,
        getSelection
    };
}