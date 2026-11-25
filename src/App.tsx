import { ReactNode, useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Navigate, Routes } from 'react-router-dom';
import LoginPage from './LoginAndRegistry/pages/LoginPage';
import BoardPage from './board';
import Dashboard from './dashboard/Dashboard';
import ForgotPassword from './LoginAndRegistry/pages/ForgotPassword';
import { getSession } from './LoginAndRegistry/utils/session';
import ResetPassword from './LoginAndRegistry/pages/ResetPassword';

const API = import.meta.env.VITE_API_URL;

function RequireLogin ({ children }: { children: ReactNode}) {
  const s = getSession();
  console.log("RequireLogin session:", s);
  return getSession() ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/forgotpassword" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* /board creates a new blank board and moves to /board/:boardId */}
        <Route path="/board/:boardId?" element={<RequireLogin><BoardPage /></RequireLogin>} />
        <Route path="/dashboard" element={<RequireLogin> <Dashboard /> </RequireLogin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
