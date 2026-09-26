import next from 'eslint-config-next/core-web-vitals'
import tsPlugin from '@typescript-eslint/eslint-plugin'

const config = [
  ...next,
  {
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'react/no-unescaped-entities': 'off',
      // react-hooks v7 compiler-era rules. set-state-in-effect: fixed by
      // deriving from the job-memory store / render-adjust / docs-shaped
      // async effects. purity: clock reads isolated in lib/freshness.ts.
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/purity': 'error',
    },
  },
]

export default config
