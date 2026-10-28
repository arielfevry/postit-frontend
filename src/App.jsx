import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL;

export default function App() {
  const [status, setStatus] = useState('loading...');

  useEffect(() => {
    fetch(`${API}/api/ping`)
      .then((r) => r.json())
      .then((d) => setStatus(`${d.message} (db: ${d.db})`))
      .catch(() => setStatus('API unreachable'));
  }, []);

  return <h1>PostIt! {status}</h1>;
}
