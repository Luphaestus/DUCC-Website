import { onMount, createSignal, Show } from "solid-js";
import { FaBrandsFacebook, FaBrandsInstagram, FaSolidEnvelope } from 'solid-icons/fa'
import { apiRequest } from "@/utils/api";

export default function Footer() {
  const [quote, setQuote] = createSignal<any>(null);

  onMount(async () => {
    try {
      const data = await apiRequest('GET', '/api/quotes/random');
      if (data) {
        setQuote(data);
      }
    } catch (e) {
      // Silently fail if no quotes or error
    }
  });

  return (
    <footer class="footer-main">
      <div class="small-container">
        <Show when={quote()}>
          <div id="footer-quote-container" class="footer-quote">
            <p id="footer-quote-text">"{quote().text}"</p>
            <cite id="footer-quote-author">- {quote().quoted_first_name} {quote().quoted_last_name}</cite>
          </div>
        </Show>
        <div class="footer-content">
          <div class="social-links">
            <a href="https://www.facebook.com/DurhamUniversityCanoeClub" target="_blank" aria-label="Facebook">
              <FaBrandsFacebook />
            </a>
            <a href="https://www.instagram.com/durhamuniversitycanoe/" target="_blank" aria-label="Instagram">
              <FaBrandsInstagram />
            </a>
            <a href="mailto:canoe.club@durham.ac.uk" aria-label="Email">
              <FaSolidEnvelope />
            </a>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Durham University Canoe Club. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
