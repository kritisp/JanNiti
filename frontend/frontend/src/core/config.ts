/**
 * Strictly-typed application environment settings.
 */
interface AppConfig {
  apiUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

export const config: AppConfig = {
  // In development, keep the API base URL empty so all browser requests remain
  // same-origin and are handled by the Vite proxy.
  // In production, VITE_API_URL can be set to the deployed backend URL.
  apiUrl: import.meta.env.DEV ? "" : import.meta.env.VITE_API_URL || "",
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
