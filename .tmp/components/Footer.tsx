import React from 'react';
import { Anchor, Instagram, Facebook, Twitter, Mail } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="footer-main">
      <div className="footer-container">
        <div className="footer-grid">
          
          <div className="footer-brand">
            <div className="brand-logo">
              <Anchor size={24} />
              <span>DUCC</span>
            </div>
            <p className="brand-description">
              The official canoe club of Durham University. Exploring rivers, winning competitions, and making memories since 1978.
            </p>
          </div>

          <div className="footer-nav-col">
            <h4>Club</h4>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Committee</a></li>
              <li><a href="#">Constitution</a></li>
              <li><a href="#">Alumni</a></li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4>Resources</h4>
            <ul>
              <li><a href="#">Kit List</a></li>
              <li><a href="#">Safety Policy</a></li>
              <li><a href="#">River Guides</a></li>
              <li><a href="#">Trip Signups</a></li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4>Connect</h4>
            <div className="footer-socials">
              <a href="#"><Instagram size={20} /></a>
              <a href="#"><Facebook size={20} /></a>
              <a href="#"><Twitter size={20} /></a>
            </div>
            <a href="mailto:canoe.club@durham.ac.uk" className="footer-contact-link">
                <Mail size={16} /> canoe.club@durham.ac.uk
            </a>
          </div>
        </div>
        
        <div className="footer-bottom">
          &copy; {new Date().getFullYear()} Durham University Canoe Club. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;