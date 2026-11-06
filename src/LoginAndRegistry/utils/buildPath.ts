export function buildPath(route: string): string {
    const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

    const cleanBase = baseUrl.replace(/\/$/, "");
    const cleanRoute = route.replace(/^\//, "");

    return `${cleanBase}/${cleanRoute}`;
}