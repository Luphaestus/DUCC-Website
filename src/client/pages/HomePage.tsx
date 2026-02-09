// todo clean up
import { createSignal, onMount, onCleanup } from "solid-js";
import { apiRequest, clearApiCache } from "@/utils/api";
import { KAYAKING_SVG, SOCIAL_LEADERBOARD_SVG, CAMPING_SVG } from "@/utils/icons";

export default function HomePage() {
  const [slideImages, setSlideImages] = createSignal<string[]>([]);
  const [activeLayer, setActiveLayer] = createSignal(0);
  const [layers, setLayers] = createSignal<[string | null, string | null]>([null, null]);
  const [currentIdx, setCurrentIdx] = createSignal(0);
  let slideshowInterval: any;

  onMount(async () => {
    try {
      clearApiCache('/api/slides/images');
      const data = await apiRequest('GET', '/api/slides/images');
      const images = data?.images || [];
      setSlideImages(images);

      if (images.length > 0) {
        const startIdx = Math.floor(Math.random() * images.length);
        setCurrentIdx(startIdx);
        setLayers([images[startIdx], null]);

        slideshowInterval = setInterval(() => {
          const nextIdx = (currentIdx() + 1) % images.length;
          setCurrentIdx(nextIdx);

          const nextLayer = 1 - activeLayer();
          const newLayers: [string | null, string | null] = [...layers()] as [string | null, string | null];
          newLayers[nextLayer] = images[nextIdx];

          setLayers(newLayers);
          setActiveLayer(nextLayer);
        }, 5000);
      }
    } catch (e) {
      console.error("Failed to fetch slides", e);
    }
  });

  onCleanup(() => {
    if (slideshowInterval) clearInterval(slideshowInterval);
  });

  return (
    <div id="home-view" class="view">
      <div class="hero">
        <div class="slideshow-container">
          <div class="slide" classList={{ show: activeLayer() === 0 }} style={{ "--slide-url": layers()[0] ? `url("${layers()[0]}")` : 'none' }}></div>
          <div class="slide" classList={{ show: activeLayer() === 1 }} style={{ "--slide-url": layers()[1] ? `url("${layers()[1]}")` : 'none' }}></div>
        </div>

        <div class="hero-title">
          <h1>Welcome to<br />Durham  University<br />Canoe Club</h1>
          <p>Paddle, Compete, Explore. Connect.</p>
        </div>

        <div class="hero-offer">
          <div class="hero-offer-boxes">
            <div class="hero-offer-box-wrapper">
              <div class="liquid-container hero-offer-box" style={{ "--liquid-padding": "2rem" }}>
                <span innerHTML={KAYAKING_SVG} />
                <h3>Weekly Sessions</h3>
                <p>Beginner-friendly trips of the Wear & Tees plus pool sessions.</p>
              </div>
            </div>
            <div class="hero-offer-box-wrapper">
              <div class="liquid-container hero-offer-box" style={{ "--liquid-padding": "2rem" }}>
                <span innerHTML={CAMPING_SVG} />
                <h3>UK & Europe Trips</h3>
                <p>Exciting whitewater adventures year-round.</p>
              </div>
            </div>
            <div class="hero-offer-box-wrapper">
              <div class="liquid-container hero-offer-box" style={{ "--liquid-padding": "2rem" }}>
                <span innerHTML={SOCIAL_LEADERBOARD_SVG} />
                <h3>Competitive Teams</h3>
                <p>White Water Racing, Canoe Polo, Slalom & Freestyle.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="liquid-container about-us-section" style={{ "--liquid-padding": "3rem", "--liquid-border-radius": "24px" }}>
        <h1>About Us</h1>
        <div class="about-us-para">
          <p>Durham University Canoe Club is one of the most successful university canoe clubs in the country.</p>
          <p>The club has a relaxed and friendly atmosphere. Beginners are always welcome!</p>
          <p>Our boathouse occupies a prime spot by the River Wear at the Maiden Castle sports centre.</p>
          <p>We run weekly sessions on the Wear and Tees, pool training, and whitewater trips across the UK and Europe.</p>
          <p>If you're interested in joining, talk to an exec member or email us. Membership is only £55/year.</p>
          <p>Email: <a href="mailto:canoe.club@durham.ac.uk">canoe.club@durham.ac.uk</a></p>
        </div>
      </div>

      <div class="liquid-container find-us-section" style={{ "--liquid-padding": "3rem", "--liquid-border-radius": "24px" }}>
        <h1>Where to Find Us</h1>
        <p>Our boathouse is located at the Maiden Castle sports centre.</p>
        <div class="find-us-para">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d4603.299914236021!2d-1.559015!3d54.768541!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487e87002bb2c4ad%3A0xdaca718450a9120f!2sDurham%20University%20Canoe%20Club!5e0!3m2!1sen!2suk!4v1763136022459!5m2!1sen!2suk"
            width="600" height="450" allowfullscreen={true} loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
        <div class="find-us-images">
          <img src="/images/misc/maiden-castle-outside.jpg" alt="Maiden Castle entrance" />
          <img src="/images/misc/boathouse-outside.jpg" alt="Path to boathouse" />
        </div>
      </div>
    </div>
  );
}
