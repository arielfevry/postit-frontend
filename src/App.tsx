import { ReactNode, useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Navigate, Routes } from 'react-router-dom';
import LoginPage from './LoginAndRegistry/pages/LoginPage';
import BoardPage from './board';
import { getSession } from './LoginAndRegistry/utils/session';

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
        {/* /board creates a new blank board and moves to /board/:boardId */}
        <Route path="/board/:boardId?" element={<RequireLogin><BoardPage /></RequireLogin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
