import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia(),
        react(),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],
    build: {
        target: 'es2020',
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('lucide-react')) return 'vendor-lucide';
                    if (id.includes('react-dom') || id.includes('react/') || id.includes('@inertiajs/react')) return 'vendor-react';
                    if (id.includes('@radix-ui') || id.includes('sonner')) return 'vendor-ui';
                },
            },
        },
    },
});
