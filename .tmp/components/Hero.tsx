import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Waves } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section id="home" className="hero-section">
      <div className="hero-container">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="hero-header"
        >
          <div className="hero-badge">
            <Waves size={16} />
            <span>Est. 1978</span>
          </div>

          <h1 className="hero-title">
            Durham University <br />
            <span className="text-gradient">
              Canoe Club
            </span>
          </h1>

          <p className="hero-description">
            From the River Wear to the Alps. We are a community of paddlers embracing adventure, competition, and social spirit.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="hero-actions"
        >
          <a
            href="#join"
            className="hero-btn-primary"
          >
            Join the Club
            <ArrowRight size={20} />
          </a>

          <a
            href="#disciplines"
            className="hero-btn-secondary"
          >
            Explore Disciplines
          </a>
        </motion.div>

        {/* Floating Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="hero-stats"
        >
          {[
            { label: 'Members', value: '250+' },
            { label: 'Trips/Year', value: '40+' },
            { label: 'Varsity Wins', value: '12' },
            { label: 'River Level', value: 'High' },
          ].map((stat, i) => (
            <div key={i} className="stat-item">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
};

export default Hero;