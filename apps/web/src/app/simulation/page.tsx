'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, RefractiveButton } from '@civiq/ui';
import {
  MapPin,
  UserCheck,
  FileText,
  Vote,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Bot,
  Loader2,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import toast from 'react-hot-toast';

const simulationSteps = [
  {
    id: 'arrival',
    icon: <MapPin size={32} />,
    title: 'Arrival at Polling Place',
    description:
      'You arrive at your assigned polling station. Check the signs for the queue and ensure you are at the right location.',
    tip: 'Tip: Arriving early or during mid-morning/mid-afternoon can help you avoid the longest lines.',
    aiQuery:
      'What should I look for when I first arrive at a polling station to ensure I am in the right place?',
  },
  {
    id: 'id-check',
    icon: <UserCheck size={32} />,
    title: 'Identification & Check-in',
    description:
      'Provide your name and, if required in your state, your identification to the poll worker.',
    tip: 'Tip: If your ID is rejected, ask for a provisional ballot. It is your right to cast one.',
    aiQuery:
      'What are the most common reasons an ID might be rejected, and how can I prepare for it?',
  },
  {
    id: 'ballot-receipt',
    icon: <FileText size={32} />,
    title: 'Receive Your Ballot',
    description:
      'A poll worker will give you a paper ballot or direct you to a voting machine. Check it for any damage.',
    tip: 'Tip: If you make a mistake on a paper ballot, you can ask for a new one (called a "spoiled" ballot).',
    aiQuery: 'What should I specifically check for on my ballot before I head to the voting booth?',
  },
  {
    id: 'voting',
    icon: <Vote size={32} />,
    title: 'Marking the Ballot',
    description:
      'Step into the private booth. Follow the instructions carefully to mark your choices.',
    tip: 'Tip: Take your time. You are not required to vote in every single contest on the ballot.',
    aiQuery: 'If I have trouble understanding a technical term on the ballot, what are my options?',
  },
  {
    id: 'submission',
    icon: <ShieldCheck size={32} />,
    title: 'Submitting Your Vote',
    description:
      'Insert your ballot into the scanner or submission box. Wait for confirmation that it was accepted.',
    tip: 'Tip: Wear your "I Voted" sticker with pride! You have successfully participated in democracy.',
    aiQuery: 'How do I know for sure that my ballot has been officially counted after I submit it?',
  },
];

export default function SimulationPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [depth, setDepth] = useState<'15s' | '1m' | 'deep'>('1m');
  const { user } = useAuth();
  const { data } = useAssessmentStore();

  const next = () => {
    if (currentStep < simulationSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setAiResponse(null);
    }
  };

  const back = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setAiResponse(null);
    }
  };

  const askAi = async () => {
    if (!user) return;
    setIsLoadingAi(true);
    setAiResponse(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      const res = await fetch(`${apiUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          message: simulationSteps[currentStep].aiQuery,
          contextData: data,
          userId: user.uid,
          explanationMode: depth,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'AI failed');
      setAiResponse(json.reply);
    } catch (err) {
      toast.error('Failed to get AI guidance');
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white py-12 px-8 overflow-hidden relative">
      {/* Simulation Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-slate-900 z-0" />
      <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full" />

      <div className="max-w-4xl mx-auto relative z-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-12 transition-colors"
        >
          <ArrowLeft size={18} /> Exit Simulation
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-4">Polling Day Simulation</h1>
            <p className="text-slate-400">
              An interactive digital rehearsal to build procedural confidence.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-1.5 rounded-2xl flex gap-2">
            {(['15s', '1m', 'deep'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${depth === d ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {d === '15s' ? '⚡ 15s' : d === '1m' ? '⏱️ 1m' : '📚 Deep'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-12">
          {simulationSteps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-500 ${idx <= currentStep ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-800'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <GlassCard className="p-10 bg-white/5 border-white/10 backdrop-blur-3xl relative overflow-visible">
              <div className="absolute -top-8 left-10 w-16 h-16 rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/40 flex items-center justify-center text-white">
                {simulationSteps[currentStep].icon}
              </div>

              <div className="pt-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <span className="text-blue-400 font-bold uppercase tracking-widest text-xs mb-2 block">
                      Step {currentStep + 1} of {simulationSteps.length}
                    </span>
                    <h2 className="text-4xl font-bold leading-tight">
                      {simulationSteps[currentStep].title}
                    </h2>
                  </div>

                  <RefractiveButton
                    onClick={askAi}
                    disabled={isLoadingAi}
                    variant="secondary"
                    className="gap-2 bg-white/10 border-white/10 hover:bg-white/20 text-white"
                  >
                    {isLoadingAi ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Bot size={18} />
                    )}
                    Explain with AI
                  </RefractiveButton>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                  <div className="lg:col-span-3">
                    <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                      {simulationSteps[currentStep].description}
                    </p>

                    <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-100 flex gap-4 items-start mb-8">
                      <Sparkles className="shrink-0 mt-1 text-blue-400" size={20} />
                      <p className="text-sm italic">{simulationSteps[currentStep].tip}</p>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <AnimatePresence>
                      {aiResponse && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white/5 border border-white/10 rounded-2xl p-6 relative"
                        >
                          <div className="absolute -top-3 -left-3 bg-blue-600 p-1.5 rounded-lg">
                            <Bot size={16} />
                          </div>
                          <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">
                            AI Guidance
                          </h4>
                          <p className="text-sm text-slate-300 leading-relaxed italic">
                            "{aiResponse}"
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {!aiResponse && !isLoadingAi && (
                      <div className="h-full border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-500">
                        <Bot size={32} className="mb-4 opacity-20" />
                        <p className="text-xs">
                          Click "Explain with AI" for personalized guidance on this step.
                        </p>
                      </div>
                    )}
                    {isLoadingAi && (
                      <div className="h-full border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 text-center">
                        <Loader2 size={32} className="mb-4 animate-spin text-blue-500" />
                        <p className="text-xs text-blue-400 animate-pulse">
                          Consulting civic intelligence...
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-12 pt-8 border-t border-white/10">
                  <RefractiveButton
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                    onClick={back}
                    disabled={currentStep === 0}
                  >
                    <ArrowLeft size={18} className="mr-2" /> Previous
                  </RefractiveButton>

                  {currentStep === simulationSteps.length - 1 ? (
                    <Link href="/dashboard">
                      <RefractiveButton
                        size="lg"
                        className="bg-green-600 hover:bg-green-500 shadow-xl shadow-green-600/20"
                      >
                        Finish Simulation
                      </RefractiveButton>
                    </Link>
                  ) : (
                    <RefractiveButton size="lg" onClick={next} className="gap-2">
                      Next Step <ArrowRight size={20} />
                    </RefractiveButton>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 text-center text-slate-500 text-sm">
          This simulation is powered by Vertex AI and tailored to your location:{' '}
          <span className="text-slate-300 font-medium">{data.location || 'Default'}</span>.
        </div>
      </div>
    </div>
  );
}
