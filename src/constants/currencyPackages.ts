import type {CurrencyPackage} from "@/types/shop";

export const currencyPackages: CurrencyPackage[] = [
    {
        id: 1,
        name: "Стартовый набор",
        description: "Отличный старт для новичка",
        hleb: 5000,
        sfl: 10,
        pointsCost: 10,
        popular: false
    },
    {
        id: 2,
        name: "Базовый набор",
        description: "Для регулярных покупок",
        hleb: 7500,
        sfl: 15,
        pointsCost: 15,
        popular: false
    },
    {
        id: 3,
        name: "Продвинутый набор",
        description: "Серьезные инвестиции",
        hleb: 10000,
        sfl: 20,
        pointsCost: 20,
        popular: false
    },
    {
        id: 7,
        name: "Пак Тимофейки",
        description: "Специальное предложение от timofeiko256",
        hleb: 256000,
        sfl: 256,
        pointsCost: 256,
        popular: false,
        author: 'timofeiko256',
        frameId: 19
    },
    {
        id: 8,
        name: "Пак Фита",
        description: "Специальное предложение от Fitesip",
        hleb: 100000,
        sfl: 100,
        pointsCost: 150,
        popular: false,
        author: 'Fitesip',
        frameId: 16
    },
    {
        id: 9,
        name: "Пак Санькатигра",
        description: "Специальное предложение от sanektigr5",
        hleb: 333333 ,
        sfl: 333,
        pointsCost: 333,
        popular: false,
        author: 'sanektigr5'
    },
    {
        id: 10,
        name: "Пак Гаджета",
        description: "Специальное предложение от Booler",
        hleb: 20000 ,
        sfl: 100,
        pointsCost: 38,
        popular: false,
        author: 'Booler'
    },
    {
        id: 4,
        name: "Премиум набор",
        description: "Максимальная выгода",
        hleb: 20000,
        sfl: 50,
        pointsCost: 30,
        popular: false,
    },
    {
        id: 5,
        name: "Только Хлеб",
        description: "10000 единиц хлеба",
        hleb: 10000,
        sfl: 0,
        pointsCost: 10,
        popular: false
    },
    {
        id: 6,
        name: "Только СФЛ",
        description: "50 единиц СФЛ",
        hleb: 0,
        sfl: 50,
        pointsCost: 20,
        popular: false
    },

];
