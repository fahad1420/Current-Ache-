import React from 'react';
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

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
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
  );
}

export default App;
