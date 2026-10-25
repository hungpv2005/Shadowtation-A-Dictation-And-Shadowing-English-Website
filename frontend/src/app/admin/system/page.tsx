'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  Activity,
  Database,
  Server,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function AdminSystemPage() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>('/health');
      setHealthData(data);
    } catch (err: any) {
      setHealthData({ status: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Hạ tầng & Giám sát Hệ thống</h1>
          <p className="mt-1 text-xs text-slate-500">
            Trạng thái kết nối cơ sở dữ liệu PostgreSQL, Redis Cache và dịch vụ AI Speech Assessment.
          </p>
        </div>

        <button
          type="button"
          onClick={loadHealth}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Kiểm tra lại (Ping)</span>
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Core Backend API
            </span>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <Server className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xl font-black text-slate-900">NestJS Hoạt động</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Port 4000 • Modular Monolith Architecture</p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cơ sở dữ liệu
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Database className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xl font-black text-slate-900">PostgreSQL 15</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">TypeORM Connection Pool Active</p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Chấm phát âm AI
            </span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            <span className="text-xl font-black text-slate-900">Azure Speech SDK</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Pronunciation Assessment Ready</p>
        </div>
      </div>

      {/* Raw Health JSON Response */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Phản hồi chi tiết từ /api/v1/health</h3>
        <p className="mt-1 text-xs text-slate-500">Dữ liệu kiểm tra tính sẵn sàng (Readiness check) của máy chủ.</p>

        <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-900 p-5 font-mono text-xs text-emerald-400">
          {loading ? 'Đang gửi ping…' : JSON.stringify(healthData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
