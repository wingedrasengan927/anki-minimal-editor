import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: false,
    rollupOptions: {
      external: ["open"],
    },
  },
});
