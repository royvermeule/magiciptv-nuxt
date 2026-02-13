// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/eslint", "@nuxt/icon"],
  eslint: {
    config: {
      standalone: false,
    },
  },
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [
      tailwindcss() as any,
    ],
  },
  runtimeConfig: {
    databaseUrl: "",
    jwtSecret: "",
    smtpHost: "",
    smtpPort: "",
    smtpFrom: "",
    appUrl: "",
  },
});
