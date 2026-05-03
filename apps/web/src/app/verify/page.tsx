'use client';

import React, { useState } from 'react';
import { GlassCard, RefractiveButton } from '@civiq/ui';
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  ArrowLeft,
  Loader2,
  Bot,
  Sparkles,
} from 'lucide-react';
import { simulationAnnouncer } from '@/lib/accessibility';
import { AccessibleButton, AccessibleInput } from '@/components/AccessibleComponents';
import Link from 'next/link';
import { type VerificationResult } from '@civiq/types';

import { analytics } from '@/lib/firebase';
import { logEvent } from 'firebase/analytics';
import { useAuth } from '@/contexts/AuthContext';

export default function MythCheckPage() {
  const [claim, setClaim] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [depth, setDepth] = useState<'15s' | '1m' | 'deep'>('1m');
  const { user } = useAuth();

  const handleVerify = async () => {
    if (!claim.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      simulationAnnouncer.start('Myth Verification');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      const token = user ? await user.getIdToken() : '';
      
      const response = await fetch(`${apiUrl}/api/v1/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ claim, explanationMode: depth }),
      });
      const data = await response.json();
      setResult(data);
      simulationAnnouncer.complete('Myth Verification');

      // Log analytics event
      if (analytics) {
        logEvent(analytics, 'myth_verified', {
          claim_length: claim.length,
          classification: data.classification,
          depth: depth
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setResult({
        classification: 'UNVERIFIED',
        explanation: 'Failed to connect to the verification engine. Please try again later.',
      });
      simulationAnnouncer.error('Myth Verification', 'Engine connection failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (classification: string) => {
    switch (classification) {
      case 'VERIFIED':
        return {
          icon: <CheckCircle2 className="text-accent-verified" />,
          color: 'border-teal-200 bg-teal-50/10',
          text: 'text-accent-verified',
        };
      case 'MISLEADING':
        return {
          icon: <AlertCircle className="text-accent-urgent" />,
          color: 'border-amber-200 bg-amber-50/10',
          text: 'text-accent-urgent',
        };
      case 'FALSE':
        return {
          icon: <XCircle className="text-accent-error" />,
          color: 'border-rose-200 bg-rose-50/10',
          text: 'text-accent-error',
        };
      default:
        return {
          icon: <ShieldCheck className="text-slate-400" />,
          color: 'border-slate-200 bg-slate-50/10',
          text: 'text-slate-600',
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] py-12 px-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-secondary hover:text-primary mb-8 transition-colors"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>

        <div className="mb-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-blue-500/10 flex items-center justify-center text-accent-primary mx-auto mb-6">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Myth-Check Lab</h1>
          <p className="text-secondary">
            Paste any claim, screenshot text, or message about the election process to verify its
            accuracy with real-time AI.
          </p>
        </div>

        <GlassCard className="p-8 mb-12">
          <div className="flex justify-between items-center mb-4">
            <label htmlFor="claim-textarea" className="text-sm font-bold text-slate-500 uppercase tracking-widest">Input Claim</label>
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl" role="tablist" aria-label="Verification Depth">
              {(['15s', '1m', 'deep'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  role="tab"
                  aria-selected={depth === d}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${depth === d ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {d === '15s' ? '⚡ 15s' : d === '1m' ? '⏱️ 1m' : '📚 Deep'}
                </button>
              ))}
            </div>
          </div>
          <textarea
            id="claim-textarea"
            placeholder="Example: 'The polling date in my county has been moved to next Tuesday' or 'You need a specific local ID card to vote'..."
            className="w-full h-32 p-4 rounded-2xl bg-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-accent-primary text-lg mb-4 resize-none"
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
          />
          <div className="flex justify-end">
            <AccessibleButton
              ariaLabel={loading ? 'Analyzing your claim' : 'Verify myth with Gemini AI'}
              className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold gap-2 flex items-center justify-center w-full md:w-auto"
              onClick={handleVerify}
              disabled={loading || !claim.trim()}
              loading={loading}
              loadingText="Analyzing..."
            >
              {!loading && <Sparkles size={20} />}
              <span className="ml-2">Verify with Gemini</span>
            </AccessibleButton>
          </div>
        </GlassCard>

        {result && (
          <GlassCard
            className={`p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ${getStatusConfig(result.classification).color}`}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="shrink-0 p-2 rounded-xl bg-white/80 shadow-sm">
                {getStatusConfig(result.classification).icon}
              </div>
              <div>
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${getStatusConfig(result.classification).text} mb-1 block`}
                >
                  Classification: {result.classification}
                </span>
                <h3 className="text-2xl font-bold">Verification Result</h3>
              </div>
            </div>

            <div className="bg-white/40 rounded-2xl p-6 border border-white/30 mb-6">
              <div className="flex items-center gap-2 mb-3 text-blue-600">
                <Bot size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">AI Explanation ({depth})</span>
              </div>
              <p className="text-slate-800 text-lg leading-relaxed">{result.explanation}</p>
            </div>

            {result.source && (
              <div className="pt-6 border-t border-white/30 text-sm text-secondary flex items-center gap-2">
                <span className="font-bold">Primary Source:</span> 
                <a href={result.source.startsWith('http') ? result.source : '#'} target="_blank" className="text-blue-600 hover:underline">
                  {result.source}
                </a>
              </div>
            )}
          </GlassCard>
        )}

        <div className="mt-12">
          <h4 className="text-sm font-bold text-secondary uppercase tracking-widest mb-4">
            Why verify?
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/30 border border-white/20 text-sm">
              <p className="font-bold mb-1 text-slate-700">Avoid Voter Suppression</p>
              <p className="text-secondary">
                Misinformation often targets marginalized groups with false info about IDs or dates.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/30 border border-white/20 text-sm">
              <p className="font-bold mb-1 text-slate-700">Stay Confident</p>
              <p className="text-secondary">
                Knowing the real rules reduces polling-day anxiety and prevents procedural mistakes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
