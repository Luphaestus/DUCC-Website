import React from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const events = [
  {
    id: 1,
    title: 'Tyne Tour 2024',
    date: 'Nov 14 - Nov 16',
    location: 'River Tyne, Hexham',
    time: '08:00 AM',
    category: 'Trip',
  },
  {
    id: 2,
    title: 'Freshers Pool Session',
    date: 'Oct 05',
    location: 'Freeman’s Quay Leisure Centre',
    time: '19:30 PM',
    category: 'Social',
  },
  {
    id: 3,
    title: 'BUCS Wild Water Racing',
    date: 'Nov 24',
    location: 'River Washburn',
    time: '09:00 AM',
    category: 'Competition',
  },
  {
    id: 4,
    title: 'Christmas Dinner',
    date: 'Dec 12',
    location: 'Durham Castle',
    time: '19:00 PM',
    category: 'Social',
  },
];

const Events: React.FC = () => {
  return (
    <section id="events" className="py-24 relative z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
          <div>
             <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white">Upcoming Events</h2>
             <p className="mt-2 text-slate-600 dark:text-slate-300">Join us on the water or at the pub.</p>
          </div>
          <button className="mt-4 md:mt-0 px-6 py-2 bg-transparent border border-palatinate text-palatinate dark:border-palatinate-light dark:text-palatinate-light rounded-full hover:bg-palatinate hover:text-white dark:hover:bg-palatinate-light transition-all font-medium">
            View Full Calendar
          </button>
        </div>

        <div className="space-y-4">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col md:flex-row items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:border-palatinate/50 dark:hover:border-palatinate-light/50 transition-colors"
            >
              {/* Date Badge */}
              <div className="flex-shrink-0 w-full md:w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-xl flex flex-col items-center justify-center text-center mb-4 md:mb-0 md:mr-8 border border-gray-200 dark:border-slate-700">
                <span className="text-xs font-bold uppercase text-palatinate dark:text-palatinate-light">
                  {event.date.split(' ')[0]}
                </span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {event.date.split(' ')[1]}
                </span>
              </div>

              {/* Info */}
              <div className="flex-grow text-center md:text-left space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        event.category === 'Trip' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        event.category === 'Competition' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                    }`}>
                        {event.category}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{event.title}</h3>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 text-sm text-slate-500 dark:text-slate-400 items-center md:items-start justify-center md:justify-start">
                  <div className="flex items-center gap-1">
                    <MapPin size={16} />
                    {event.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    {event.time}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-4 md:mt-0 flex-shrink-0">
                  <button className="text-sm font-semibold text-palatinate dark:text-palatinate-light hover:text-palatinate-dark dark:hover:text-white transition-colors">
                    Details &rarr;
                  </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Events;