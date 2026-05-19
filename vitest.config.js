import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'tests/coverage',
      include: ['js/**/*.js'],
      exclude: [
        'js/index-init.js',
        'js/map.js',
        'js/regional.js',
        'js/auth.js',
        'js/auth-admin.js',
        'js/draft.js',
      ],
    },
  },
})
