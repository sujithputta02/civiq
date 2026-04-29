'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { GlassCard, RefractiveButton } from '@civiq/ui';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { CheckCircle2, Clock, AlertTriangle, ShieldCheck, PlayCircle, Search, LogOut, Loader2, User as UserIcon, Bot, Activity, Bell } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

import { remoteConfig } from '@/lib/firebase';
import { getValue } from 'firebase/remote-config';

export default function DashboardPage() {
  const { data, timeline, setTimeline } = useAssessmentStore();
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set());
  const [markingId, setMarkingId] = useState<string | null>(null);
  
  const [showBetaMessage, setShowBetaMessage] = useState(false);
  const [explanationMode, setExplanationMode] = useState<'15s' | '1m' | 'deep'>('1m');

  // Load completed step IDs from Firestore on login
  useEffect(() => {
    if (!user) return;
    const loadCompleted = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const savedCompleted: string[] = docSnap.data()?.completedSteps || [];
          setCompletedStepIds(new Set(savedCompleted));
          // Also update timeline statuses from Firestore
          if (savedCompleted.length > 0 && timeline.length > 0) {
            const updated = timeline.map(s =>
              savedCompleted.includes(s.id) ? { ...s, status: 'COMPLETED' as const } : s
            );
            setTimeline(updated);
          }
        }
      } catch (e) {
        console.error('Failed to load completed steps:', e);
      }
    };
    loadCompleted();
  }, [user, timeline.length]);

  // Mark a step as done and persist to Firestore
  const handleMarkDone = async (stepId: string) => {
    if (!user || completedStepIds.has(stepId)) return;
    setMarkingId(stepId);
    try {
      const newCompleted = new Set(completedStepIds).add(stepId);
      setCompletedStepIds(newCompleted);
      // Update local timeline state
      const updated = timeline.map(s =>
        s.id === stepId ? { ...s, status: 'COMPLETED' as const } : s
      );
      setTimeline(updated);
      // Persist to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        completedSteps: Array.from(newCompleted)
      }, { merge: true });
      toast.success('Step marked as complete! 🎉');
    } catch (e) {
      console.error('Failed to mark step done:', e);
      toast.error('Failed to save progress.');
    } finally {
      setMarkingId(null);
    }
  };

  // Compute readiness score dynamically from timeline statuses
  const { readinessScore, stepsLeft } = useMemo(() => {
    if (!timeline.length) return { readinessScore: 0, stepsLeft: 0 };
    const completedCount = timeline.filter(
      s => s.status === 'COMPLETED' || completedStepIds.has(s.id)
    ).length;
    const score = Math.round((completedCount / timeline.length) * 100);
    const left = timeline.length - completedCount;
    return { readinessScore: score, stepsLeft: left };
  }, [timeline, completedStepIds]);

  useEffect(() => {
    if (remoteConfig) {
      const val = getValue(remoteConfig, 'show_beta_message').asBoolean();
      setShowBetaMessage(val);
    }
  }, []);
  
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const { requestPermission } = useNotifications();

  // Push notifications are temporarily disabled due to Google Cloud API key restrictions.
  // To enable: go to Google Cloud Console > APIs & Services > Credentials > Edit your API key
  // > API restrictions > Add "Firebase Cloud Messaging API"
  // Push notifications on-demand toggle
  // Automated background polling removed to resolve backend API console authorization loops.


  useEffect(() => {
    if (user) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      fetch(`${apiUrl}/api/chat?userId=${user.uid}`)
        .then(res => res.json())
        .then(data => {
          if (data.history && Array.isArray(data.history)) {
            const formattedHistory = data.history.map((m: any) => ({
              role: m.role,
              text: m.parts[0].text
            }));
            setMessages(formattedHistory);
          }
        })
        .catch(err => console.error('Failed to load chat history', err));
    }
  }, [user]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  // Redirect to assessment if new user (no data)
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !data.isComplete) {
      // If they are logged in but have no assessment data, force them to onboarding
      toast.success('Welcome! Let\'s get your profile set up first.', { icon: '👋' });
      router.push('/assessment');
    }
  }, [user, loading, data.isComplete, router]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  if (loading || !user || !data.isComplete) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB]"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const statusIcons = {
    COMPLETED: <CheckCircle2 className="text-accent-verified" />,
    NEXT: <Clock className="text-accent-primary" />,
    URGENT: <AlertTriangle className="text-accent-urgent" />,
    VERIFY: <ShieldCheck className="text-accent-primary" />,
    LATER: <Clock className="text-slate-300" />,
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          contextData: data,
          userId: user.uid,
          explanationMode: explanationMode
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to chat');

      setMessages(prev => [...prev, { role: 'model', text: json.reply }]);
    } catch (err) {
      toast.error('Failed to communicate with AI');
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <nav className="border-b border-white/30 bg-white/40 backdrop-blur-md px-8 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-primary">Civiq<span className="text-accent-primary">.</span></Link>
          <div className="flex gap-4">
            <Link href="/verify">
              <RefractiveButton variant="secondary" size="sm" className="gap-2">
                <Search size={18} /> Myth-Check
              </RefractiveButton>
            </Link>
            <Link href="/admin">
              <RefractiveButton variant="ghost" size="sm" className="gap-2">
                <Activity size={18} /> Observability
              </RefractiveButton>
            </Link>
            
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-slate-200">
              <div className="flex items-center gap-2">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-sm font-medium hidden md:block">{user?.displayName || user?.email?.split('@')[0]}</span>
              </div>
              <RefractiveButton variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-500">
                <LogOut size={16} className="mr-2" /> Logout
              </RefractiveButton>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Your Election Journey</h1>
          <p className="text-secondary">Personalized based on your readiness assessment.</p>
          
          <div className="mt-4 flex items-center gap-2">
            <RefractiveButton 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                requestPermission();
                toast.success('FCM check initiated', { icon: '🔔' });
              }} 
              className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-full py-1 px-3"
            >
              <Bell size={14} className="mr-1 inline-block" /> Enable Push Alerts
            </RefractiveButton>
          </div>
          
          {showBetaMessage && (
            <div className="mt-4 p-4 rounded-2xl bg-blue-500/10 border border-blue-200 text-blue-700 text-sm flex items-center gap-3">
              <Bot size={20} />
              <span><strong>Beta Feature:</strong> We are testing new AI models to improve your timeline accuracy. Thank you for being a Civiq pioneer!</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            {timeline.map((step, idx) => (
              <div key={step.id} className="relative flex gap-8">
                {/* Timeline Line */}
                {idx !== timeline.length - 1 && (
                  <div className="absolute left-[23px] top-[48px] bottom-[-32px] w-[2px] bg-slate-200" />
                )}
                
                <div className="relative z-10 w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                  {statusIcons[step.status]}
                </div>

                <GlassCard className={`p-8 w-full group transition-all hover:scale-[1.01] ${
                  step.status === 'URGENT' ? 'border-amber-200 bg-amber-50/10' : ''
                } ${
                  (step.status === 'COMPLETED' || completedStepIds.has(step.id)) ? 'opacity-80' : ''
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-accent-primary mb-2 block">{step.category}</span>
                      <h3 className="text-2xl font-bold flex items-center gap-3">
                        {step.title}
                        {(step.status === 'COMPLETED' || completedStepIds.has(step.id)) && (
                          <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Done</span>
                        )}
                      </h3>
                    </div>
                    {step.deadline && (
                      <div className="px-3 py-1 rounded-full bg-white/50 border border-white/30 text-xs font-medium text-slate-600">
                        Deadline: {step.deadline}
                      </div>
                    )}
                  </div>
                  <p className="text-secondary mb-6 leading-relaxed">{step.description}</p>
                  
                  <div className="flex flex-wrap gap-3">
                    {/* Action button based on the step id */}
                    {step.id === 'reg-01' && (
                      <a href="https://voters.eci.gov.in/" target="_blank" rel="noopener noreferrer">
                        <RefractiveButton size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                          Open Voter Portal
                        </RefractiveButton>
                      </a>
                    )}
                    {step.id === 'id-01' && (
                      <RefractiveButton 
                        size="sm" 
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => {
                          setChatInput("What are the official ID requirements to vote in my area?");
                          if (chatContainerRef.current) {
                            chatContainerRef.current.scrollTop = 0;
                          }
                        }}
                      >
                        Ask AI for IDs
                      </RefractiveButton>
                    )}
                    {step.id === 'meth-01' && (
                      <a href="https://electoralsearch.eci.gov.in/" target="_blank" rel="noopener noreferrer">
                        <RefractiveButton size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                          Find Polling Station
                        </RefractiveButton>
                      </a>
                    )}
                    {step.id === 'mis-01' && (
                      <Link href="/verify">
                        <RefractiveButton size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                          Start Myth-Check
                        </RefractiveButton>
                      </Link>
                    )}
                    {step.id === 'sim-01' && (
                      <Link href="/simulation">
                        <RefractiveButton size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                          <PlayCircle size={18} /> Launch Simulation
                        </RefractiveButton>
                      </Link>
                    )}

                    {/* Completion Tracker */}
                    {(step.status === 'COMPLETED' || completedStepIds.has(step.id)) ? (
                      <RefractiveButton size="sm" variant="ghost" className="gap-2 text-green-600 cursor-default" disabled>
                        <CheckCircle2 size={16} /> Completed
                      </RefractiveButton>
                    ) : (
                      <RefractiveButton
                        size="sm"
                        variant="secondary"
                        className="gap-2"
                        onClick={() => handleMarkDone(step.id)}
                        disabled={markingId === step.id}
                      >
                        {markingId === step.id ? <Loader2 size={16} className="animate-spin" /> : 'Mark as Done'}
                      </RefractiveButton>
                    )}
                  </div>
                </GlassCard>
              </div>
            ))}
          </div>

          <div className="space-y-8">
            <GlassCard className="p-8">
              <h3 className="text-xl font-bold mb-4">Readiness Score</h3>
              <div className="relative h-48 w-48 mx-auto mb-6">
                {/* SVG Gauge */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                  <circle
                    cx="96" cy="96" r="80"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={502.6}
                    strokeDashoffset={502.6 * (1 - readinessScore / 100)}
                    className={`transition-all duration-1000 ease-out ${
                      readinessScore >= 80 ? 'text-green-500' :
                      readinessScore >= 50 ? 'text-accent-primary' :
                      'text-amber-500'
                    }`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-bold">{readinessScore}%</span>
                  <span className="text-xs font-medium text-secondary uppercase tracking-widest">Ready</span>
                </div>
              </div>
              {stepsLeft === 0 ? (
                <p className="text-sm text-green-600 font-bold text-center">🎉 You are fully election-ready!</p>
              ) : (
                <p className="text-sm text-secondary text-center">Complete <span className="font-bold">{stepsLeft} more step{stepsLeft !== 1 ? 's' : ''}</span> to reach high readiness.</p>
              )}
            </GlassCard>

            <GlassCard className="flex flex-col bg-blue-600 text-white border-none overflow-hidden h-[500px]">
              <div className="p-6 pb-4 border-b border-white/10 shrink-0">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Bot size={24} className="text-blue-200" /> Ask Civiq AI
                </h3>
                <p className="text-blue-100 text-sm mt-1">Have questions about the process? I'm here to help.</p>
                
                {/* Explain-Like-I'm-Busy visual mode selectors */}
                <div className="flex gap-2 mt-3 p-1 bg-white/10 rounded-full text-xs max-w-max">
                  <button 
                    onClick={() => setExplanationMode('15s')} 
                    className={`px-3 py-1 rounded-full font-medium transition-colors ${explanationMode === '15s' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100 hover:bg-white/5'}`}
                  >
                    ⏱️ 15s
                  </button>
                  <button 
                    onClick={() => setExplanationMode('1m')} 
                    className={`px-3 py-1 rounded-full font-medium transition-colors ${explanationMode === '1m' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100 hover:bg-white/5'}`}
                  >
                    ⏱️ 1m
                  </button>
                  <button 
                    onClick={() => setExplanationMode('deep')} 
                    className={`px-3 py-1 rounded-full font-medium transition-colors ${explanationMode === 'deep' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100 hover:bg-white/5'}`}
                  >
                    📚 Deep
                  </button>
                </div>
              </div>
              
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
                {messages.length === 0 ? (
                  <div className="text-center text-blue-200 text-sm mt-8">
                    Ask me anything about your election journey, deadlines, or voting procedures in {data.location || 'your area'}!
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-white/20' : 'bg-blue-800'}`}>
                        {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
                      </div>
                      <div className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm ${
                        msg.role === 'user' 
                          ? 'bg-white text-blue-900 rounded-tr-sm' 
                          : 'bg-white/10 border border-white/10 rounded-tl-sm leading-relaxed'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                {isChatLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-800 shrink-0 flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 rounded-tl-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleChatSubmit} className="p-4 bg-black/10 shrink-0">
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isChatLoading}
                    placeholder="Ask a question..." 
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-4 pr-14 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 transition-all"
                  />
                  <RefractiveButton 
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    size="sm" 
                    className="absolute right-1.5 px-3 py-1.5 h-auto rounded-lg disabled:opacity-50"
                  >
                    {isChatLoading ? <Loader2 size={16} className="animate-spin" /> : 'Send'}
                  </RefractiveButton>
                </div>
              </form>
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
}
