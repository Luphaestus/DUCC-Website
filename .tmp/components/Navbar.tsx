import React, { useState } from 'react';
import { Theme } from '../types';
import { Moon, Sun, Menu, X, Anchor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  theme: Theme;
  toggleTheme: () => void;
}

const navItems = [
  { label: 'About', href: '#about' },
  { label: 'Disciplines', href: '#disciplines' },
  { label: 'Events', href: '#events' },
  { label: 'Join Us', href: '#join' },
];

const Navbar: React.FC<NavbarProps> = ({ theme, toggleTheme }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex-shrink-0 cursor-pointer flex items-center gap-2">
            <Anchor className="w-8 h-8 text-palatinate dark:text-palatinate-light" />
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
              DU<span className="text-palatinate dark:text-palatinate-light">CC</span>
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-3 py-2 rounded-md text-sm font-medium hover:text-palatinate dark:hover:text-palatinate-light transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-4">
             <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md hover:text-palatinate focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-white/5 hover:text-palatinate"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;