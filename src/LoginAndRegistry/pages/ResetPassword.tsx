import { HtmlHTMLAttributes, SyntheticEvent, useEffect, useState } from "react";
import { api } from "../utils/api";
import { useSearchParams } from "react-router-dom";

export default function ResetPassword() {
    const [params, setParams] = useSearchParams();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const [token] = useState(() => params.get("token") ?? "");
    useEffect(() => {
        setParams({}, {replace: true});
    }, [setParams])

    async function handleSubmit(e: SyntheticEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        setMessage("");

        if (password !== confirm) return setMessage("Passwords must match");

        setLoading(true);

        if(password == confirm){
            try {
                const res = await api.resetPassword(token, password);

                if(res.status === 204) {
                    setMessage("New password set! Sending you to the Login Page...");
                    window.location.href = '/login';
                    return;
                }
                else {
                    setMessage(res.error ?? "Something went wrong.");
                }
                
            } catch (error) {
                setMessage((error as Error).toString());
            } finally {
                setLoading(false);
            }
        }
    }

    if(!token) {
        return (
            <main className="container d-flex justify-content-center align-items-center  pb-app pb-surface--cork" style={{minHeight: "100vh"}}>
                <div id="loginDiv" className="p-4 p-md-5 w-100 pb-note pb-note--paper" style={{maxWidth: "480px"}}>
                    <h2 className=" justify-content-center text-center fw-bold"> Link has expired.</h2>
                </div>
            </main>
        );
    }

    return (
        <main className="container d-flex justify-content-center align-items-center  pb-app pb-surface--cork" style={{minHeight: "100vh"}}>
            
            <div id="loginDiv" className="p-4 p-md-5 w-100 pb-note pb-note--paper" style={{maxWidth: "480px"}}>
                <h1 className="h4 fw-bold text-body-emphasis mb-2 text-center ">Enter a New Password</h1>
                <form onSubmit={handleSubmit}>
                    <div className="form-floating mb-3">
                        <input
                        type="password"
                        className="form-control"
                        placeholder="New Password"
                        value={password}
                        required
                        onChange={(e) => setPassword(e.target.value)}
                        />
                        <label htmlFor="newPassword">
                        <i className="bi bi-person me-2" aria-hidden="true"></i> New Password
                        </label>
                    </div>
                    <div className="form-floating mb-3">
                        <input
                        type="password"
                        className="form-control"
                        placeholder="Confirm Password"
                        value={confirm}
                        required
                        onChange={(e) => setConfirm(e.target.value)}
                        />
                        <label htmlFor="confirmPassword">
                        <i className="bi bi-person me-2" aria-hidden="true"></i> Confirm Password
                        </label>
                   </div>
                    <button className="btn btn-lg btn-warning w-100" disabled={loading}>{loading ? "Saving..." : "Reset Password"}</button>
                    <p role='status' className=" mt-2 ">{message}</p>
                </form>
            </div>
        </main>
    );
}