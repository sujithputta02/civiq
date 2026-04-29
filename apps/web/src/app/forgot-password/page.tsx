'use client';

import React, { useState } from 'react';
import { GlassCard, RefractiveButton } from '@civiq/ui';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { resetPassword } = useAuth();

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);
    
    try {
      await resetPassword(email);
      setMessage('Check your inbox for further instructions.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[20%] left-[60%] w-[50%] h-[50%] bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[60%] w-[50%] h-[50%] bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

      <GlassCard className="w-full max-w-md p-8 relative z-10" intensity="high">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-outfit text-slate-800 mb-2">Password Reset</h1>
          <p className="text-slate-500">Enter your email to reset your password</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3 text-green-700">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{message}</p>
          </div>
        )}

        <form onSubmit={handleResetSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Email address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/50 border border-white/40 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <RefractiveButton 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending instructions...' : 'Reset Password'}
          </RefractiveButton>
        </form>

        <div className="mt-8 text-center">
          <Link href="/login" className="text-blue-600 font-semibold hover:underline text-sm">
            Back to Sign In
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
