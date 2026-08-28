import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, Menu, X, ShieldAlert, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { setLanguage, isBn, t } = useLanguage();

  const navItems = [
    { name: t('navMap'), path: '/' },
    { name: t('navAreas'), path: '/areas' },
    { name: t('navHistory'), path: '/history' },
    { name: t('navSchedules'), path: '/schedules' },
    { name: t('navStats'), path: '/stats' },
    { name: t('navAbout'), path: '/about' },
  ];

  const isActive = (path) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0a0a0b]/95 border-b border-stone-200/80 dark:border-zinc-800 border-b transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between">
        {/* Brand Mark + Title */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-150">
            <Zap className="w-3.5 h-3.5 fill-current" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base tracking-tight text-stone-900 dark:text-zinc-100">
              {t('brandName')}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
              {t('liveBadge')}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-5">
          <div className="flex items-center gap-4 text-xs sm:text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`transition-colors py-1 ${
                  isActive(item.path)
                    ? 'text-orange-600 dark:text-orange-400 font-bold border-b-2 border-orange-600 dark:border-orange-400'
                    : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 border-l border-stone-200 dark:border-zinc-800 pl-3">
            {/* Language Selector (বাংলা | EN) */}
            <div className="flex items-center bg-stone-100 dark:bg-[#111214] p-0.5 rounded-lg border border-stone-200 dark:border-zinc-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  isBn
                    ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 font-bold shadow-xs'
                    : 'text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                বাংলা
              </button>
              <span className="text-stone-300 dark:text-zinc-700">|</span>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  !isBn
                    ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 font-bold shadow-xs'
                    : 'text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-900 transition-colors"
              title={isDark ? 'লাইট মোড' : 'ডার্ক মোড'}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
            </button>

            {isAuthenticated && (
              <Link
                to="/admin"
                className="px-2 py-0.5 rounded-md text-xs font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors flex items-center gap-1"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                {t('navAdmin')}
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile Header Controls */}
        <div className="flex md:hidden items-center gap-1">
          <button
            onClick={() => setLanguage(isBn ? 'en' : 'bn')}
            className="px-2 py-0.5 rounded-md text-xs font-bold bg-stone-100 dark:bg-[#111214] text-stone-700 dark:text-zinc-300 border border-stone-200 dark:border-zinc-800"
            aria-label="Switch Language"
          >
            {isBn ? 'EN' : 'বাংলা'}
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-900 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-md text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-900 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0b] px-4 pt-2 pb-4 space-y-1 shadow-md animate-in slide-in-from-top-2 duration-150">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-300 font-bold'
                  : 'text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-900'
              }`}
            >
              <span>{item.name}</span>
            </Link>
          ))}
          {isAuthenticated && (
            <Link
              to="/admin"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-300"
            >
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              <span>{t('navAdmin')}</span>
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
