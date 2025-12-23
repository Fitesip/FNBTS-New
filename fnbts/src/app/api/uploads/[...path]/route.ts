import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const filePath = join(process.cwd(), 'public', 'uploads', ...path);

        // Проверяем существование файла
        if (!existsSync(filePath)) {
            return new Response('File not found', { status: 404 });
        }

        // Читаем файл как Uint8Array
        const fileBuffer = await readFile(filePath);
        const uint8Array = new Uint8Array(fileBuffer);

        // Определяем MIME тип
        const ext = filePath.split('.').pop()?.toLowerCase();
        const mimeTypes: { [key: string]: string } = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            'mov': 'video/quicktime'
        };

        const contentType = mimeTypes[ext || ''] || 'application/octet-stream';

        return new Response(uint8Array, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000',
                'Content-Length': fileBuffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('Error serving file:', error);
        return new Response('Internal server error', { status: 500 });
    }
}