import { ChangeEvent, ReactNode, useState, SubmitEvent } from 'react';
import { api } from '../utils/api';

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const[loading, setLoading] = useState(false);
    const[message, setMessage] = useState("");


    //sends the email inputed to the api

    async function sendEmail(e: SubmitEvent): Promise<void> {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const res = await api.forgotPassword(email);

            if (!res.ok){   //if password is incorrect then it tells you that the email wasnt valid
                setMessage("Password reset failed. Please enter a valid email");
                
               
            }else {
                setMessage("Reset link has been sent to Email"); //sends a message with the password reset link 
                window.location.href = "/login";
                console.log(res.status);
            }
        } catch (error: unknown) {//returns an error if something went wrong
            setMessage((error as Error).toString());  
        } finally {
            setLoading(false);
        }


    }


    return(
        <main className="container d-flex justify-content-center align-items-center  pb-app pb-surface--cork" style={{minHeight: "100vh"}}> 
            <div id="loginDiv" className="p-4 p-md-5 w-100 pb-note pb-note--paper" style={{maxWidth: "480px"}}>
                <form onSubmit={sendEmail}>
                    <h1 className="h4 fw-bold text-body-emphasis mb-2 text-center ">Forgot Password?</h1>
                    <div className='form-floating mb-3'>
                        <input
                        type='email'
                        className='form-control'
                        required
                        autoComplete='email'
                        placeholder='Email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        />
                        <label htmlFor="loginEmail">
                        <i className="bi bi-person me-2" aria-hidden="true"></i> Email
                        </label>
                    </ div>
                    <button className='btn btn-warning btn-large w-100 fw-semibold d-flex align-items-center justify-content-center gap-2' disabled={loading}>{loading ? "Sending..." : "Reset"} </button>
                    <p role='status' className='mt-2'>{message}</p>
                </form>
            </div>
        </main>
    )
}