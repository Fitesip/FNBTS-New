'use client'

export default function ErrorPage() {
    return (
        <div className="flex items-center overflow-hidden mt-40 lg:mt-64 gap-4 z-10">
            <h1 className="text-5xl lg:text-8xl font-bold text-center text-red-1">404</h1>
            <p className={`text-cwhite-1 text-md lg:text-5xl`}>Страница не найдена!</p>
        </div>
    );

}