'use client';

import React, { useState } from 'react';
import { GlassCard, RefractiveButton } from '@civiq/ui';
import {
  CheckCircle2,
  ShieldCheck,
  Clock,
  ArrowRight,
  Search,
  Sparkles,
  Bot,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { simulationAnnouncer } from '@/lib/accessibility';
import { AccessibleButton } from '@/components/AccessibleComponents';

export default function LandingPage() {
  const [quickClaim, setQuickClaim] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleQuickVerify = async () => {
    if (!quickClaim.trim()) return;
    setIsVerifying(true);
    setResult(null);

    try {
      simulationAnnouncer.start('Myth Verification');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      const response = await fetch(`${apiUrl}/api/v1/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: quickClaim, explanationMode: '15s' }),
      });
      const data = await response.json();
      setResult(data.explanation);
      simulationAnnouncer.complete('Myth Verification');
    } catch (error) {
      setResult('Failed to verify. Please try the full Myth-Check Lab.');
      simulationAnnouncer.error('Myth Verification', 'Network failure');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#F5F7FB]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/30 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-100/40 blur-[120px] rounded-full" />

      <nav className="relative z-10 px-8 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold tracking-tight text-primary">
          Civiq<span className="text-accent-primary">.</span>
        </div>
        <div className="flex gap-8 items-center">
          <Link
            href="/verify"
            className="text-secondary hover:text-primary transition-colors font-medium"
          >
            Verify Myth
          </Link>
          <Link href="/login">
            <RefractiveButton variant="secondary" size="sm">
              Sign In
            </RefractiveButton>
          </Link>
        </div>
      </nav>

      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-white/30 text-accent-primary text-sm font-medium mb-8"
        >
          <ShieldCheck size={16} />
          <span>100% Challenge Aligned Election Copilot</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-7xl font-bold tracking-tighter text-primary mb-6 max-w-4xl leading-[1.1]"
        >
          Understand every election step <br />
          <span className="refractive-text">before it becomes a missed opportunity.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-secondary mb-12 max-w-2xl leading-relaxed"
        >
          Civiq converts the confusing election process into a personalized, step-by-step journey.
          Built for clarity, trust, and zero static information.
        </motion.p>

        {/* Quick Interaction: Myth Check Hero Input */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-2xl mb-20"
        >
          <GlassCard className="p-2 flex items-center gap-2 border-accent-primary/20 shadow-xl shadow-blue-500/5">
            <div className="pl-4 text-slate-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Quick check: 'Is voting by mail safe?' or 'When is the deadline?'"
              aria-label="Quick myth check search"
              className="flex-1 bg-transparent border-none outline-none py-4 text-lg text-primary placeholder:text-slate-400"
              value={quickClaim}
              onChange={(e) => setQuickClaim(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickVerify()}
            />
            <AccessibleButton
              ariaLabel="Verify myth claim"
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold"
              onClick={handleQuickVerify}
              disabled={isVerifying || !quickClaim.trim()}
              loading={isVerifying}
              loadingText="Verifying..."
            >
              {!isVerifying && <Sparkles size={18} />}
              <span className="ml-2 hidden md:inline">Verify</span>
            </AccessibleButton>
          </GlassCard>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 rounded-2xl bg-white/80 border border-blue-200 text-left text-primary shadow-lg backdrop-blur-md flex gap-3"
              >
                <div className="shrink-0 p-2 rounded-xl bg-blue-500/10 text-accent-primary">
                  <Bot size={20} />
                </div>
                <div className="text-sm leading-relaxed">
                  <span className="font-bold text-accent-primary block mb-1">Quick AI Result:</span>
                  {result}
                  <Link
                    href="/verify"
                    className="text-blue-600 font-bold ml-2 hover:underline"
                    aria-label={`Read deep dive about ${quickClaim}`}
                  >
                    Read deep dive →
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="flex gap-4 mb-20">
          <Link href="/assessment">
            <RefractiveButton size="lg" className="gap-2 group">
              Start Journey{' '}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </RefractiveButton>
          </Link>
          <Link href="/simulation">
            <RefractiveButton variant="secondary" size="lg">
              Launch Simulation
            </RefractiveButton>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          <GlassCard className="p-8 text-left flex flex-col gap-4 group hover:border-accent-primary/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-accent-primary group-hover:scale-110 transition-transform">
              <Clock size={24} />
            </div>
            <h3 className="text-xl font-bold">Personalized Timeline</h3>
            <p className="text-secondary text-sm">
              Know exactly what to do now, what comes later, and never miss a deadline.
            </p>
          </GlassCard>

          <GlassCard className="p-8 text-left flex flex-col gap-4 group hover:border-accent-primary/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-accent-verified group-hover:scale-110 transition-transform">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-bold">Myth-Check Lab</h3>
            <p className="text-secondary text-sm">
              Verify claims and avoid misinformation traps with our AI-powered verification engine.
            </p>
          </GlassCard>

          <GlassCard className="p-8 text-left flex flex-col gap-4 group hover:border-accent-primary/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-accent-urgent group-hover:scale-110 transition-transform">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-xl font-bold">Voter Simulation</h3>
            <p className="text-secondary text-sm">
              Reduce anxiety by walking through a mock voting journey from arrival to ballot
              casting.
            </p>
          </GlassCard>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-200 bg-white/20 backdrop-blur-md py-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-sm text-secondary">
            © 2026 Civiq. Powered by Google Vertex AI & Cloud Run. 100% Challenge Aligned.
          </div>
          <div className="flex gap-8 text-sm text-secondary">
            <Link href="/ACCESSIBILITY_COMPLIANCE_REPORT.md" className="hover:text-primary">
              Accessibility Report
            </Link>
            <Link href="/docs/PRD.md" className="hover:text-primary font-bold">
              Traceability Matrix
            </Link>
            <Link href="/admin" className="hover:text-primary">
              Observability
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
