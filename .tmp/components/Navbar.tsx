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
    <nav className="navbar-main">
      <div className="navbar-container">
        <div className="navbar-inner">

          {/* Logo */}
          <div className="navbar-logo">
            <Anchor className="logo-icon" />
            <span className="logo-text">
              DU<span>CC</span>
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="desktop-menu">
            <div className="navbar-links">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="navbar-link"
                >
                  {item.label}
                </a>
              ))}
              <button
                onClick={toggleTheme}
                className="theme-toggle"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="mobile-controls">
            <button
              onClick={toggleTheme}
              className="theme-toggle"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="mobile-menu-toggle"
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
            className="mobile-menu"
          >
            <div className="mobile-menu-links">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="mobile-link"
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