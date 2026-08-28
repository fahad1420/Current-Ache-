import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      addToast('সবগুলো ঘর পূরণ করুন', 'error');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      addToast('অ্যাডমিন প্যানেলে স্বাগতম', 'success');
      navigate('/admin');
    } catch (err) {
      addToast(err.message || 'ভুল ইউজারনেম বা পাসওয়ার্ড', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white dark:bg-[#111214] rounded-3xl p-7 sm:p-9 shadow-xl border border-stone-200 dark:border-zinc-800 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-zinc-100">অ্যাডমিন লগইন</h1>
          <p className="text-xs text-stone-500 dark:text-zinc-400">সিস্টেম ব্যবস্থাপনা ও মডারেশনের জন্য প্রবেশ করুন</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-1.5">ইউজারনেম</label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-[#111214] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none text-stone-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-zinc-300 mb-1.5">পাসওয়ার্ড</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-[#111214] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none text-stone-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'লগইন করুন'}
          </button>
        </form>
      </div>
    </div>
  );
};
