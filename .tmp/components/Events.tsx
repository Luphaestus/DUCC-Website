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
    <section id="events" className="events-section">
      <div className="events-container">
        <div className="events-header">
          <div>
            <h2 className="events-title">Upcoming Events</h2>
            <p className="events-subtitle">Join us on the water or at the pub.</p>
          </div>
          <button className="calendar-btn">
            View Full Calendar
          </button>
        </div>

        <div className="events-list">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="event-card"
            >
              {/* Date Badge */}
              <div className="event-date-badge">
                <span className="date-month">
                  {event.date.split(' ')[0]}
                </span>
                <span className="date-day">
                  {event.date.split(' ')[1]}
                </span>
              </div>

              {/* Info */}
              <div className="event-info">
                <div className="event-top-row">
                  <span className={`event-category ${event.category.toLowerCase()}`}>
                    {event.category}
                  </span>
                  <h3 className="event-name">{event.title}</h3>
                </div>

                <div className="event-details">
                  <div className="detail-item">
                    <MapPin size={16} />
                    {event.location}
                  </div>
                  <div className="detail-item">
                    <Clock size={16} />
                    {event.time}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="event-cta">
                <button className="details-link">
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