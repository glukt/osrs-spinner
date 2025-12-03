/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                osrs: {
                    bg: '#1e2124', // Modern dark slate
                    panel: '#3c352d', // Classic brown, darkened
                    border: '#5b4028', // OSRS border color
                    gold: '#d4af37', // Metallic gold text
                    accent: '#64748b', // Modern slate accent
                }
            },
            boxShadow: {
                'bezel': 'inset 0 0 20px #00000080, 0 10px 20px #00000080',
                'glow': '0 0 15px #d4af3780'
            }
        },
    },
    plugins: [],
}
