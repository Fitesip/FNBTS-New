import {NextRequest, NextResponse} from "next/server";

export async function POST(request: NextRequest) {
    const data = await request.json();
    const shopId = process.env.YOOKASSA_SHOP_ID as string;
    const apiKey = process.env.YOOKASSA_API_KEY as string;

    const cost: string = data.cost.toFixed(2);
    try {
        const redirectUrlResponse = await fetch('https://api.yookassa.ru/v3/payments/', {
            method: "POST",
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Idempotence-Key': data.tokenId,
                'Authorization': 'Basic ' + btoa(`${shopId}:${apiKey}`),
            },
            body: JSON.stringify({
                amount: {
                    value: cost,
                    currency: "RUB"
                },
                capture: true,
                confirmation: {
                    type: "redirect",
                    return_url: `https://fnbts.ru/user/${data.userId}/shop/payment/success`,
                },
                receipt: {
                    customer: {
                        email: data.email,
                    },
                    items: [
                        {
                            description: 'Пакет поинтов',
                            amount: {
                                value: (data.cost / data.amount).toFixed(2),
                                currency: "RUB"
                            },
                            vat_code: 1,
                            quantity: data.amount
                        }
                    ],
                },
                metadata: {
                    token: data.paymentToken,
                    packId: data.packId,
                },
                description: `Покупка поинтов №${data.tokenId}`
            })
        })
        const redirectUrlResponseData = await redirectUrlResponse.json();
        const redirectUrl = redirectUrlResponseData.confirmation.confirmation_url;
        return NextResponse.json(
            {
                success: true,
                link: redirectUrl,
                orderId: redirectUrlResponseData.id,
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