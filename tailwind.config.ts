import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                background: "rgb(var(--background))",
                foreground: "rgb(var(--foreground))",
                pink: "rgb(var(--color-pink-1))",
                "pink-foreground": "rgb(var(--color-pink-1))",
                accent: "rgb(var(--accent))",
                "accent-foreground": "rgb(var(--accent-foreground))",
                muted: "rgb(var(--muted))",
                border: "rgb(var(--border))",
            },
            textIndent: {
                '4': '1rem',
                '8': '2rem',
                '12': '3rem',
                '16': '4rem',
            }
        },
    },
    plugins: [],
}
export default config;