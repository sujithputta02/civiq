'use client';

import React, { useEffect, useState } from 'react';
import { GlassCard } from '@civiq/ui';
import { ShieldCheck, AlertTriangle, HelpCircle, Activity, Clock } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';

interface MythStats {
  totalQueries: number;
  trueCount: number;
  falseCount: number;
  mixedCount: number;
  recentQueries: {
    claim: string;
    classification: string;
    timestamp: string;
  }[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<MythStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
        const res = await fetch(`${apiUrl}/api/admin/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Poll every 5 seconds for live data updates
    const interval = setInterval(fetchStats, 5000);

    return () => clearInterval(interval);
  }, []);

  const getClassificationColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
      case 'TRUE': 
        return 'text-green-500 bg-green-50 border-green-200';
      case 'FALSE': 
        return 'text-red-500 bg-red-50 border-red-200';
      case 'MISLEADING':
      case 'UNVERIFIED':
      case 'MIXED': 
        return 'text-amber-500 bg-amber-50 border-amber-200';
      default: 
        return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB]"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <nav className="border-b border-white/30 bg-white/40 backdrop-blur-md px-8 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-primary">Civiq<span className="text-accent-primary">.</span> <span className="text-sm font-medium text-slate-500 tracking-normal ml-2 border-l border-slate-300 pl-3">Admin Observability</span></Link>
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live Feed Connected
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Activity className="text-blue-500" size={36} />
            Misinformation Radar
          </h1>
          <p className="text-secondary">Real-time aggregation of myth verification requests powered by Pub/Sub and Gemini.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <GlassCard className="p-6 border-l-4 border-l-blue-500">
            <p className="text-sm font-bold text-slate-500 mb-1">TOTAL QUERIES</p>
            <p className="text-4xl font-black text-slate-800">{stats?.totalQueries || 0}</p>
          </GlassCard>
          <GlassCard className="p-6 border-l-4 border-l-red-500">
            <p className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" /> DISINFORMATION
            </p>
            <p className="text-4xl font-black text-slate-800">{stats?.falseCount || 0}</p>
          </GlassCard>
          <GlassCard className="p-6 border-l-4 border-l-green-500">
            <p className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-2">
              <ShieldCheck size={16} className="text-green-500" /> FACTUAL
            </p>
            <p className="text-4xl font-black text-slate-800">{stats?.trueCount || 0}</p>
          </GlassCard>
          <GlassCard className="p-6 border-l-4 border-l-amber-500">
            <p className="text-sm font-bold text-slate-500 mb-1 flex items-center gap-2">
              <HelpCircle size={16} className="text-amber-500" /> MIXED CONTEXT
            </p>
            <p className="text-4xl font-black text-slate-800">{stats?.mixedCount || 0}</p>
          </GlassCard>
        </div>

        <h2 className="text-2xl font-bold mb-6">Recent Verifications Feed</h2>
        <div className="space-y-4">
          {!stats?.recentQueries?.length ? (
             <GlassCard className="p-12 text-center text-slate-500">
               No queries have been made yet. Test the Myth-Check feature to see data appear here in real-time!
             </GlassCard>
          ) : (
            stats.recentQueries.map((query, idx) => (
              <GlassCard key={idx} className="p-6 flex items-start gap-4 hover:bg-white/60 transition-colors">
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getClassificationColor(query.classification)} shrink-0 mt-1`}>
                  {query.classification}
                </div>
                <div>
                  <p className="font-medium text-lg text-slate-800 leading-snug">"{query.claim}"</p>
                  <p className="text-sm text-slate-400 mt-2 flex items-center gap-1">
                    <Clock size={14} /> 
                    {new Date(query.timestamp).toLocaleString()}
                  </p>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
