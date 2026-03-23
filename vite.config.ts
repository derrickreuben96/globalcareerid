import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean);

  // Add Sentry plugin for source map uploads only when auth token is present
  if (process.env.VITE_SENTRY_AUTH_TOKEN) {
    import("@sentry/vite-plugin").then(({ sentryVitePlugin }) => {
      plugins.push(
        sentryVitePlugin({
          authToken: process.env.VITE_SENTRY_AUTH_TOKEN,
          org: process.env.VITE_SENTRY_ORG,
          project: process.env.VITE_SENTRY_PROJECT,
        })
      );
    });
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
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },
    build: {
      sourcemap: !!process.env.VITE_SENTRY_AUTH_TOKEN,
    },
  };
});
