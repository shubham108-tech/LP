/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#fdf4ff',
                    100: '#fae8ff',
                    200: '#f5d0fe',
                    300: '#f0abfc',
                    400: '#e879f9',
                    500: '#d946ef', // Vibrant Magenta / Fuchsia
                    600: '#c026d3', // Deep Fuchsia
                    700: '#a21caf', // Rich Purple
                    800: '#86198f', // Dark Purple
                    900: '#701a75', // Deep Indigo Purple
                    950: '#4a044e', // Darkest Violet
                },
                brand: {
                    indigo: '#1a0836',
                    purple: '#4c0c7a',
                    fuchsia: '#a80b99',
                    magenta: '#d9149f',
                    pink: '#ec4899'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
