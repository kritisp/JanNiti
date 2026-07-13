import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { config } from "./config";

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any> | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

const api = axios.create({
  baseURL: config.apiUrl,
  timeout: 15000, // 15 seconds request timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach headers (e.g., Bearer auth tokens)
api.interceptors.request.use(
  (axiosConfig: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("auth_token");
    if (token && axiosConfig.headers) {
      axiosConfig.headers.Authorization = `Bearer ${token}`;
    }
    return axiosConfig;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Standardize API error formatting
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Return standard response directly
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    let normalizedError: ApiError = {
      code: "INTERNAL_ERROR",
      message: "An unexpected client-side exception occurred.",
      details: null,
    };

    if (error.response?.data?.error) {
      // Backend returned custom structured error payload
      normalizedError = error.response.data.error;
    } else if (error.code === "ECONNABORTED") {
      normalizedError = {
        code: "TIMEOUT_ERROR",
        message: "The server took too long to respond. Please try again.",
        details: null,
      };
    } else if (error.request) {
      // Request sent but server was unreachable
      normalizedError = {
        code: "NETWORK_ERROR",
        message: "Cannot connect to server. Please check your internet connectivity.",
        details: null,
      };
    } else {
      // Setup error before transmitting
      normalizedError = {
        code: "SETUP_ERROR",
        message: error.message,
        details: null,
      };
    }

    // Centrally log error trace in console
    console.error(
      `[API Error] [${normalizedError.code}] ${normalizedError.message}`,
      normalizedError.details || ""
    );

    return Promise.reject(normalizedError);
  }
);

export default api;
