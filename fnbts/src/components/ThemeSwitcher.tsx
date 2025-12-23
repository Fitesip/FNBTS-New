"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const themes = ["light", "dark", "blue", "emerald"];

export default function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return (
        <div className="flex gap-2">
            {themes.map((t) => (
                <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-3 py-1 rounded-xl capitalize transition ${
                        theme === t
                            ? "bg-gray-800 text-white dark:bg-white dark:text-black"
                            : "bg-gray-200 dark:bg-gray-700"
                    }`}
                >
                    {t}
                </button>
            ))}
        </div>
    );
}
