import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',           // Янги версия → дарҳол кешни алмаштириш
      includeAssets: ['favicon.svg', 'icons.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Safar Taksi — нархни ўзингиз белгиланг',
        short_name: 'Safar Taksi',
        description: 'Нархни ўзингиз белгилайдиган такси хизмати',
        lang: 'uz',
        theme_color: '#0E9384',
        background_color: '#0E9384',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Web Push хандлерлари — генерация қилинган SW ичига importScripts билан қўшилади
        importScripts: ['push-sw.js'],
        // Эски кешларни автоматик ўчиради — фойдаланувчи бирор нарса қилмайди
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // /api/ ва /socket.io/ — ҳеч қачон кешланмайди (доим серверга)
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(?:[a-z]+)\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 600,
  },
})
