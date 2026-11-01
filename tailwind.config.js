/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // 本作专用色板：深色技术面板 + 单一红色强调（9.5 / V1.8）
        ink: {
          900: '#0C1013',
          800: '#12161A',
          700: '#1A1F26',
          600: '#242B33',
          500: '#333C47',
        },
        westlake: '#2E7D6F',
        qiantang: '#1B5FA8',
        asiainfo: '#6B4E9B',
        gain: '#2FA36B',
        loss: '#D93A2B',
        gold: '#E0A344',
        cyan: '#4EC5D6',
        paper: '#F5F0E6',
      },
      fontFamily: {
        sans: [
          'PingFang SC',
          'Microsoft YaHei',
          'Hiragino Sans GB',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'DIN Alternate',
          'SF Mono',
          'JetBrains Mono',
          'ui-monospace',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        // 界面统一乘全局倍率（9.1 V1.9）：棋盘 600 → 16px，棋盘 1200 → 33px
        'game-xs': ['12px', { lineHeight: '16px' }],
        'game-sm': ['14px', { lineHeight: '20px' }],
        'game-base': ['15px', { lineHeight: '22px' }],
        'game-lg': ['18px', { lineHeight: '26px' }],
        'game-xl': ['24px', { lineHeight: '32px' }],
        'game-2xl': ['30px', { lineHeight: '38px' }],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        panel: '0 8px 30px -12px rgba(0,0,0,0.65)',
        inset: 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
      },
      spacing: {
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-t': 'env(safe-area-inset-top)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(.94) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        'pop-in': 'pop-in .22s cubic-bezier(.22,1,.36,1)',
        'slide-up': 'slide-up .28s cubic-bezier(.22,1,.36,1)',
        'sweep': 'sweep 1.6s linear infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
