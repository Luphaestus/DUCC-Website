import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Waves } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section id="home" className="relative flex items-center justify-center min-h-screen pt-16 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-palatinate/10 dark:bg-white/10 text-palatinate dark:text-palatinate-light backdrop-blur-sm border border-palatinate/20 mb-6">
            <Waves size={16} />
            <span className="text-sm font-semibold tracking-wide uppercase">Est. 1978</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 text-slate-900 dark:text-white drop-shadow-xl">
            Durham University <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-palatinate to-blue-500 dark:from-palatinate-light dark:to-cyan-400">
              Canoe Club
            </span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-xl md:text-2xl text-slate-600 dark:text-slate-300 font-light">
            From the River Wear to the Alps. We are a community of paddlers embracing adventure, competition, and social spirit.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <a
            href="#join"
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-palatinate font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 hover:bg-palatinate-light shadow-lg hover:shadow-palatinate/50"
          >
            Join the Club
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
          
          <a
            href="#disciplines"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-900 dark:text-white transition-all duration-200 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            Explore Disciplines
          </a>
        </motion.div>

        {/* Floating Stats */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 1, delay: 0.5 }}
           className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
            {[
                { label: 'Members', value: '250+' },
                { label: 'Trips/Year', value: '40+' },
                { label: 'Varsity Wins', value: '12' },
                { label: 'River Level', value: 'High' },
            ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center p-4 rounded-lg bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm border border-white/20">
                    <span className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wider">{stat.label}</span>
                </div>
            ))}
        </motion.div>

      </div>
    </section>
  );
};

export default Hero;