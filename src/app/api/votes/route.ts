// src/app/api/votes/route.ts
import {NextRequest, NextResponse} from 'next/server';
import {ApiResponse, CreateNewsRequest, VotesPosts} from '@/types/news';
import pool from '@/lib/database';
import {Resend} from "resend";
import fs from "node:fs";

// Типы для базы данных
interface DatabaseResult {
    insertId: number;
    affectedRows: number;
}

interface CountResult {
    total: number;
}
interface Subs {
    username: string;
    email: string;
}

interface ResendResponse {
    data?: { id: string };
    error?: Error;
}

interface CreateVoteResponse {
    title: string;
    duration: number;
}

export async function GET(request: NextRequest) {
    console.log('🔍 API: Getting all news');

    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        console.log('📊 Query parameters:', { page, limit, offset });

        // Получаем новости с пагинацией
        console.log('🚀 Executing news query...');
        const [votesposts] = await pool.query(
            `SELECT * FROM votesposts
             ORDER BY datefrom DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        ) as [VotesPosts[], unknown];


        // Получаем общее количество новостей для пагинации
        console.log('🚀 Executing count query...');
        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM votesposts'
        ) as [CountResult[], unknown];

        const total = countResult[0]?.total || 0;
        console.log('✅ Total news count:', total);

        const response: ApiResponse<{ votesposts: VotesPosts[], total: number, page: number }> = {
            success: true,
            data: {
                votesposts: votesposts || [],
                total,
                page
            }
        };

        console.log('🎉 Successfully returning news');
        return NextResponse.json(response);

    } catch (error) {
        console.error('💥 Error in news API:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при загрузке новостей',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    console.log('📝 API: Creating new news');

    try {
        const body: CreateVoteResponse = await request.json();

        // Валидация обязательных полей
        if (!body.title || !body.duration) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Все поля обязательны для заполнения'
                },
                { status: 400 }
            );
        }

        // Проверка длины заголовка и текста
        if (body.title.length > 200) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Заголовок не должен превышать 200 символов'
                },
                { status: 400 }
            );
        }

        // Генерируем текущую дату и время, если не переданы
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const endDate = new Date(now);
        endDate.setDate(now.getDate() + (body.duration || 7));

        // Вставляем новую новость в базу данных
        const [result] = await pool.execute(
            `INSERT INTO votesposts (title, datefrom, dateto)
             VALUES (?, ?, ?)`,
            [
                body.title,
                date,
                endDate,
            ]
        ) as [DatabaseResult, unknown];

        console.log('✅ News created successfully, ID:', result.insertId);

        // Получаем созданную новость для возврата
        const [votesposts] = await pool.execute(
            'SELECT * FROM votesposts WHERE id = ?',
            [result.insertId]
        ) as [VotesPosts[], unknown];

        const createdVote = votesposts[0];

        if (!createdVote) {
            throw new Error('Failed to retrieve created news');
        }

        const [subs] = await pool.execute(
            'SELECT username,email FROM subscribtions WHERE type = ?',
            ['votes']
        ) as [Subs[], unknown];

        for (const subscriber of subs) {
            const link = `${process.env.NEXT_PUBLIC_APP_URL}/forum`;

            await sendVerificationEmail(subscriber.email, subscriber.username, link);

        }

        const response: ApiResponse<{ votesPosts: VotesPosts }> = {
            success: true,
            data: {
                votesPosts: createdVote
            }
        };

        return NextResponse.json(response, { status: 201 });

    } catch (error) {
        console.error('💥 Error creating news:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json(
            {
                success: false,
                error: 'Ошибка при создании новости',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            },
            { status: 500 }
        );
    }
}

async function sendVerificationEmail(email: string, username: string, verificationLink: string): Promise<boolean> {
    try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        const filepath = `public/fnbts.png`;
        const attachment = fs.readFileSync(filepath).toString('base64');

        const { data, error } = await resend.emails.send({
            from: 'ФНБТС <fnbts@fnbts.ru>',
            to: email,
            subject: 'Новая новость - ФНБТС',
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

function generateVerificationEmailHtml(username: string, link: string): string {
    return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Новое голосование - ФНБТС</title>
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
                    На ФНБТС появилось новое голосование! Для его просмотра нажмите на кнопку или перейдите по ссылке ниже:
                </p>
            </div>
            
            <div style="text-align: center;">
                <a href="${link}" class="button" style="color: #f4f4f4;">
                    Просмотреть голосование
                </a>
            </div>
            
            <div class="footer">
                <p style="margin: 5px 0;">Если кнопка не работает, скопируйте ссылку: ${link}</p>
                <p>Вы можете отписаться от рассылки в своём профиле</p>
            </div>
        </div>
    </body>
    </html>
  `;
}