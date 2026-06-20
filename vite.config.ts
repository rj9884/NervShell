import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        outDir: 'dist/client',
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src/client'),
        },
    },
    server: {
        watch: {
            ignored: ['**/.sessions.json', '**/dist/**', '**/node_modules/**'],
        },
        proxy: {
            '/message': 'http://localhost:3000',
            '/history': 'http://localhost:3000',
            '/clear': 'http://localhost:3000',
            '/api': 'http://localhost:3000',
        },
    },
});
