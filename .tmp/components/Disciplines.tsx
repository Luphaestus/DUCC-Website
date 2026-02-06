import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Trophy, Map, Zap } from 'lucide-react';

const disciplinesData = [
  {
    title: 'Canoe Polo',
    description: 'Fast-paced, tactical, and aggressive. Think water polo but in kayaks. We have multiple teams competing nationally.',
    icon: <Shield className="w-8 h-8" />,
    color: 'from-red-500 to-orange-500',
    img: 'https://picsum.photos/id/1059/800/600',
  },
  {
    title: 'White Water',
    description: 'Running rapids, waterfalls, and technical rivers. We run trips every weekend ranging from beginner friendly to advanced.',
    icon: <Zap className="w-8 h-8" />,
    color: 'from-blue-500 to-cyan-500',
    img: 'https://picsum.photos/id/1039/800/600',
  },
  {
    title: 'Slalom',
    description: 'Precision and speed through gates. Hone your technique and compete in BUCS events against other universities.',
    icon: <Map className="w-8 h-8" />,
    color: 'from-green-500 to-emerald-500',
    img: 'https://picsum.photos/id/1015/800/600',
  },
  {
    title: 'Freestyle',
    description: 'Tricks, flips, and spins on standing waves. Express yourself on the water.',
    icon: <Trophy className="w-8 h-8" />,
    color: 'from-purple-500 to-pink-500',
    img: 'https://picsum.photos/id/1043/800/600',
  },
];

const Disciplines: React.FC = () => {
  return (
    <section id="disciplines" className="py-24 relative z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white">Our Disciplines</h2>
          <p className="mt-4 text-xl text-slate-600 dark:text-slate-300">Whatever your style, we have a boat for you.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {disciplinesData.map((d, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-gray-100 dark:border-slate-700 hover:shadow-2xl transition-all duration-300"
            >
              {/* Image Overlay */}
              <div className="h-48 overflow-hidden">
                <img 
                    src={d.img} 
                    alt={d.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
              </div>

              <div className="p-6 relative">
                 <div className={`absolute -top-10 right-6 p-3 rounded-xl bg-gradient-to-br ${d.color} text-white shadow-lg`}>
                    {d.icon}
                 </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{d.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {d.description}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                    <button className="text-palatinate dark:text-palatinate-light font-semibold text-sm hover:underline">
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