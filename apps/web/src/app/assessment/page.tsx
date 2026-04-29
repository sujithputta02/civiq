'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, RefractiveButton } from '@civiq/ui';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

const steps = [
  { title: "Status", question: "What is your current voter registration status?" },
  { title: "Confidence", question: "On a scale of 1-5, how confident do you feel about the upcoming election process?" },
  { title: "Location", question: "Where will you be voting? (Optional)" },
  { title: "Familiarity", question: "How familiar are you with the voting methods available to you?" },
  { title: "Constraints", question: "Do any of these apply to you? (Select all that apply)" },
];

export default function AssessmentPage() {
  const { step, setStep, data, updateData, setTimeline } = useAssessmentStore();
  const router = useRouter();

  const { user } = useAuth();

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      const finalData = { ...data, isComplete: true };
      updateData({ isComplete: true });

      // Log analytics
      import('@/lib/firebase').then(({ analytics }) => {
        if (analytics) {
          import('firebase/analytics').then(({ logEvent }) => {
            logEvent(analytics, 'assessment_completed', {
              voting_status: finalData.votingStatus,
              location: finalData.location
            });
          });
        }
      });
      
      // Save to Firestore if logged in
      if (user) {
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          const { generateTimeline } = await import('@/lib/timeline');
          
          const generatedTimeline = generateTimeline(finalData);
          setTimeline(generatedTimeline);

          await setDoc(doc(db, 'users', user.uid), {
            assessment: finalData,
            timeline: generatedTimeline,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.error("Error saving assessment:", error);
        }
      }
      
      router.push('/dashboard');
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else router.push('/');
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            {['REGISTERED', 'NOT_REGISTERED', 'UNSURE'].map((status) => (
              <GlassCard 
                key={status}
                className={`p-6 cursor-pointer hover:border-accent-primary transition-colors ${data.votingStatus === status ? 'border-accent-primary bg-blue-50/50' : ''}`}
                onClick={() => updateData({ votingStatus: status as any })}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-lg capitalize">{status.toLowerCase().replace('_', ' ')}</span>
                  {data.votingStatus === status && <Check className="text-accent-primary" />}
                </div>
              </GlassCard>
            ))}
          </div>
        );
      case 1:
        return (
          <div className="flex justify-between gap-4">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                onClick={() => updateData({ confidence: val })}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold transition-all ${data.confidence === val ? 'bg-accent-primary text-white scale-110 shadow-lg' : 'bg-white/50 text-slate-400 hover:text-slate-600'}`}
              >
                {val}
              </button>
            ))}
          </div>
        );
      case 2:
        return (
          <input 
            type="text"
            placeholder="Enter your city or state..."
            className="w-full p-4 rounded-2xl bg-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-accent-primary text-lg"
            value={data.location || ''}
            onChange={(e) => updateData({ location: e.target.value })}
          />
        );
      case 3:
        return (
          <div className="flex justify-between gap-4">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                onClick={() => updateData({ familiarity: val })}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold transition-all ${data.familiarity === val ? 'bg-accent-primary text-white scale-110 shadow-lg' : 'bg-white/50 text-slate-400 hover:text-slate-600'}`}
              >
                {val}
              </button>
            ))}
          </div>
        );
      case 4:
        const constraints = ["First-time voter", "Living abroad", "Physical disability", "Busy schedule", "Need language support"];
        return (
          <div className="grid grid-cols-1 gap-4">
            {constraints.map((c) => (
              <GlassCard 
                key={c}
                className={`p-4 cursor-pointer hover:border-accent-primary transition-colors ${data.constraints?.includes(c) ? 'border-accent-primary bg-blue-50/50' : ''}`}
                onClick={() => {
                  const current = data.constraints || [];
                  updateData({ constraints: current.includes(c) ? current.filter(x => x !== c) : [...current, c] });
                }}
              >
                <div className="flex justify-between items-center">
                  <span>{c}</span>
                  {data.constraints?.includes(c) && <Check size={16} className="text-accent-primary" />}
                </div>
              </GlassCard>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] py-20 px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12 flex justify-between items-center">
          <RefractiveButton variant="ghost" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft size={18} /> Back
          </RefractiveButton>
          <div className="text-sm font-medium text-secondary">
            Step {step + 1} of {steps.length}
          </div>
        </div>

        <div className="mb-8">
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-accent-primary"
              initial={{ width: 0 }}
              animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-sm font-bold uppercase tracking-widest text-accent-primary mb-2">
              {steps[step].title}
            </h2>
            <h1 className="text-3xl font-bold mb-8 text-primary">
              {steps[step].question}
            </h1>

            <div className="min-h-[300px]">
              {renderStep()}
            </div>

            <div className="mt-12 flex justify-end">
              <RefractiveButton 
                size="lg" 
                onClick={handleNext} 
                className="gap-2"
                disabled={step === 0 && !data.votingStatus}
              >
                {step === steps.length - 1 ? "Get My Plan" : "Continue"} <ArrowRight size={20} />
              </RefractiveButton>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
