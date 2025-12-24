// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { ApiResponse, User } from '@/types/database';
import pool from "@/lib/database";
import crypto from 'crypto';

// Типы для базы данных
interface DatabaseResult {
    insertId: number;
    affectedRows: number;
}

interface UserRow {
    id: number;
}

// Функция для проверки существующего пользователя
async function checkExistingUser(email: string, username: string): Promise<{ exists: boolean; field?: string }> {
    try {
        // Проверяем по email
        const [emailRows] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        ) as [UserRow[], unknown];

        if (emailRows.length > 0) {
            return { exists: true, field: 'email' };
        }

        // Проверяем по username
        const [usernameRows] = await pool.execute(
            'SELECT id FROM users WHERE username = ?',
            [username]
        ) as [UserRow[], unknown];

        if (usernameRows.length > 0) {
            return { exists: true, field: 'username' };
        }

        return { exists: false };
    } catch (error) {
        console.error('Error checking existing user:', error);
        return { exists: false };
    }
}

// Функция создания пользователя
async function createUser(userData: Omit<User, 'id' | 'regDate' | 'confirmCode'>): Promise<number> {
    try {
        const currentDate = new Date().toISOString().split('T')[0];

        console.log('📝 Creating user with data:', {
            username: userData.username,
            email: userData.email,
            regDate: currentDate
        });

        // Вставляем пользователя в базу данных
        const [result] = await pool.execute(
            `INSERT INTO users (username, email, password, regDate, role, userRank, status, photo, banner, frame, points, verify, isBlocked, discordConnected) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userData.username,
                userData.email,
                userData.password,
                currentDate,
                'Игрок',
                'Новичок',
                '',
                '',
                '',
                '',
                0,
                false,
                false,
                false
            ]
        ) as [DatabaseResult, unknown];



        return result.insertId;

    } catch (error) {
        console.error('💥 Error creating user:', error);
        throw error;
    }
}

// Функция отправки email верификации
async function sendVerificationEmail(email: string): Promise<boolean> {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/send-verification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email
            })
        });

        if (!response.ok) {
            console.error('Failed to send verification email:', response.statusText);
            return false;
        }

        const result = await response.json();
        return result.success === true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
}

export async function POST(request: NextRequest) {
    console.log('🚀 Starting registration process...');

    try {
        const { username, email, password } = await request.json();

        console.log('📥 Registration data received:', { username, email });

        if (!username || !email || !password) {
            console.log('❌ Missing required fields');
            return NextResponse.json(
                { success: false, error: 'Все поля обязательны для заполнения' },
                { status: 400 }
            );
        }

        // Проверяем длину username
        if (username.length < 3) {
            return NextResponse.json(
                { success: false, error: 'Имя пользователя должно содержать минимум 3 символа' },
                { status: 400 }
            );
        }

        // Проверяем длину пароля
        if (password.length < 6) {
            return NextResponse.json(
                { success: false, error: 'Пароль должен содержать минимум 6 символов' },
                { status: 400 }
            );
        }

        // Проверяем существующего пользователя
        console.log('🔍 Checking for existing user...');
        const existingUserCheck = await checkExistingUser(email, username);

        if (existingUserCheck.exists) {
            const fieldName = existingUserCheck.field === 'email' ? 'email' : 'именем пользователя';
            console.log(`❌ User with this ${fieldName} already exists`);
            return NextResponse.json(
                {
                    success: false,
                    error: `Пользователь с таким ${fieldName} уже существует`
                },
                { status: 400 }
            );
        }

        // Хеширование пароля
        console.log('🔐 Hashing password...');
        const hashedPassword = await hashPassword(password);

        // Создание пользователя
        console.log('👤 Creating user in database...');
        const userId = await createUser({
            username,
            email,
            password: hashedPassword,
            role: 'user',
            userRank: 'beginner',
            status: 'active',
            photo: '',
            banner: '',
            frame: '',
            points: 0,
            verify: false,
            email_verified: false,
            isBlocked: false,
            discordConnected: false,
        });

        const [result] = await pool.execute(
            `INSERT INTO subscribtions (userId, type, username, email) 
       VALUES (?, ?, ?, ?)`,
            [
                userId,
                'news',
                username,
                password,
                email,
            ]
        ) as [DatabaseResult, unknown];
        console.log('✅ User registration completed, userId:', userId);

        // Генерация кода подтверждения
        const confirmCode = crypto.randomBytes(32).toString('hex');

        await pool.execute(
            'UPDATE users SET confirmCode = ? WHERE id = ?',
            [confirmCode, userId]
        );

        // Отправка email верификации
        console.log('📧 Sending verification email...');
        const emailSent = await sendVerificationEmail(email);

        if (!emailSent) {
            console.warn('⚠️ Verification email could not be sent, but user was created');
        }

        const response: ApiResponse<{ userId: number }> = {
            success: true,
            message: 'Пользователь успешно зарегистрирован',
            data: { userId }
        };

        return NextResponse.json(response, { status: 201 });

    } catch (error) {
        console.error('💥 Registration error:', error);

        // Более конкретные сообщения об ошибках
        let errorMessage = 'Ошибка сервера';

        if (error instanceof Error) {
            const errorMessageLower = error.message.toLowerCase();

            if (errorMessageLower.includes('duplicate') || errorMessageLower.includes('unique')) {
                errorMessage = 'Пользователь с таким email или именем уже существует';
            } else if (errorMessageLower.includes('database') || errorMessageLower.includes('sql')) {
                errorMessage = 'Ошибка базы данных';
            }
        }

        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}