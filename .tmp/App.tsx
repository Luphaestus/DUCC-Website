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
    <div className="app-container">

      {/* 3D Background - Full Screen */}
      <div className="scene-wrapper">
        <Scene theme={theme} />
      </div>

      {/* Floating Theme Toggle */}
      <div className="theme-toggle-wrapper">
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun size={24} className="sun-icon" />
          ) : (
            <Moon size={24} className="moon-icon" />
          )}
        </button>
      </div>

    </div>
  );
};

export default App;