import Link from "next/link";

export default function Footer() {
    return (
        <footer className={"flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 text-cwhite-1 bg-cgray-2 border border-cgray-2 rounded-lg text-base sm:text-xl p-4 sm:p-5 mb-5 w-full max-w-416 mx-auto z-10 bg-filter mt-auto"}>
            <p className="text-center sm:text-left">Все права защищены.</p>
            <Link href={'/about'}>Юр. информация</Link>
            <p className="text-center sm:text-right">2023-2025</p>
        </footer>
    )
}