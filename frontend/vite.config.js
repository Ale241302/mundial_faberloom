import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En dev, el front (5173) habla con el backend Django (8200) por proxy /api.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET || "http://localhost:8200",
        changeOrigin: true,
      },
    },
  },
  preview: { port: 3000, host: true },
});
