/**
 * Strictly-typed application environment settings.
 */
interface AppConfig {
  apiUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

export const config: AppConfig = {
  // If VITE_API_URL is empty or undefined, the app defaults to empty string
  // which routes calls through Vite proxy configuration (/api) in development.
  apiUrl: import.meta.env.VITE_API_URL || "",
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
