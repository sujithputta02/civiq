import React from 'react';
import { GlassCard, RefractiveButton } from '@civiq/ui';
import { CheckCircle2, ShieldCheck, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-[#F5F7FB]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/30 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-100/40 blur-[120px] rounded-full" />

      <nav className="relative z-10 px-8 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold tracking-tight text-primary">
          Civiq<span className="text-accent-primary">.</span>
        </div>
        <div className="flex gap-8 items-center">
          <Link href="/about" className="text-secondary hover:text-primary transition-colors">
            How it works
          </Link>
          <Link href="/verify" className="text-secondary hover:text-primary transition-colors">
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
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-white/30 text-accent-primary text-sm font-medium mb-8 animate-fade-in">
          <ShieldCheck size={16} />
          <span>Your Trusted Election Readiness Copilot</span>
        </div>

        <h1 className="text-6xl md:text-7xl font-bold tracking-tighter text-primary mb-6 max-w-4xl leading-[1.1]">
          Understand every election step <br />
          <span className="refractive-text">before it becomes a missed opportunity.</span>
        </h1>

        <p className="text-xl text-secondary mb-12 max-w-2xl leading-relaxed">
          Civiq converts the confusing election process into a personalized, step-by-step journey.
          Built for clarity, trust, and action.
        </p>

        <div className="flex gap-4 mb-20">
          <Link href="/assessment">
            <RefractiveButton size="lg" className="gap-2">
              Start Readiness Assessment <ArrowRight size={20} />
            </RefractiveButton>
          </Link>
          <RefractiveButton variant="secondary" size="lg">
            Simulate Voting Day
          </RefractiveButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          <GlassCard className="p-8 text-left flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-accent-primary">
              <Clock size={24} />
            </div>
            <h3 className="text-xl font-bold">Personalized Timeline</h3>
            <p className="text-secondary">
              Know exactly what to do now, what comes later, and never miss a deadline.
            </p>
          </GlassCard>

          <GlassCard className="p-8 text-left flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-accent-verified">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-bold">Myth-Check Lab</h3>
            <p className="text-secondary">
              Verify claims and avoid misinformation traps with our AI-powered verification engine.
            </p>
          </GlassCard>

          <GlassCard className="p-8 text-left flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-accent-urgent">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-xl font-bold">Voter Simulation</h3>
            <p className="text-secondary">
              Reduce anxiety by walking through a mock voting journey from arrival to ballot
              casting.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Trust Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white/20 backdrop-blur-md py-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-sm text-secondary">
            © 2026 Civiq. Powered by Google Vertex AI & Firebase.
          </div>
          <div className="flex gap-8 text-sm text-secondary">
            <a href="#" className="hover:text-primary">
              Accessibility
            </a>
            <a href="#" className="hover:text-primary">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary">
              Security Audit
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
