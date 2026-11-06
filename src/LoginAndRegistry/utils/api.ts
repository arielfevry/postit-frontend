import { buildPath } from "./buildPath";
import { clearSession, getSession } from "./session";

//API JSON
export interface ApiResult<T> {
    ok: boolean;
    status: number;
    data: T;
    error?: string;
}

//user return by api
export interface ApiUser {
    id: string;
    name: string;
    email: string;
}

export interface AuthResponse {
    token: string;
    user: ApiUser;
}

//api request
export async function apiFetch<T> (
    route: string, options: {method?: string, body?: unknown} = {}
) : Promise<ApiResult<T>> {
    const session = getSession();

    const headers: Record<string, string> = {};
    if(options.body === undefined) headers["Content-Type"] = "application/json"
    if(session) headers["Authorization"] = `Bearer ${session.token}`;

    const response = await fetch(buildPath(route), {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    //204 error no content
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if(response.status === 401 && session) {
        //expired token
        clearSession();
        window.location.href = "/";
    }
    
    return { 
        ok: response.ok,
        status: response.status,
        data,
        error: response.ok ? undefined : data.error ?? `Request failed (${response.status})`,
    }
}
