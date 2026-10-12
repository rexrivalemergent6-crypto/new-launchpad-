/** @type {import('tailwindcss').Config} */
module.exports = {
    blocklist: ["overline"],
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            colors: {
                ink: "#0A0F16",
                panel: "#0E141D",
                raise: "#121A26",
                line: "rgba(148,163,184,0.14)",
                mint: {
                    DEFAULT: "#4ADE80",
                    bright: "#6EE7A0",
                    dim: "#2F9E5F",
                    deep: "#0F2A1E"
                },
                amberx: "#D9A33C",
                tealx: "#2DD4BF",
                yel: "#E7C85F",
                bluc: "#5B8DEF",
                fog: "#8B93A7",
                snow: "#E8EDF5"
            },
            fontFamily: {
                sans: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
                mono: ["'JetBrains Mono'", "ui-monospace", "monospace"]
            },
            keyframes: {
                marquee: {
                    from: { transform: "translateX(0)" },
                    to: { transform: "translateX(-50%)" }
                },
                floaty: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-8px)" }
                },
                blink: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.25" }
                },
                shimmer: {
                    from: { backgroundPosition: "200% 0" },
                    to: { backgroundPosition: "-200% 0" }
                }
            },
            animation: {
                marquee: "marquee 48s linear infinite",
                floaty: "floaty 7s ease-in-out infinite",
                blink: "blink 1.6s ease-in-out infinite",
                shimmer: "shimmer 6s linear infinite"
            }
        }
    },
    plugins: [require("tailwindcss-animate")],
};
