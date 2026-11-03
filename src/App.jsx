import { useEffect, useState } from 'react';
import BoardPage from './board';

const API = import.meta.env.VITE_API_URL;

export default function App() {
  // /board or /board/:id opens the board (BoardPage reads the id from the URL)
  if (window.location.pathname.startsWith('/board')) return <BoardPage />;
  return <ApiStatus />;
}

function ApiStatus() {
  const [status, setStatus] = useState('loading...');

  useEffect(() => {
    fetch(`${API}/api/ping`)
      .then((r) => r.json())
      .then((d) => setStatus(`${d.message} (db: ${d.db})`))
      .catch(() => setStatus('API unreachable'));
  }, []);

  return (
    <>
      <h1>Testing PostIt! {status}</h1>
      <p>
        <a href="/board">Open a board</a>
      </p>
    </>
  );
}
