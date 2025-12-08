// src/utils/textFormatter.ts

export function formatText(text: string): string {
    if (!text) return '';

    const lines = text.split('\n');
    const blocks: string[] = [];
    let currentBlock: string[] = [];
    let blockType: 'paragraph' | 'quote' | 'code' | 'list' | 'heading' | 'hr' | 'custom' = 'paragraph';
    let inCustomBlock = false;
    let customBlockContent: string[] = [];

    const pushCurrentBlock = () => {
        if (currentBlock.length === 0) return;

        const content = currentBlock.join('\n').trim();
        if (!content) return;

        switch (blockType) {
            case 'quote':
                const quoteContent = content.split('\n')
                    .map(line => applyInlineFormatting(line))
                    .join('<br>');
                blocks.push(`<blockquote class="post-quote">${quoteContent}</blockquote>`);
                break;

            case 'code':
                blocks.push(`<pre class="code-block"><code>${content}</code></pre>`);
                break;

            case 'heading':
                if (content.startsWith('# ')) {
                    blocks.push(`<h3 class="post-heading">${applyInlineFormatting(content.substring(2))}</h3>`);
                } else if (content.startsWith('## ')) {
                    blocks.push(`<h4 class="post-heading">${applyInlineFormatting(content.substring(3))}</h4>`);
                } else if (content.startsWith('### ')) {
                    blocks.push(`<h5 class="post-heading">${applyInlineFormatting(content.substring(4))}</h5>`);
                }
                break;

            case 'list':
                const listItems = content.split('\n')
                    .map(item => {
                        if (item.startsWith('- ')) {
                            return `<li class="post-list-item">${applyInlineFormatting(item.substring(2))}</li>`;
                        } else if (/^\d+\.\s/.test(item)) {
                            const listContent = item.replace(/^\d+\.\s/, '');
                            return `<li class="post-list-item">${applyInlineFormatting(listContent)}</li>`;
                        }
                        return '';
                    })
                    .filter(item => item !== '')
                    .join('');

                const isOrdered = /^\d+\.\s/.test(content.split('\n')[0]);
                const listTag = isOrdered ? 'ol' : 'ul';
                blocks.push(`<${listTag} class="post-list">${listItems}</${listTag}>`);
                break;

            case 'hr':
                blocks.push('<hr class="post-hr">');
                break;

            case 'paragraph':
            default:
                blocks.push(`<p>${applyInlineFormatting(content)}</p>`);
                break;
        }

        currentBlock = [];
    };

    const determineBlockType = (line: string): 'paragraph' | 'quote' | 'code' | 'list' | 'heading' | 'hr' | 'custom' => {
        if (inCustomBlock) {
            return 'custom';
        }

        if (line.startsWith('```')) return 'code';
        if (line.startsWith('> ')) return 'quote';
        if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### ')) return 'heading';
        if (line.startsWith('- ') || /^\d+\.\s/.test(line)) return 'list';
        if (line.trim() === '---') return 'hr';

        const trimmedLine = line.trim();
        if (trimmedLine === '<>' || trimmedLine === '<%>' || trimmedLine === '<~>' || trimmedLine === '<&>') {
            return 'custom';
        }

        return 'paragraph';
    };

    const isSameBlockType = (currentType: string, line: string): boolean => {
        if (inCustomBlock) {
            return true;
        }

        const lineType = determineBlockType(line);
        if (currentType === 'quote' && line.startsWith('> ')) return true;
        if (currentType === 'code' && !line.startsWith('```')) return true;
        if (currentType === 'list' && (line.startsWith('- ') || /^\d+\.\s/.test(line))) return true;
        if (currentType === 'paragraph' && determineBlockType(line) === 'paragraph') return true;

        return currentType === lineType;
    };

    const processCustomBlock = (customContent: string[]): string => {
        let result = '';
        const stack: string[] = [];

        const processLine = (line: string): string => {
            const trimmedLine = line.trim();

            // Открывающие теги с inline стилями
            if (trimmedLine === '<>') {
                return '<div style="display: flex; flex-direction: column; height: 100%; background: #333333; border: 1px solid rgba(160, 160, 160, 0.05); border-radius: 8px; padding: 16px; max-width: 24rem">';
            } else if (trimmedLine === '<%>') {
                return '<div style="display: flex; flex-direction: column; gap: 8px;">';
            } else if (trimmedLine === '<~>') {
                return '<div style="text-align: center; margin-bottom: 16px;">';
            } else if (trimmedLine === '<&>') {
                return '<div style="display: flex; justify-content: space-between; align-items: center;">';
            }
            // Закрывающие теги
            else if (trimmedLine === '</>' || trimmedLine === '</%>' || trimmedLine === '</~>' || trimmedLine === '</&>') {
                return '</div>';
            }
            // Содержимое
            else {
                // Заголовки
                if (trimmedLine.startsWith('# ')) {
                    const text = trimmedLine.substring(2);
                    return `<h3 style="font-size: 1.125rem; line-height: 1.75rem; font-weight: bold; color: var(--color-cwhite-1); margin-bottom: 8px;">${applyInlineFormatting(text)}</h3>`;
                }

                // Параграф с серым текстом (для описания под заголовком)
                if (trimmedLine === 'Текст') {
                    return `<p style="color: #9CA3AF; font-size: 0.875rem; line-height: 1.25rem;">${applyInlineFormatting(trimmedLine)}</p>`;
                }

                // Формат =Text= =Text2=
                if (trimmedLine.includes('=')) {
                    const parts = trimmedLine.split(' ');
                    const formattedParts = parts.map(part => {
                        if (part.startsWith('=') && part.endsWith('=')) {
                            const content = part.substring(1, part.length - 1);
                            return `<span>${applyInlineFormatting(content)}</span>`;
                        }
                        return part;
                    }).join(' ');

                    return formattedParts;
                }

                // Обычный текст
                return `<span>${applyInlineFormatting(trimmedLine)}</span>`;
            }
        };

        for (let i = 0; i < customContent.length; i++) {
            const line = customContent[i];
            const trimmedLine = line.trim();

            // Отслеживаем вложенность
            if (trimmedLine === '<>' || trimmedLine === '<%>' || trimmedLine === '<~>' || trimmedLine === '<&>') {
                stack.push(trimmedLine);
            } else if (trimmedLine === '</>' || trimmedLine === '</%>' || trimmedLine === '</~>' || trimmedLine === '</&>') {
                if (stack.length > 0) {
                    stack.pop();
                }
            }

            // Добавляем отступы для форматирования
            const indent = '    '.repeat(stack.length);
            const processedLine = processLine(line);

            // Если это не закрывающий тег и предыдущая строка была открывающим тегом, добавляем перенос строки
            if (i > 0 && !trimmedLine.startsWith('</')) {
                const prevTrimmed = customContent[i-1].trim();
                if (prevTrimmed === '<>' || prevTrimmed === '<%>' || prevTrimmed === '<~>' || prevTrimmed === '<&>') {
                    result += '\n';
                }
            }

            result += indent + processedLine;

            // Добавляем перенос строки после каждой строки, кроме последней
            if (i < customContent.length - 1) {
                result += '\n';
            }
        }

        // Закрываем все незакрытые теги
        while (stack.length > 0) {
            const indent = '    '.repeat(stack.length - 1);
            result += '\n' + indent + '</div>';
            stack.pop();
        }

        return result;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (line.startsWith('```') && blockType === 'code') {
            pushCurrentBlock();
            continue;
        }

        // Обработка начала кастомного блока
        if (!inCustomBlock && (trimmedLine === '<>' || trimmedLine === '<%>' || trimmedLine === '<~>' || trimmedLine === '<&>')) {
            if (currentBlock.length > 0) {
                pushCurrentBlock();
            }

            inCustomBlock = true;
            customBlockContent = [trimmedLine];
            blockType = 'custom';
            continue;
        }

        // Обработка внутри кастомного блока
        if (inCustomBlock) {
            customBlockContent.push(line);

            // Проверяем баланс тегов
            if (trimmedLine === '</>' || trimmedLine === '</%>' || trimmedLine === '</~>' || trimmedLine === '</&>') {
                // Подсчитываем открывающие и закрывающие теги
                let openCount = 0;
                let closeCount = 0;

                for (const contentLine of customBlockContent) {
                    const contentTrimmed = contentLine.trim();
                    if (contentTrimmed === '<>' || contentTrimmed === '<%>' || contentTrimmed === '<~>' || contentTrimmed === '<&>') {
                        openCount++;
                    } else if (contentTrimmed === '</>' || contentTrimmed === '</%>' || contentTrimmed === '</~>' || contentTrimmed === '</&>') {
                        closeCount++;
                    }
                }

                // Если все теги сбалансированы, закрываем блок
                if (openCount === closeCount) {
                    const customHTML = processCustomBlock(customBlockContent);
                    blocks.push(customHTML);

                    inCustomBlock = false;
                    customBlockContent = [];
                    currentBlock = [];
                    blockType = 'paragraph';
                }
            }
            continue;
        }

        // Обычная обработка
        const lineBlockType = determineBlockType(line);

        if (currentBlock.length === 0) {
            blockType = lineBlockType;
            currentBlock.push(line);
            continue;
        }

        if (isSameBlockType(blockType, line)) {
            if (blockType === 'quote' && line.startsWith('> ')) {
                currentBlock.push(line.substring(2));
            } else {
                currentBlock.push(line);
            }
        } else {
            pushCurrentBlock();
            blockType = lineBlockType;

            if (blockType === 'quote' && line.startsWith('> ')) {
                currentBlock.push(line.substring(2));
            } else {
                currentBlock.push(line);
            }
        }
    }

    if (inCustomBlock && customBlockContent.length > 0) {
        const customHTML = processCustomBlock(customBlockContent);
        blocks.push(customHTML);
    } else if (currentBlock.length > 0) {
        pushCurrentBlock();
    }

    return blocks.join('');
}

function applyInlineFormatting(text: string): string {
    const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return escapedText
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/~~([^~]+)~~/g, '<del>$1</del>')
        .replace(/`([^`]+)`/g, '<code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>');
}

export function previewFormat(text: string): string {
    return formatText(text);
}

export function validateText(text: string): { isValid: boolean; error?: string } {
    if (text.length > 10000) {
        return { isValid: false, error: 'Текст не должен превышать 10000 символов' };
    }

    const dangerousTags = /<script|javascript:|onclick|onload|onerror/i;
    if (dangerousTags.test(text)) {
        return { isValid: false, error: 'Текст содержит недопустимые элементы' };
    }

    return { isValid: true };
}