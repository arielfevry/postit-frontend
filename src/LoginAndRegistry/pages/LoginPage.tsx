
import { useState, type FormEvent, type ChangeEvent, use } from "react";
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