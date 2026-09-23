import { vlyPlugin } from "@vly-ai/integrations";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, type Plugin } from "vite";

/**
 * The static shell ships root-relative og:image/twitter:image so local dev
 * works without an origin. Crawlers need absolute URLs and do not run the JS
 * that rewrites them — bake SITE_URL in at build time.
 */
function absoluteOgImages(origin: string): Plugin {
  return {
    name: "absolute-og-images",
    transformIndexHtml(html) {
      if (!origin) return html;
      return html.replaceAll(
        /content="(\/(?:og|media)\/[^"]+)"/g,
        (_match, url: string) => `content="${origin}${url}"`,
      );
    },
  };
}

// Same resolution as generate-sitemap: env override, else the stable
// production origin, so Vercel builds without variables stay correct.
const siteUrl =
  (process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? "").replace(/\/$/, "") ||
  "https://henry-builds.vercel.app";

/**
 * Vly's build plugin injects its editor integration into index.html. That is
 * useful on managed Vly deployments, but it otherwise makes every public
 * visitor preload hundreds of kilobytes of editor-only JavaScript.
 *
 * VITE_VLY_APP_ID is the same opt-in used by src/instrumentation.tsx.
 */
const enableVlyBuildTools = Boolean(process.env.VITE_VLY_APP_ID);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    ...(enableVlyBuildTools ? [vlyPlugin()] : []),
    react(),
    tailwindcss(),
    absoluteOgImages(siteUrl),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Enable source maps for better debugging (disable in production if needed)
    sourcemap: false,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching and lazy loading
        manualChunks: {
          // Vendor chunks for large libraries
          'react-vendor': ['react', 'react-dom', 'react-router'],
          // Form libraries stay isolated behind authenticated/editor routes.
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
        // Optimize chunk size
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit for better chunking
    chunkSizeWarningLimit: 1000,
    // Target modern browsers for better optimization
    target: 'esnext',
    // Minify options - using esbuild (faster than terser)
    minify: 'esbuild',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router',
      '@convex-dev/auth/react',
    ],
  },
  // Keep the managed preview server from injecting HMR into production builds.
  server: {
    hmr: false,
  },
});
