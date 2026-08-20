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

/**
 * Which client this is, as the backend's `ClientPlatform` enum spells it.
 *
 * The server stamps it onto everything it records about a request (comments,
 * feedback, searches, sessions, watch activity) so the admin can tell website
 * traffic from app traffic. It falls back to a user-agent sniff when the
 * header is missing, so this is an accuracy improvement rather than a
 * requirement — which is exactly why it goes on EVERY request, including the
 * unauthenticated ones, instead of only where it seems interesting.
 */
export const CLIENT_PLATFORM = "WEB";
export const CLIENT_PLATFORM_HEADER = "X-Client-Platform";

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

/**
 * The slice of `RequestOptions` a *service method* takes from its caller.
 *
 * React Query hands its `AbortSignal` to the query function; a service that
 * accepts this can pass it the rest of the way down to axios, which is what
 * makes a superseded search actually stop instead of running to completion.
 */
export interface RequestSignalOptions {
  signal?: AbortSignal;
}

const axiosClient = axios.create({ baseURL: API_BASE_URL });

axiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Outside the skipAuth branch on purpose: the platform of a request has
  // nothing to do with whether it carries a token, and the public routes
  // (peak users, a title's comment thread) are web traffic too.
  config.headers.set(CLIENT_PLATFORM_HEADER, CLIENT_PLATFORM);

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
    // Bare `axios`, not `axiosClient` — a refresh must never re-enter the
    // interceptor that could trigger another refresh. That also means the
    // platform header has to be set by hand here.
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { headers: { [CLIENT_PLATFORM_HEADER]: CLIENT_PLATFORM } },
    );
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
    // A cancelled request is not a failure — it's a caller (React Query)
    // aborting a request whose answer nobody wants any more. Rethrow it
    // untouched so it stays recognisable as a cancellation; dressed up as an
    // ApiError it would look like a real error to anything that reports one.
    if (axios.isCancel(err)) throw err;

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
