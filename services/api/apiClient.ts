/**
 * Axios client wired up to the real MyanFlix NestJS backend. Attaches the
 * stored access token, and transparently retries once (via a single-flight
 * refresh) on a 401 before giving up.
 *
 * Every endpoint responds with `{ success: true, data }` on success or
 * `{ success: false, message }` on failure — this client unwraps that
 * envelope so callers just get `data` back (or a thrown ApiError).
 */
import axios, {
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { tokenStore, notifyUnauthorized } from "@/lib/auth/token-store";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

/** Backend origin (no /api suffix) — resolves relative asset paths like /storage/... into absolute URLs. */
export const API_ORIGIN = new URL(API_BASE_URL).origin;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions extends Omit<AxiosRequestConfig, "params"> {
  params?: object;
  /** Skip attaching the access token / triggering refresh-on-401 (auth endpoints). */
  skipAuth?: boolean;
}

const axiosClient = axios.create({ baseURL: API_BASE_URL });

axiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const skipAuth = (config as RequestOptions).skipAuth;
  if (!skipAuth) {
    const token = tokenStore.getAccessToken();
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    });
    const nextAccessToken: string | undefined =
      response.data?.data?.accessToken;
    const nextRefreshToken: string | undefined =
      response.data?.data?.refreshToken;
    if (!nextAccessToken || !nextRefreshToken) return null;

    tokenStore.setTokens(nextAccessToken, nextRefreshToken);
    return nextAccessToken;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  try {
    const response = await axiosClient.request({ url: path, ...options });
    if (response.data?.success === false) {
      throw new ApiError(
        response.data.message ?? "Request failed",
        response.status,
      );
    }
    return (response.data?.data ?? response.data) as T;
  } catch (err) {
    if (
      !axios.isAxiosError(err) ||
      err.response?.status !== 401 ||
      options.skipAuth
    ) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? err.message)
        : "Request failed";
      const status = axios.isAxiosError(err) ? (err.response?.status ?? 0) : 0;
      throw new ApiError(message, status);
    }

    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const newToken = await refreshPromise;

    if (!newToken) {
      tokenStore.clear();
      notifyUnauthorized();
      throw new ApiError("Your session has expired. Please log in again.", 401);
    }

    const retryResponse = await axiosClient.request({
      url: path,
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
    });
    if (retryResponse.data?.success === false) {
      throw new ApiError(
        retryResponse.data.message ?? "Request failed",
        retryResponse.status,
      );
    }
    return (retryResponse.data?.data ?? retryResponse.data) as T;
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", data }),
  /**
   * POST multipart/form-data (file uploads). Content-Type is deliberately NOT
   * set here — axios leaves it to the browser for FormData bodies, which is
   * the only way the boundary parameter gets filled in correctly. Same auth
   * header, envelope unwrap, and refresh-on-401 behavior as every other method.
   */
  postMultipart: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", data: formData }),
  put: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", data }),
  patch: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", data }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
