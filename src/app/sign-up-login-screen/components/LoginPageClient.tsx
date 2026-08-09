'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, Newspaper, Shield, User, Phone, Lock, Mail, Copy, CheckCircle, LogIn } from 'lucide-react';
import { loginAdmin, loginHawker } from '@/lib/cloudStorage';

interface AdminFormValues {
  email: string;
  password: string;
  remember: boolean;
}

interface HawkerFormValues {
  hawkerName: string;
  contactNumber: string;
}

const DEMO_HAWKERS = [
  { name: 'AJAY BAGUL', contact: '9876543201' },
  { name: 'AJIT BORSE', contact: '9876543202' },
  { name: 'AMOL SHIMPI', contact: '9876543203' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-1 p-0.5 rounded hover:bg-slate-200 transition-colors"
      title="Copy to clipboard"
      type="button"
    >
      {copied ? <CheckCircle size={13} className="text-green-600" /> : <Copy size={13} className="text-slate-400" />}
    </button>
  );
}

export default function LoginPageClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'admin' | 'hawker'>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Ensure data is seeded on first visit — cloud storage seeds automatically
  React.useEffect(() => { /* no-op: cloud storage seeds on first fetch */ }, []);

  const adminForm = useForm<AdminFormValues>({
    defaultValues: { email: '', password: '', remember: false },
  });

  const hawkerForm = useForm<HawkerFormValues>({
    defaultValues: { hawkerName: '', contactNumber: '' },
  });

  const handleAdminSubmit = async (data: AdminFormValues) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const ok = loginAdmin(data.email, data.password);
    if (ok) {
      toast.success('Welcome back! Redirecting to Admin Dashboard…');
      setTimeout(() => router.push('/admin-dashboard'), 800);
    } else {
      adminForm.setError('password', {
        message: 'Invalid credentials — please check your email and password',
      });
      toast.error('Login failed. Check your credentials.');
    }
    setIsLoading(false);
  };

  const handleHawkerSubmit = async (data: HawkerFormValues) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const hawker = await loginHawker(data.hawkerName, data.contactNumber);
    if (hawker) {
      toast.success(`Welcome, ${hawker.name}! Loading your dashboard…`);
      setTimeout(() => router.push('/hawker-dashboard'), 800);
    } else {
      hawkerForm.setError('contactNumber', {
        message: 'Invalid credentials — verify your name and contact number',
      });
      toast.error('Login failed. Verify your name and contact number.');
    }
    setIsLoading(false);
  };

  const autofillAdmin = () => {
    adminForm.setValue('email', 'Bhandnews.in');
    adminForm.setValue('password', '8830667147');
  };

  const autofillHawker = (name: string, contact: string) => {
    hawkerForm.setValue('hawkerName', name);
    hawkerForm.setValue('contactNumber', contact);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[hsl(220,20%,97%)]">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-shrink-0 bg-[hsl(210,67%,23%)] relative overflow-hidden flex-col justify-between p-10">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`line-${i}`}
              className="absolute border-t border-white"
              style={{ top: `${(i + 1) * 8}%`, left: 0, right: 0 }}
            />
          ))}
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-[hsl(36,80%,52%)] rounded-xl flex items-center justify-center shadow-lg">
              <Newspaper size={24} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-xl leading-tight">Bhand News</div>
              <div className="text-[hsl(210,60%,75%)] text-sm">Paper Agency</div>
            </div>
          </div>

          <div className="mb-10">
            <h1 className="text-white text-3xl xl:text-4xl font-bold leading-tight mb-4">
              Manage Every Hawker,<br />
              <span className="text-[hsl(36,80%,62%)]">Every Bill,</span><br />
              Every Day.
            </h1>
            <p className="text-[hsl(210,50%,75%)] text-base leading-relaxed">
              Complete newspaper distribution management — billing, tracking, and notifications for 79+ hawkers. Works fully offline.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { icon: <Newspaper size={15} />, text: '18 Newspapers Tracked Daily' },
              { icon: <Phone size={15} />, text: 'WhatsApp Notifications' },
              { icon: <Shield size={15} />, text: 'Works Fully Offline — No Server Needed' },
            ].map((feat) => (
              <div key={`feat-${feat.text}`} className="flex items-center gap-3 text-[hsl(210,50%,80%)] text-sm">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[hsl(36,80%,62%)]">
                  {feat.icon}
                </div>
                {feat.text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4 pt-8 border-t border-white/20">
          {[
            { value: '79', label: 'Active Hawkers' },
            { value: '18', label: 'Newspapers' },
            { value: '180+', label: 'Monthly Records' },
          ].map((stat) => (
            <div key={`stat-${stat.label}`} className="text-center">
              <div className="text-white text-2xl font-bold tabular-nums">{stat.value}</div>
              <div className="text-[hsl(210,50%,70%)] text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-[hsl(210,67%,23%)] rounded-xl flex items-center justify-center">
              <Newspaper size={20} className="text-white" />
            </div>
            <div>
              <div className="text-slate-900 font-bold text-lg">Bhand News</div>
              <div className="text-slate-500 text-xs">Paper Agency</div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Sign in to your account</h2>
            <p className="text-slate-500 text-sm">Select your role to continue</p>
          </div>

          {/* Role Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'admin' ? 'bg-white text-[hsl(210,67%,23%)] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              type="button"
            >
              <Shield size={15} />
              Admin
            </button>
            <button
              onClick={() => setActiveTab('hawker')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'hawker' ? 'bg-white text-[hsl(210,67%,23%)] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              type="button"
            >
              <User size={15} />
              Hawker
            </button>
          </div>

          {/* Admin Form */}
          {activeTab === 'admin' && (
            <div className="animate-fade-in">
              <form onSubmit={adminForm.handleSubmit(handleAdminSubmit)} className="space-y-5">
                <div>
                  <label className="label-text" htmlFor="admin-email">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="admin-email"
                      type="email"
                      placeholder="admin@bhandnews.in"
                      className="input-field pl-9"
                      {...adminForm.register('email', {
                        required: 'Email is required',
                        pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
                      })}
                    />
                  </div>
                  {adminForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-600">{adminForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="label-text" htmlFor="admin-password">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="input-field pl-9 pr-10"
                      {...adminForm.register('password', { required: 'Password is required' })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {adminForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-red-600">{adminForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn size={16} />
                  )}
                  {isLoading ? 'Signing in…' : 'Sign In as Admin'}
                </button>
              </form>

              {/* Demo credentials */}
              <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-[hsl(220,15%,88%)]">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Demo Credentials</p>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 w-16">Email:</span>
                    <code className="font-mono">admin@bhandnews.in</code>
                    <CopyButton text="admin@bhandnews.in" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 w-16">Password:</span>
                    <code className="font-mono">BhandNews@2026</code>
                    <CopyButton text="BhandNews@2026" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={autofillAdmin}
                  className="mt-3 text-xs font-semibold text-[hsl(210,67%,23%)] hover:underline"
                >
                  Autofill credentials →
                </button>
              </div>
            </div>
          )}

          {/* Hawker Form */}
          {activeTab === 'hawker' && (
            <div className="animate-fade-in">
              <form onSubmit={hawkerForm.handleSubmit(handleHawkerSubmit)} className="space-y-5">
                <div>
                  <label className="label-text" htmlFor="hawker-name">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="hawker-name"
                      type="text"
                      placeholder="Enter your full name"
                      className="input-field pl-9"
                      {...hawkerForm.register('hawkerName', { required: 'Name is required' })}
                    />
                  </div>
                  {hawkerForm.formState.errors.hawkerName && (
                    <p className="mt-1 text-xs text-red-600">{hawkerForm.formState.errors.hawkerName.message}</p>
                  )}
                </div>

                <div>
                  <label className="label-text" htmlFor="hawker-contact">Contact Number (Password)</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="hawker-contact"
                      type={showContact ? 'text' : 'password'}
                      placeholder="10-digit mobile number"
                      className="input-field pl-9 pr-10"
                      {...hawkerForm.register('contactNumber', {
                        required: 'Contact number is required',
                        pattern: { value: /^\d{10}$/, message: 'Enter a valid 10-digit number' },
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowContact(!showContact)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showContact ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {hawkerForm.formState.errors.contactNumber && (
                    <p className="mt-1 text-xs text-red-600">{hawkerForm.formState.errors.contactNumber.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn size={16} />
                  )}
                  {isLoading ? 'Signing in…' : 'Sign In as Hawker'}
                </button>
              </form>

              {/* Demo hawker accounts */}
              <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-[hsl(220,15%,88%)]">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Demo Hawker Accounts</p>
                <div className="space-y-2">
                  {DEMO_HAWKERS.map((h) => (
                    <div key={`demo-${h.contact}`} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-700">{h.name}</span>
                        <span className="text-slate-400 ml-2 font-mono">{h.contact}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => autofillHawker(h.name, h.contact)}
                        className="text-[hsl(210,67%,23%)] font-semibold hover:underline"
                      >
                        Use →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}