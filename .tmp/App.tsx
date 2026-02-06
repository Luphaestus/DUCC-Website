import React, { useState, useEffect } from 'react';
import Scene from './components/Scene';
import { Theme } from './types';
import { Sun, Moon } from 'lucide-react';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  if (!mounted) return null;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-50 dark:bg-slate-900 transition-colors duration-500">
      
      {/* 3D Background - Full Screen */}
      <div className="absolute inset-0 z-0">
        <Scene theme={theme} />
      </div>

      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-slate-900 dark:text-white transition-all shadow-xl hover:scale-105 active:scale-95"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-slate-700" />}
        </button>
      </div>

    </div>
  );
};

export default App;