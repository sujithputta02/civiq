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
} from 'lucide-react';
import Link from 'next/link';

const simulationSteps = [
  {
    id: 'arrival',
    icon: <MapPin size={32} />,
    title: 'Arrival at Polling Place',
    description:
      'You arrive at your assigned polling station. Check the signs for the queue and ensure you are at the right location.',
    tip: 'Tip: Arriving early or during mid-morning/mid-afternoon can help you avoid the longest lines.',
  },
  {
    id: 'id-check',
    icon: <UserCheck size={32} />,
    title: 'Identification & Check-in',
    description:
      'Provide your name and, if required in your state, your identification to the poll worker.',
    tip: 'Tip: If your ID is rejected, ask for a provisional ballot. It is your right to cast one.',
  },
  {
    id: 'ballot-receipt',
    icon: <FileText size={32} />,
    title: 'Receive Your Ballot',
    description:
      'A poll worker will give you a paper ballot or direct you to a voting machine. Check it for any damage.',
    tip: 'Tip: If you make a mistake on a paper ballot, you can ask for a new one (called a "spoiled" ballot).',
  },
  {
    id: 'voting',
    icon: <Vote size={32} />,
    title: 'Marking the Ballot',
    description:
      'Step into the private booth. Follow the instructions carefully to mark your choices.',
    tip: 'Tip: Take your time. You are not required to vote in every single contest on the ballot.',
  },
  {
    id: 'submission',
    icon: <ShieldCheck size={32} />,
    title: 'Submitting Your Vote',
    description:
      'Insert your ballot into the scanner or submission box. Wait for confirmation that it was accepted.',
    tip: 'Tip: Wear your "I Voted" sticker with pride! You have successfully participated in democracy.',
  },
];

export default function SimulationPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < simulationSteps.length - 1) setCurrentStep(currentStep + 1);
  };

  const back = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
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

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Polling Day Simulation</h1>
          <p className="text-slate-400">
            A digital rehearsal to reduce anxiety and build procedural confidence.
          </p>
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <GlassCard className="p-12 bg-white/5 border-white/10 backdrop-blur-3xl relative overflow-visible">
              <div className="absolute -top-10 left-12 w-20 h-20 rounded-3xl bg-blue-600 shadow-xl shadow-blue-600/40 flex items-center justify-center text-white">
                {simulationSteps[currentStep].icon}
              </div>

              <div className="pt-8">
                <span className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-4 block">
                  Step {currentStep + 1}: {simulationSteps[currentStep].title}
                </span>
                <h2 className="text-5xl font-bold mb-8 leading-tight">
                  {simulationSteps[currentStep].title}
                </h2>
                <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                  {simulationSteps[currentStep].description}
                </p>

                <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-100 flex gap-4 items-start mb-12">
                  <ShieldCheck className="shrink-0 mt-1" />
                  <p>{simulationSteps[currentStep].tip}</p>
                </div>

                <div className="flex justify-between items-center">
                  <RefractiveButton
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                    onClick={back}
                    disabled={currentStep === 0}
                  >
                    Previous Step
                  </RefractiveButton>

                  {currentStep === simulationSteps.length - 1 ? (
                    <Link href="/dashboard">
                      <RefractiveButton
                        size="lg"
                        className="bg-green-600 hover:bg-green-500 shadow-green-600/25"
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
          This simulation is for educational purposes and based on general US voting procedures.
          Check your local guidelines for specific details.
        </div>
      </div>
    </div>
  );
}
