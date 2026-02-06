import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Trophy, Map, Zap } from 'lucide-react';

const disciplinesData = [
  {
    title: 'Canoe Polo',
    description: 'Fast-paced, tactical, and aggressive. Think water polo but in kayaks. We have multiple teams competing nationally.',
    icon: <Shield />,
    gradient: 'linear-gradient(135deg, #ef4444, #f97316)',
    img: 'https://picsum.photos/id/1059/800/600',
  },
  {
    title: 'White Water',
    description: 'Running rapids, waterfalls, and technical rivers. We run trips every weekend ranging from beginner friendly to advanced.',
    icon: <Zap />,
    gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    img: 'https://picsum.photos/id/1039/800/600',
  },
  {
    title: 'Slalom',
    description: 'Precision and speed through gates. Hone your technique and compete in BUCS events against other universities.',
    icon: <Map />,
    gradient: 'linear-gradient(135deg, #22c55e, #10b981)',
    img: 'https://picsum.photos/id/1015/800/600',
  },
  {
    title: 'Freestyle',
    description: 'Tricks, flips, and spins on standing waves. Express yourself on the water.',
    icon: <Trophy />,
    gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
    img: 'https://picsum.photos/id/1043/800/600',
  },
];

const Disciplines: React.FC = () => {
  return (
    <section id="disciplines" className="disciplines-section">
      <div className="disciplines-container">
        <div className="disciplines-header">
          <h2 className="disciplines-title">Our Disciplines</h2>
          <p className="disciplines-subtitle">Whatever your style, we have a boat for you.</p>
        </div>

        <div className="disciplines-grid">
          {disciplinesData.map((d, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="discipline-card"
            >
              <div className="discipline-image-container">
                <img
                  src={d.img}
                  alt={d.title}
                  className="discipline-image"
                />
                <div className="discipline-overlay" />
              </div>

              <div className="discipline-content">
                <div 
                  className="discipline-icon-wrapper"
                  style={{ background: d.gradient }}
                >
                  {d.icon}
                </div>
                <h3 className="discipline-name">{d.title}</h3>
                <p className="discipline-description">
                  {d.description}
                </p>
                <div className="discipline-footer">
                  <button className="discipline-link">
                    Learn more &rarr;
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Disciplines;