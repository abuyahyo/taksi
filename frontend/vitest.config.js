// Vitest — фақат соф util модулларни тестлаймиз (React/PWA плагинларсиз)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
