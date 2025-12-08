import {NextRequest, NextResponse} from "next/server";

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const shopId = process.env.YOOKASSA_SHOP_ID as string;
    const apiKey = process.env.YOOKASSA_API_KEY as string;

    const { id } = await params;

    try {
        const response = await fetch(`https://api.yookassa.ru/v3/payments/${id}`, {
            method: "GET",
            headers: {
                'Authorization': 'Basic ' + btoa(`${shopId}:${apiKey}`),
            },
        })
        const data = await response.json();
        return NextResponse.json(
            {
                success: true,
                data: data,
            },
            { status: 200 }
        );
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const shopId = process.env.YOOKASSA_SHOP_ID as string;
    const apiKey = process.env.YOOKASSA_API_KEY as string;

    const { id } = await params;

    const json = await request.json();

    try {
        const response = await fetch(`https://api.yookassa.ru/v3/payments/${id}/cancel`, {
            method: "POST",
            headers: {
                'Authorization': 'Basic ' + btoa(`${shopId}:${apiKey}`),
                'Idempotence-Key': '1',
                'Content-Type': 'application/json',
            },
        })
        const data = await response.json();
        return NextResponse.json(
            {
                success: true,
                data: data,
            },
            { status: 200 }
        );
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
            },
            { status: 500 }
        );
    }
}