import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Trash2, Flag, LogOut, RefreshCw, Zap, ZapOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getBanglaRelativeTime } from '../utils/timeAgo';
import { toBn } from '../utils/banglaDigits';
import api from '../services/api';

export const AdminDashboard = () => {
  const { admin, logout, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/admin/reports?page=${page}&limit=20`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await api.get(url);
      if (res.data?.success) {
        setReports(res.data.data || []);
        setTotalPages(res.data.pages || 1);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate('/admin/login');
      } else {
        addToast('রিপোর্ট লোড করতে ব্যর্থ হয়েছে', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, logout, navigate, addToast]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    fetchReports();
  }, [isAuthenticated, fetchReports, navigate]);

  const handleDelete = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই রিপোর্টটি মুছে ফেলতে চান?')) return;
    try {
      const res = await api.delete(`/admin/reports/${id}`);
      if (res.data?.success) {
        addToast('রিপোর্ট মুছে ফেলা হয়েছে', 'success');
        setReports((prev) => prev.filter((r) => r._id !== id));
      }
    } catch {
      addToast('মুছতে ব্যর্থ হয়েছে', 'error');
    }
  };

  const handleToggleFlag = async (id) => {
    try {
      const res = await api.patch(`/admin/reports/${id}/flag`);
      if (res.data?.success) {
        addToast(res.data.message, 'success');
        fetchReports();
      }
    } catch {
      addToast('স্ট্যাটাস পরিবর্তনে সমস্যা', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-purple-900 text-white p-6 rounded-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-800 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold">অ্যাডমিন ড্যাশবোর্ড ও মডারেশন</h1>
            <p className="text-xs text-purple-200">
              লগইন আছেন: <strong>{admin?.username}</strong> ({admin?.role})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchReports()}
            className="px-3.5 py-2 rounded-xl bg-purple-800 hover:bg-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> রিফ্রেশ
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/admin/login');
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> লগআউট
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-500 dark:text-zinc-400">ফিল্টার:</span>
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1 rounded-xl text-xs font-bold ${
              statusFilter === '' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300'
            }`}
          >
            সকল
          </button>
          <button
            onClick={() => setStatusFilter('available')}
            className={`px-3 py-1 rounded-xl text-xs font-bold ${
              statusFilter === 'available' ? 'bg-emerald-600 text-white' : 'bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300'
            }`}
          >
            কারেন্ট আছে
          </button>
          <button
            onClick={() => setStatusFilter('unavailable')}
            className={`px-3 py-1 rounded-xl text-xs font-bold ${
              statusFilter === 'unavailable' ? 'bg-rose-600 text-white' : 'bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300'
            }`}
          >
            কারেন্ট নেই
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111214] rounded-3xl border border-stone-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-700 dark:text-zinc-300">
            <thead className="bg-stone-50 dark:bg-zinc-800/80 border-b border-stone-200 dark:border-zinc-800 text-xs text-stone-500 dark:text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">সময়</th>
                <th className="px-5 py-4">এলাকা</th>
                <th className="px-5 py-4">মহল্লা</th>
                <th className="px-5 py-4">স্ট্যাটাস</th>
                <th className="px-5 py-4">IP হ্যাশ</th>
                <th className="px-5 py-4 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-stone-400 dark:text-zinc-500">
                    লোড হচ্ছে...
                  </td>
                </tr>
              ) : reports.length > 0 ? (
                reports.map((r) => {
                  const isAvailable = r.status === 'available';
                  return (
                    <tr key={r._id} className={`hover:bg-stone-50/80 dark:hover:bg-zinc-800/40 ${r.isFlagged ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''}`}>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-stone-500 dark:text-zinc-400">
                        {getBanglaRelativeTime(r.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-stone-900 dark:text-zinc-100">
                        {r.locationId?.nameBn || 'মুছে ফেলা এলাকা'}
                        <div className="text-[11px] text-stone-400 dark:text-zinc-500 font-normal">
                          {r.locationId?.divisionBn} &bull; {r.locationId?.districtBn}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-stone-600 dark:text-zinc-300">
                        {r.locality || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isAvailable
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {isAvailable ? <Zap className="w-3 h-3 fill-current" /> : <ZapOff className="w-3 h-3" />}
                          {isAvailable ? 'আছে' : 'নেই'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-stone-400 dark:text-zinc-500">
                        {r.ipHash?.slice(0, 12)}...
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleToggleFlag(r._id)}
                          className={`p-1.5 rounded-lg text-xs font-semibold ${
                            r.isFlagged
                              ? 'bg-orange-500 text-white'
                              : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title="ফ্ল্যাগ করুন"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r._id)}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors"
                          title="রিপোর্ট মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-stone-500 dark:text-zinc-400">
                    কোনো রিপোর্ট পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-stone-500 dark:text-zinc-400">
              পৃষ্ঠা {toBn(page)} / {toBn(totalPages)}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 bg-stone-100 dark:bg-zinc-800 rounded-lg disabled:opacity-40"
              >
                আগেরটি
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-stone-100 dark:bg-zinc-800 rounded-lg disabled:opacity-40"
              >
                পরবর্তী
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
