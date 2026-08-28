import React, { Component } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Home } from './pages/Home';
import { AreaStatus } from './pages/AreaStatus';
import { AreasExplorer } from './pages/AreasExplorer';
import { PowerHistoryPage } from './pages/PowerHistoryPage';
import { SchedulesPage } from './pages/SchedulesPage';
import { Stats } from './pages/Stats';
import { About } from './pages/About';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { NotFound } from './pages/NotFound';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application Error Caught by Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50 dark:bg-[#0a0a0b] text-stone-900 dark:text-zinc-100 text-center">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">কিছু একটি সমস্যা হয়েছে</h2>
          <p className="text-sm text-stone-500 dark:text-zinc-400 max-w-md mb-6">
            পৃষ্ঠাটি লোড করার সময় একটি ত্রুটি ঘটেছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="py-3 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>পৃষ্ঠাটি পুনরায় লোড করুন</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
            <AuthProvider>
              <ToastProvider>
                <ScrollToTop />
                <div className="flex flex-col min-h-screen bg-[#fafaf9] dark:bg-[#0a0a0b] text-stone-900 dark:text-zinc-100 transition-colors duration-150 antialiased selection:bg-orange-500/20 selection:text-orange-950 dark:selection:text-orange-200">
                  <Navbar />
                  <main className="flex-1 pb-16 lg:pb-0">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/area/:id" element={<AreaStatus />} />
                      <Route path="/areas" element={<AreasExplorer />} />
                      <Route path="/history" element={<PowerHistoryPage />} />
                      <Route path="/schedules" element={<SchedulesPage />} />
                      <Route path="/stats" element={<Stats />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/admin/login" element={<AdminLogin />} />
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                  <MobileBottomNav />
                </div>
              </ToastProvider>
            </AuthProvider>
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
