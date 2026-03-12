/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        // Brand
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          soft: 'var(--primary-soft-bg)',
        },
        // Status
        success: {
          DEFAULT: 'var(--success)',
          bg: 'var(--success-bg)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          bg: 'var(--warning-bg)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          bg: 'var(--danger-bg)',
        },
        info: {
          DEFAULT: 'var(--info)',
          bg: 'var(--info-bg)',
        },
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        disabled: 'var(--text-disabled)',
      },
      backgroundColor: {
        app: 'var(--bg-app)',
        surface: 'var(--bg-surface)',
        card: 'var(--bg-card)',
        'card-hover': 'var(--bg-card-hover)',
        muted: 'var(--bg-muted)',
        overlay: 'var(--bg-overlay)',
        sidebar: 'var(--sidebar-bg)',
        'input-field': 'var(--input-bg)',
        'table-header': 'var(--table-header-bg)',
        'table-row': 'var(--table-row-bg)',
        'table-row-hover': 'var(--table-row-hover)',
        'kanban-board': 'var(--kanban-board-bg)',
        'kanban-column': 'var(--kanban-column-bg)',
        'kanban-header': 'var(--kanban-column-header)',
        'kanban-card': 'var(--kanban-card-bg)',
      },
      borderColor: {
        DEFAULT: 'var(--border)',
        theme: 'var(--border)',
        strong: 'var(--border-strong)',
        input: 'var(--input-border)',
        table: 'var(--table-border)',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-hover)',
        'glow': '0 0 16px rgba(139,92,246,0.35)',
      },
    },
  },
  plugins: [],
}
