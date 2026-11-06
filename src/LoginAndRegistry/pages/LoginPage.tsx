
import { useState, type SubmitEvent, type ChangeEvent, use } from "react";
import { apiFetch, type AuthResponse } from "../utils/api";
import { saveSession } from "../utils/session";
const API = import.meta.env.VITE_API_URL;

function startSession ({token, user}: AuthResponse): void {
  saveSession({
    token,
    id: user.id,
    name: user.name,
  });
}

export default function LoginPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const[message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const[isLoading, setIsLoading] = useState(false);

  //login form
  const[loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setPassword] = useState("");

  //registration form
  const[regName, setRegName] = useState("");
  const[regEmail, setRegEmail] = useState("");
  const[regPassword, setRegPassword] = useState("");

  function handleSetLoginEmail(e: ChangeEvent<HTMLInputElement>) : void {
    setLoginEmail(e.target.value)
  }
  
  function handleSetPassword(e: ChangeEvent<HTMLInputElement>): void{
    setPassword(e.target.value);
  }

  //login function
  async function doLogin(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setSuccessMessage("");

    try{
      const res = await apiFetch<AuthResponse>("api/auth/login", {
        method: "POST",
        body: {login: loginEmail, password: loginPassword}
      });

      if(!res.ok) {
        setMessage(res.error ?? "Login failed");
      }else{
        startSession(res.data);
        window.location.href = "/board";
      }
    } catch (error: unknown) {
      setMessage((error as Error).toString());
    }finally {
      setIsLoading(false);
    }
  } 

  //register 
  async function doRegister(event:SubmitEvent): Promise<void> {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setSuccessMessage("");

    try{
      const res = await apiFetch<AuthResponse>("api/users", {
        method: "POST",
        body: {name: regName, email: regEmail, password: regPassword},
      });

      if(!res.ok){
        setMessage(res.error ?? "Failed Registration. Please try again.");
      }else { 
        startSession(res.data);
        setSuccessMessage("Account Created Succesfully. Logging in...");
        setTimeout(() => {
          window.location.href = "/board";
        }, 1000);
      }
    } catch (error: unknown) {
      setMessage((error as Error).toString());
    } finally {
      setIsLoading(false);
    }
  }

  return (
      <div className='min-h-screen felx items-center justify-center bg-white-100'>
        <div className="bg-white p-8 rounded-lg shadow-lg w-full">
          <h2 className="text-2x1 font-bold mb-6 text-center text-gray-800">
            Login
          </h2>
        </div>
      </div>
  );
}