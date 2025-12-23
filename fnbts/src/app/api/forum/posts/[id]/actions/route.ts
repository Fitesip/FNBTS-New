import {NextRequest, NextResponse} from "next/server";
import {verifyAccessToken} from "@/lib/auth";
import pool from "@/lib/database";

interface RouteParams {
    params: Promise<{
        id: string;
    }>
}

interface PostStatus {
    status: 'closed' | 'open'
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json(
                { success: false, error: 'Требуется авторизация' },
                { status: 401 }
            );
        }

        const decoded = verifyAccessToken(accessToken);
        if (!decoded) {
            return NextResponse.json(
                { success: false, error: 'Невалидный токен' },
                { status: 401 }
            );
        }
        const { id } = await params;
        const { status }: PostStatus = await request.json();

        if (!status) {
            return NextResponse.json(
                { success: false, error: 'Отсутствует статус' },
                { status: 403 }
            );
        }

        await pool.query(
            'UPDATE forum SET status = ? WHERE id = ?',
            [status, id]
        );
        let statusText: string
        if (status == 'closed') {
            statusText = 'закрыт'
        }
        else {
            statusText = 'открыт'
        }
        return NextResponse.json(
            { success: true, message: `Пост успешно ${statusText}` },
            { status: 200 }
        );
    } catch (err) {

    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const accessToken = request.headers.get('authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json(
                { success: false, error: 'Требуется авторизация' },
                { status: 401 }
            );
        }

        const decoded = verifyAccessToken(accessToken);
        if (!decoded) {
            return NextResponse.json(
                { success: false, error: 'Невалидный токен' },
                { status: 401 }
            );
        }

        const { id } = await params;
        await pool.query(
            'UPDATE forum SET status = ? WHERE id = ?',
            ['deleted', id]
        );
        return NextResponse.json(
            { success: true, message: 'Пост успешно удалён' },
            { status: 200 }
        );
    } catch (err) {

    }
}