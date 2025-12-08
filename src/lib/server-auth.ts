// src/lib/server-auth.ts
import {jwtVerify} from 'jose';
import {NextRequest} from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET;
const secretKey = new TextEncoder().encode(JWT_SECRET || 'fallback-secret-key-for-development');

export async function getUserIdFromRequest(request: NextRequest): Promise<number | null> {
    try {

        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ No valid Authorization header format');
            return null;
        }

        const token = authHeader.substring(7);

        if (!token) {
            console.log('❌ Empty token');
            return null;
        }

        // Декодируем payload для отладки (без верификации)
        try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
            }
        } catch (decodeError) {
            console.log('❌ Failed to decode token payload:', decodeError);
        }

        // Верифицируем токен
        const { payload } = await jwtVerify(token, secretKey);

        // Ищем userId в payload (проверяем оба варианта)
        return payload.userId as number || payload.id as number || null;

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('💥 Token verification failed:', errorMessage);
        return null;
    }
}

export async function verifyToken(token: string): Promise<number | null> {
    try {
        const { payload } = await jwtVerify(token, secretKey);

        return payload.userId as number || payload.id as number || null;
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}