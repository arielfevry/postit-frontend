//user saved in the localstorage to survive

export interface Session {
    token: string;
    id: string;
    name: string;
}

const STORAGE_KEY = "user_data";

export function getSession(): Session | null {
    try { 
        const stored = localStorage.getItem(STORAGE_KEY);
        if(!stored) return null;
        const session = JSON.parse(stored) as Session;
        return session.token && session.id ? session : null;
    } catch {
        return null;
    }
}

export function saveSession(session: Session) : void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
}