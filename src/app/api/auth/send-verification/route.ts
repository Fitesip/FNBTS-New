// src/app/api/auth/send-verification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import crypto from 'crypto';
import { Resend } from 'resend';
import fs from "node:fs";

// Типы для базы данных
interface User {
    id: number;
    username: string;
    email: string;
    email_verified: boolean | string;
}

interface ResendResponse {
    data?: { id: string };
    error?: Error;
}

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Email обязателен' },
                { status: 400 }
            );
        }

        // Ищем пользователя по email
        const [users] = await pool.execute(
            'SELECT id, username, email, email_verified FROM users WHERE email = ?',
            [email]
        ) as [User[], unknown];

        if (users.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Пользователь не найден' },
                { status: 404 }
            );
        }

        const user = users[0];

        // Если email уже подтвержден
        if (user.email_verified) {
            return NextResponse.json(
                { success: false, error: 'Email уже подтвержден' },
                { status: 400 }
            );
        }

        // Генерируем код подтверждения
        const confirmCode = crypto.randomBytes(32).toString('hex');

        // Сохраняем код в базу
        await pool.execute(
            'UPDATE users SET confirmCode = ? WHERE id = ?',
            [confirmCode, user.id]
        );

        // Создаем ссылку для подтверждения
        const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email/${confirmCode}`;

        // Отправляем email
        const emailSent = await sendVerificationEmail(user.email, user.username, verificationLink);

        if (!emailSent) {
            console.error('Failed to send verification email');
            return NextResponse.json(
                { success: false, error: 'Ошибка при отправке email' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Письмо с подтверждением отправлено на вашу почту. Проверьте папку "Спам"'
        });

    } catch (error) {
        console.error('Send verification error:', error);
        return NextResponse.json(
            { success: false, error: 'Ошибка сервера' },
            { status: 500 }
        );
    }
}

// Функция отправки email подтверждения
async function sendVerificationEmail(email: string, username: string, verificationLink: string): Promise<boolean> {
    try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        const filepath = `public/fnbts.png`;
        const attachment = fs.readFileSync(filepath).toString('base64');

        const { data, error } = await resend.emails.send({
            from: 'ФНБТС <fnbts@fnbts.ru>',
            to: email,
            subject: 'Подтверждение email - ФНБТС',
            html: generateVerificationEmailHtml(username, verificationLink),
            attachments: [
                {
                    content: attachment,
                    filename: 'logo.png',
                    contentId: 'logo-image',
                },
            ],
        }) as unknown as ResendResponse;

        if (error) {
            console.error('Resend error:', error);
            return false;
        }

        console.log('Verification email sent successfully:', data?.id);
        return true;

    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
}

// Генерация HTML для email подтверждения
function generateVerificationEmailHtml(username: string, verificationLink: string): string {
    return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Подтверждение Email - ФНБТС</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #333;
                color: #f4f4f4;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #333;
                border-radius: 8px;
                padding: 30px;
            }
            .logo {
                text-align: center;
                margin-bottom: 20px;
            }
            .divider {
                border: none;
                border-top: 1px solid #444;
                margin: 20px 0;
            }
            .button {
                display: inline-block;
                background-color: #777;
                color: #f4f4f4;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-size: 16px;
                font-weight: bold;
                margin: 20px 0;
            }
            .footer {
                font-size: 12px;
                color: #999;
                text-align: center;
                margin-top: 20px;
                border-top: 1px solid #444;
                padding-top: 15px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">
                <img src="cid:logo-image" alt="FNBTS Logo" width="50" height="50"/>
            </div>
            
            <hr class="divider">
            
            <div style="margin-bottom: 25px;">
                <p style="font-size: 16px; line-height: 1.5; margin: 0 0 15px 0; color: #f4f4f4;">
                    Здравствуйте, <strong>${username}</strong>!
                </p>
                <p style="font-size: 14px; line-height: 1.5; margin: 0 0 15px 0; color: #f4f4f4;">
                    Кто-то зарегистрировался на сайте с помощью этого email.
                    Для завершения регистрации и активации вашего аккаунта, пожалуйста, подтвердите ваш email адрес.
                    Если это были не вы, можете проигнорировать это сообщение.
                </p>
            </div>
            
            <div style="text-align: center;">
                <a href="${verificationLink}" class="button" style="color: #f4f4f4;">
                    Подтвердить почту
                </a>
            </div>
            
            <div class="footer">
                <p style="margin: 5px 0;">Ссылка действительна в течение 1 часа.</p>
                <p style="margin: 5px 0;">Если кнопка не работает, скопируйте ссылку: ${verificationLink}</p>
            </div>
        </div>
    </body>
    </html>
  `;
}