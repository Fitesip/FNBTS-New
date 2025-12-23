import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JwtPayload } from '@/types/auth';
import { RefreshToken } from '@/types/database';

const JWT_SECRET = process.env.JWT_SECRET || 'DONOTUSETHISSECRET';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'DONOTUSETHISREFRESHSECRET';

import pool from '@/lib/database';

interface QueryResult {
    affectedRows?: number;
    insertId?: number;
}

interface TokenResult {
    id: number;
    user_id: number;
    token: string;
    expires_at: Date;
    created_at: Date;
    is_revoked: boolean;
}
interface MySQLFieldPacket {
    catalog: string;
    db: string;
    table: string;
    orgTable: string;
    name: string;
    orgName: string;
    charsetNr: number;
    length: number;
    type: number;
    flags: number;
    decimals: number;
    default?: unknown;
    zeroFill: boolean;
    protocol41: boolean;
}

export function generateTokens(userId: number): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
        { userId },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
        { userId },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
        return null;
    }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
    } catch {
        return null;
    }
}

export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
}

// Сохранение refresh токена в базу данных
export async function saveRefreshToken(userId: number, token: string): Promise<boolean> {
    try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // +7 дней

        const query = `
            INSERT INTO refresh_tokens (user_id, token, expires_at, is_revoked)
            VALUES (?, ?, ?, ?)
        `;

        const [result] = await pool.execute(query, [userId, token, expiresAt, false]) as unknown as [QueryResult, MySQLFieldPacket[]];
        return result.affectedRows !== undefined && result.affectedRows > 0;
    } catch (error) {
        console.error('Error saving refresh token:', error);
        return false;
    }
}

// Поиск валидного refresh токена
export async function findValidRefreshToken(token: string): Promise<RefreshToken | null> {
    try {
        const [tokens] = await pool.execute(
            `SELECT * FROM refresh_tokens 
             WHERE token = ? AND is_revoked = false AND expires_at > NOW()`,
            [token]
        ) as [TokenResult[], MySQLFieldPacket[]];

        return tokens.length > 0 ? tokens[0] : null;
    } catch (error) {
        console.error('Error finding refresh token:', error);
        return null;
    }
}

// Отзыв refresh токена
export async function revokeRefreshToken(token: string): Promise<boolean> {
    try {
        const [result] = await pool.execute(
            'UPDATE refresh_tokens SET is_revoked = true WHERE token = ?',
            [token]
        ) as unknown as [QueryResult, MySQLFieldPacket[]];

        return result.affectedRows !== undefined && result.affectedRows > 0;
    } catch (error) {
        console.error('Error revoking refresh token:', error);
        return false;
    }
}

// Отзыв всех refresh токенов пользователя
export async function revokeAllUserTokens(userId: number): Promise<boolean> {
    try {
        const [result] = await pool.execute(
            'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = ?',
            [userId]
        ) as unknown as [QueryResult, MySQLFieldPacket[]];

        return result.affectedRows !== undefined && result.affectedRows > 0;
    } catch (error) {
        console.error('Error revoking all user tokens:', error);
        return false;
    }
}

// Обновление refresh токена (ротация токенов)
export async function rotateRefreshToken(oldToken: string, newToken: string): Promise<boolean> {
    try {
        // Сначала находим данные старого токена ДО отзыва
        const oldTokenData = await findValidRefreshToken(oldToken);
        if (!oldTokenData) {
            console.error('Old refresh token not found or invalid');
            return false;
        }

        // Сохраняем новый токен
        const newTokenSaved = await saveRefreshToken(oldTokenData.user_id, newToken);
        if (!newTokenSaved) {
            console.error('Failed to save new refresh token');
            return false;
        }

        // Затем отзываем старый токен
        await revokeRefreshToken(oldToken);

        return true;
    } catch (error) {
        console.error('Error rotating refresh token:', error);
        return false;
    }
}

// // Очистка просроченных токенов
// export async function cleanupExpiredTokens(): Promise<number> {
//     try {
//         const [result] = await pool.execute(
//             'DELETE FROM refresh_tokens WHERE expires_at <= NOW() OR is_revoked = true'
//         ) as [QueryResult, any];
//
//         return result.affectedRows || 0;
//     } catch (error) {
//         console.error('Error cleaning up expired tokens:', error);
//         return 0;
//     }
// }

// // Получение всех активных токенов пользователя
// export async function getUserActiveTokens(userId: number): Promise<RefreshToken[]> {
//     try {
//         const [tokens] = await pool.execute(
//             `SELECT * FROM refresh_tokens
//              WHERE user_id = ? AND is_revoked = false AND expires_at > NOW()`,
//             [userId]
//         ) as [TokenResult[], any];
//
//         return tokens;
//     } catch (error) {
//         console.error('Error getting user tokens:', error);
//         return [];
//     }
// }