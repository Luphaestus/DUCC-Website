import React from 'react';
import { Anchor, Instagram, Facebook, Twitter, Mail } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="relative z-10 bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Anchor className="w-6 h-6 text-palatinate dark:text-palatinate-light" />
              <span className="font-bold text-lg text-slate-900 dark:text-white">DUCC</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The official canoe club of Durham University. Exploring rivers, winning competitions, and making memories since 1978.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Club</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li><a href="#" className="hover:text-palatinate dark:hover:text-palatinate-light">About Us</a></li>
              <li><a href="#" className="hover:text-palatinate dark:hover:text-palatinate-light">Committee</a></li>
              <li><a href="#" className="hover:text-palatinate dark:hover:text-palatinate-light">Constitution</a></li>
              <li><a href="#" className="hover:text-palatinate dark:hover:text-palatinate-light">Alumni</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li><a href="#" className="hover:text-palatinate dark:hover:text-palatinate-light">Kit List</a></li>
              <li><a href="#" className="hover:text-palatinate dark:hover:text-palatinate-light">Safety Policy</a></li>
              <li><a href="#" className="hover:text-palatinate dark:hover:text-palatinate-light">River Guides</a></li>
              <li><a href="#" className="hover:text-palatinate dark:hover:text-palatinate-light">Trip Signups</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Connect</h4>
            <div className="flex space-x-4 mb-4">
              <a href="#" className="text-slate-400 hover:text-palatinate dark:hover:text-palatinate-light transition-colors"><Instagram size={20} /></a>
              <a href="#" className="text-slate-400 hover:text-palatinate dark:hover:text-palatinate-light transition-colors"><Facebook size={20} /></a>
              <a href="#" className="text-slate-400 hover:text-palatinate dark:hover:text-palatinate-light transition-colors"><Twitter size={20} /></a>
            </div>
            <a href="mailto:canoe.club@durham.ac.uk" className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-palatinate dark:hover:text-palatinate-light">
                <Mail size={16} className="mr-2" /> canoe.club@durham.ac.uk
            </a>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-slate-800 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Durham University Canoe Club. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;