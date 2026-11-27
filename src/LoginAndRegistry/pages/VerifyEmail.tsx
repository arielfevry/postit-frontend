import { useEffect, useRef, useState, type ReactNode, type SubmitEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../utils/api";

// The address of the account waiting to be verified. LoginPage saves it after registering
// so this page knows where to send the email. sessionStorage clears when the tab closes.
const PENDING_EMAIL_KEY = "pending_verification_email";
const RESEND_COOLDOWN_SECONDS = 60; // matches backend's 1 minute cooldown

export function rememberEmailForVerification(email: string): void {
    try { sessionStorage.setItem(PENDING_EMAIL_KEY, email.trim()); } catch { /* storage unavailable */ }
}

function getPendingEmail(): string {
    try { return sessionStorage.getItem(PENDING_EMAIL_KEY) ?? ""; } catch { return ""; }
}

function forgetPendingEmail(): void {
    try { sessionStorage.removeItem(PENDING_EMAIL_KEY); } catch { /* storage unavailable */ }
}

/** Turns API failures into messages a user can act on. */
function sendErrorMessage(status: number, error?: string): string {
    if (status === 429) return "Too many emails requested. Please wait a few minutes and try again.";
    if (status === 503) return "Verification emails can't be sent right now. Please try again later.";
    if (status === 400) return "Please enter a valid email address.";
    return error ?? "Something went wrong. Please try again.";
}

type LinkState = "verifying" | "verified" | "invalid";

export default function VerifyEmail() {
    const [params, setParams] = useSearchParams();

    // Opened from the emailed link: /verify-email?token=...
    const [token] = useState(() => params.get("token") ?? "");
    const [linkState, setLinkState] = useState<LinkState>("verifying");

    // Opened after registering: send the email and offer to resend it.
    const [email, setEmail] = useState(getPendingEmail);
    const [editingEmail, setEditingEmail] = useState(() => !getPendingEmail());
    const [sending, setSending] = useState(false);
    const [sentTo, setSentTo] = useState("");
    const [cooldown, setCooldown] = useState(0);
    const [message, setMessage] = useState("");
    const firstLoad = useRef(true);
    const verifyStarted = useRef(false);

    async function send(address: string): Promise<void> {
        const to = address.trim();
        if (!to) return;
        setSending(true);
        setMessage("");
        try {
            const res = await api.resendVerification(to);
            if (res.ok) {
                rememberEmailForVerification(to);
                setSentTo(to);
                setEditingEmail(false);
                setCooldown(RESEND_COOLDOWN_SECONDS);
            } else {
                setMessage(sendErrorMessage(res.status, res.error));
            }
        } catch {
            setMessage("Could not reach the PostIt! server.");
        } finally {
            setSending(false);
        }
    }

    // Keep the token out of the address bar and browser history.
    useEffect(() => {
        if (token) setParams({}, { replace: true });
    }, [token, setParams]);

    // Arrived from the email link: verify the account.
    // A token works only once, so this must run exactly once. React's StrictMode runs effects
    // twice in development; the ref (which survives that) stops a second request, and the
    // result of the first one is always kept.
    useEffect(() => {
        if (!token || verifyStarted.current) return;
        verifyStarted.current = true;
        api.verifyEmail(token)
            .then((res) => {
                if (res.ok) {
                    forgetPendingEmail();
                    setLinkState("verified");
                } else {
                    setLinkState("invalid");
                }
            })
            .catch(() => setLinkState("invalid"));
    }, [token]);

    // Arrived without a token (e.g. right after registering): send the email once.
    useEffect(() => {
        if (token || !firstLoad.current) return;
        firstLoad.current = false; // the ref survives React's double effect run in development
        const pending = getPendingEmail();
        if (pending) send(pending);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // Count down until another email can be requested.
    useEffect(() => {
        if (cooldown <= 0) return;
        const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => window.clearTimeout(t);
    }, [cooldown]);

    function submitEmail(e: SubmitEvent): void {
        e.preventDefault();
        send(email);
    }

    const card = (children: ReactNode) => (
        <main className="container d-flex justify-content-center align-items-center  pb-app pb-surface--cork" style={{minHeight: "100vh"}}>
            <div id="verifyDiv" className="p-4 p-md-5 w-100 pb-note pb-note--paper" style={{maxWidth: "480px"}}>
                {children}
            </div>
        </main>
    );

    /* ---------- opened from the emailed link ---------- */

    if (token && linkState === "verifying") {
        return card(
            <div className="text-center">
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                <span>Verifying your email...</span>
            </div>
        );
    }

    if (token && linkState === "verified") {
        return card(
            <div className="text-center">
                <h1 className="h4 fw-bold text-body-emphasis mb-2">Email verified!</h1>
                <p className="mb-4">Your PostIt! account is ready. Log in to start pinning!</p>
                <button
                type="button"
                id="goToLogin"
                className="btn btn-warning btn-lg w-100 fw-semibold"
                onClick={() => window.location.href = "/"}
                >
                    Go to Login
                </button>
            </div>
        );
    }

    /* ---------- waiting for user to click the link (or the link didn't work) ---------- */

    return card(
        <>
            <h1 className="h4 fw-bold text-body-emphasis mb-2 text-center">Verify your email</h1>

            {token && linkState === "invalid" && (
                <div className="alert alert-warning text-center fw-medium" role="alert">
                    That verification link is invalid or has expired. Send yourself a new one below.
                </div>
            )}

            {!editingEmail && sentTo ? (
                <p className="text-center mb-4" role="status" aria-live="polite">
                    We sent a verification link to <strong>{sentTo}</strong>.<br />
                    Click the link in that email to verify your account. It expires in 24 hours.
                </p>
            ) : (
                <p className="text-center mb-4">
                    Enter the email you signed up with and we'll send you a verification link.
                </p>
            )}

            {editingEmail || !sentTo ? (
                <form onSubmit={submitEmail}>
                    <div className="form-floating mb-3">
                        <input
                        type="email"
                        className="form-control"
                        id="verifyEmail"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        />
                        <label htmlFor="verifyEmail">
                            <i className="bi bi-envelope me-2" aria-hidden="true"></i> Email
                        </label>
                    </div>
                    <button
                    type="submit"
                    id="sendVerification"
                    className="btn btn-warning btn-lg w-100 fw-semibold d-flex align-items-center justify-content-center gap-2"
                    disabled={sending || cooldown > 0}
                    >
                        {sending ? "Sending..." : cooldown > 0 ? `Send again in ${cooldown}s` : "Send verification email"}
                    </button>
                </form>
            ) : (
                <>
                    <button
                    type="button"
                    id="resendVerification"
                    className="btn btn-warning btn-lg w-100 fw-semibold d-flex align-items-center justify-content-center gap-2"
                    disabled={sending || cooldown > 0}
                    onClick={() => send(sentTo)}
                    >
                        {sending ? "Sending..." : cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend verification email"}
                    </button>
                    <p className="text-center small mt-3 mb-0">
                        Wrong address?{" "}
                        <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => setEditingEmail(true)}>
                            Use a different email
                        </button>
                    </p>
                </>
            )}

            {message && (
                <div className="alert alert-danger mt-3 mb-0 text-center fw-medium" role="alert">
                    {message}
                </div>
            )}

            <footer className="mt-4 fw-bold text-center">
                Already verified?{" "}
                <button type="button" style={{border: "none"}} onClick={() => window.location.href = "/"}>
                    Log in here!
                </button>
            </footer>
        </>
    );
}
