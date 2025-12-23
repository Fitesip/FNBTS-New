// src/app/api/auth/forgot-password/route.ts
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
}

export async function POST(request: NextRequest) {
    try {
        const { email, login } = await request.json();

        if (!email || !login) {
            return NextResponse.json(
                { success: false, error: 'Email и логин обязательны' },
                { status: 400 }
            );
        }

        // Ищем пользователя по email и логину
        const [users] = await pool.execute(
            'SELECT id, username, email FROM users WHERE email = ? AND username = ?',
            [email, login]
        ) as [User[], unknown];

        if (users.length === 0) {
            // Не сообщаем точно что не совпало для безопасности
            return NextResponse.json({
                success: true,
                message: 'Если пользователь с таким email и логином существует, ссылка для сброса пароля будет отправлена'
            });
        }

        const user = users[0];

        // Генерируем токен сброса
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 час

        // Сохраняем токен в базу
        await pool.execute(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, resetToken, expiresAt]
        );

        // Создаем ссылку для сброса
        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password/${resetToken}`;

        // Отправляем email через Resend
        const emailSent = await sendPasswordResetEmail(user.email, user.username, resetLink);

        if (!emailSent) {
            console.error('Failed to send password reset email');
            // Удаляем токен если email не отправлен
            await pool.execute('DELETE FROM password_reset_tokens WHERE token = ?', [resetToken]);

            return NextResponse.json(
                { success: false, error: 'Ошибка при отправке email' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Ссылка для сброса пароля отправлена на вашу почту'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { success: false, error: 'Ошибка сервера' },
            { status: 500 }
        );
    }
}

// Функция отправки email через Resend
async function sendPasswordResetEmail(email: string, username: string, resetLink: string): Promise<boolean> {
    try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        const filepath = `public/fnbts.png`;
        const attachment = fs.readFileSync(filepath).toString('base64');

        const { data, error } = await resend.emails.send({
            from: 'ФНБТС <fnbts@fnbts.ru>',
            to: email,
            subject: 'Сброс пароля - ФНБТС',
            html: generateEmailHtml(username, resetLink),
            attachments: [
                {
                    content: attachment,
                    filename: 'logo.png',
                    contentId: 'logo-image',
                },
            ],
        });

        if (error) {
            console.error('Resend error:', error);
            return false;
        }

        console.log('Email sent successfully:', data?.id);
        return true;

    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
}

// Генерация HTML для email
function generateEmailHtml(username: string, resetLink: string): string {
    return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Сброс пароля - ФНБТС</title>
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
                    С вашего Email подали заявку на сброс пароля. 
                    Если это были не вы, можете проигнорировать это сообщение.
                </p>
            </div>
            
            <div style="text-align: center;">
                <a href="${resetLink}" class="button" style="color: #f4f4f4;">
                    Сбросить пароль
                </a>
            </div>
            
            <div class="footer">
                <p style="margin: 5px 0;">Ссылка действительна в течение 1 часа.</p>
                <p style="margin: 5px 0;">Если кнопка не работает, скопируйте ссылку: ${resetLink}</p>
            </div>
        </div>
    </body>
    </html>
  `;
}