import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean);

  // Add Sentry plugin for source map uploads only when auth token is present
  if (process.env.VITE_SENTRY_AUTH_TOKEN) {
    plugins.push(
      sentryVitePlugin({
        authToken: process.env.VITE_SENTRY_AUTH_TOKEN,
        org: process.env.VITE_SENTRY_ORG,
        project: process.env.VITE_SENTRY_PROJECT,
      })
    );
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins,
    optimizeDeps: {
      include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
    resolve: {
      alias: [
        {
          find: "@",
          replacement: path.resolve(__dirname, "./src"),
        },
        {
          find: /^react$/,
          replacement: path.resolve(__dirname, "./node_modules/react/index.js"),
        },
        {
          find: /^react-dom$/,
          replacement: path.resolve(__dirname, "./node_modules/react-dom/index.js"),
        },
        {
          find: /^react\/jsx-runtime$/,
          replacement: path.resolve(__dirname, "./node_modules/react/jsx-runtime.js"),
        },
        {
          find: /^react\/jsx-dev-runtime$/,
          replacement: path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime.js"),
        },
      ],
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
    build: {
      sourcemap: !!process.env.VITE_SENTRY_AUTH_TOKEN,
    },
  };
});
