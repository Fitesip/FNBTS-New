import type {Points} from "@/types/shop";

export const points: Points[] = [
    {
        id: 1,
        name: 'Базовый пак',
        description: 'Если чуть-чуть не хватает',
        pointsAmount: 20,
        cost: 49,
    },
    {
        id: 2,
        name: 'Средний пак',
        description: 'Если хочется больше',
        pointsAmount: 50,
        cost: 119,
    },
    {
        id: 3,
        name: 'Премиум пак',
        description: 'Для серьёзных покупок',
        pointsAmount: 100,
        cost: 229,
    },
    {
        id: 4,
        name: 'Мегапак',
        description: 'Больше чем нужно',
        pointsAmount: 200,
        cost: 399,
    },
];
