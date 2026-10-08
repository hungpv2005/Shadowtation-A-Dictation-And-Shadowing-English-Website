'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Health = { status: string; database: string; timestamp: string };

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Health>('/health')
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold">Shadowtation</h1>
      <p className="mt-1 text-gray-600">Dictation &amp; Shadowing English</p>

      <section className="mt-6 rounded border p-4">
        <h2 className="font-semibold">Trạng thái kết nối Core API</h2>
        {health && (
          <p className="mt-2 text-green-700">
            API: {health.status} · Database: {health.database}
          </p>
        )}
        {error && <p className="mt-2 text-red-700">Không kết nối được: {error}</p>}
        {!health && !error && <p className="mt-2 text-gray-500">Đang kiểm tra...</p>}
      </section>
    </main>
  );
}
