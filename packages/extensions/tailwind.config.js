/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}', './popup.html'],
  theme: {
    extend: {
      colors: {
        'an-bg':       'var(--an-bg)',
        'an-bg2':      'var(--an-bg2)',
        'an-bg3':      'var(--an-bg3)',
        'an-border':   'var(--an-border)',
        'an-border2':  'var(--an-border2)',
        'an-text':     'var(--an-text)',
        'an-text2':    'var(--an-text2)',
        'an-text3':    'var(--an-text3)',
        'an-accent':   'var(--an-accent)',
        'an-accent2':  'var(--an-accent2)',
        'an-accentbg': 'var(--an-accentbg)',
        'an-green':    'var(--an-green)',
        'an-greenbg':  'var(--an-greenbg)',
      },
      fontFamily: {
        sans: ['var(--an-font)', 'system-ui', 'sans-serif'],
        mono: ['var(--an-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
