import { ajaxGet } from './misc/ajax.js';
import { ViewChangedEvent } from './misc/view.js';

/**
 * Home View Module.
 * Manages the main landing page of the DUCC website.
 * Features a cross-fading hero slideshow, scroll animations (via MOS),
 * and an embedded Google Map.
 */

// --- DOM IDs ---

const home_view_id = '/home-view';

// --- Constants & Templates ---

/**
 * Large HTML template for the homepage.
 * Note: Data attributes like 'data-mos' are used by mos.js for scroll animations.
 */
const HTML_TEMPLATE = `<div id="${home_view_id}" class="view hidden">
            <div class="hero">
                <div class="hero-title" data-mos="fade-up">
                    <h1>Welcome to<br>Durham University<br>Canoe Club</h1>
                    <p>Paddle, Compete, Explore. Connect.</p>
                </div>

                <div class="hero-offer">
                    <h3>What We Offer</h3>
                    <div class="hero-offer-boxes">
                        <div class="hero-offer-box" data-mos="zoom-in">
                            <svg xmlns="http://www.w3.org/2000/svg" height="6vh" viewBox="0 -960 960 960" width="6vh" fill="currentColor"><path d="M80-40v-80h40q32 0 62-10t58-30q28 20 58 30t62 10q32 0 62.5-10t57.5-30q28 20 58 30t62 10q32 0 62.5-10t57.5-30q27 20 57.5 30t62.5 10h40v80h-40q-31 0-61-7.5T720-70q-29 15-59 22.5T600-40q-31 0-61-7.5T480-70q-29 15-59 22.5T360-40q-31 0-61-7.5T240-70q-29 15-59 22.5T120-40H80Zm280-160q-36 0-67-17t-53-43q-17 18-37.5 32.5T157-205q-41-11-83-26T0-260q54-23 132-47t153-36l54-167q11-34 41.5-45t57.5 3l102 52 113-60 66-148-20-53 53-119 128 57-53 119-53 20-148 334q93 11 186.5 38T960-260q-29 13-73.5 28.5T803-205q-25-7-45.5-21.5T720-260q-22 26-53 43t-67 17q-36 0-67-17t-53-43q-22 26-53 43t-67 17Zm203-157 38-85-61 32-70-36-28 86h38q21 0 42 .5t41 2.5Zm-83-223q-33 0-56.5-23.5T400-660q0-33 23.5-56.5T480-740q33 0 56.5 23.5T560-660q0 33-23.5 56.5T480-580Z"/></svg>
                            <h3>Weekly Sessions</h3>
                            <p>Beginner-friendly trips of the Wear & Tees plus pool sessions.</p>
                        </div>
                        <div class="hero-offer-box" data-mos="zoom-in">
                            <svg xmlns="http://www.w3.org/2000/svg" height="6vh" viewBox="0 -960 960 960" width="6vh" fill="currentColor"><path d="M80-80v-186l350-472-70-94 64-48 56 75 56-75 64 48-70 94 350 472v186H80Zm400-591L160-240v80h120l200-280 200 280h120v-80L480-671ZM378-160h204L480-302 378-160Zm102-280 200 280-200-280-200 280 200-280Z"/></svg>
                            <h3>UK & Europe Trips</h3>
                            <p>Exciting whitewater adventures year-round.</p>
                        </div>
                        <div class="hero-offer-box" data-mos="zoom-in">
                            <svg xmlns="http://www.w3.org/2000/svg" height="6vh" viewBox="0 -960 960 960" width="6vh" fill="currentColor"><path d="M480-160q75 0 127.5-52.5T660-340q0-75-52.5-127.5T480-520q-75 0-127.5 52.5T300-340q0 75 52.5 127.5T480-160ZM363-572q20-11 42.5-17.5T451-598L350-800H250l113 228Zm234 0 114-228H610l-85 170 19 38q14 4 27 8.5t26 11.5ZM256-208q-17-29-26.5-62.5T220-340q0-36 9.5-69.5T256-472q-42 14-69 49.5T160-340q0 47 27 82.5t69 49.5Zm448 0q42-14 69-49.5t27-82.5q0-47-27-82.5T704-472q17 29 26.5 62.5T740-340q0 36-9.5 69.5T704-208ZM480-80q-40 0-76.5-11.5T336-123q-9 2-18 2.5t-19 .5q-91 0-155-64T80-339q0-87 58-149t143-69L120-880h280l80 160 80-160h280L680-559q85 8 142.5 70T880-340q0 92-64 156t-156 64q-9 0-18.5-.5T623-123q-31 20-67 31.5T480-80Zm0-260ZM363-572 250-800l113 228Zm234 0 114-228-114 228ZM406-230l28-91-74-53h91l29-96 29 96h91l-74 53 28 91-74-56-74 56Z"/></svg>
                            <h3>Competitive Teams</h3>
                            <p>White Water Racing, Canoe Polo, Slalom & Freestyle.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="small-container">

                <h1>About Us</h1>

                <div class="about-us-para" data-mos="slide-up">
                    <p>Durham University Canoe Club is one of the most successful university canoe clubs in the country.
                        We have something to offer everyone, whatever their ability or level of confidence.</p>
                    <p>The club has a relaxed and very friendly atmosphere. Our activities are flexible so members can
                        come along as often or little as convenient and beginners are always welcome!</p>
                    <p>Our boathouse occupies a prime spot by the River Wear at the Maiden Castle sports centre.</p>
                    <p>
                        We run weekly sessions on the Rivers Wear and Tees as well as in a swimming pool. These sessions
                        cater to all abilities, whether you're a complete beginner looking to try out kayaking/canoeing
                        for the first time or part of our canoe polo teams looking to develop your skills further.
                        Additionally, we run multiple whitewater paddling day trips, weekends away and extended trips
                        across the UK and Europe. For people looking to try out whitewater for the first time or improve
                        their skills, we run multiple 'intro to whitewater sessions’ throughout the year to help you
                        develop the skills and confidence you need to get stuck into one of our trips.
                    </p>
                    <p>If you're interested in competitive paddling, we run regular training sessions for slalom,
                        freestyle, river racing and polo. We're ranked in the top three uni canoe clubs by the British
                        Universities and Colleges Sport organisation.</p>
                    <p>The club runs regular socials, making it a great place to meet new people.</p>
                    <p>If you are interested in joining, talk to one of our exec members or send us an email. Membership
                        is only £55 for the year. Whatever sort of canoeing you might be interested in, this active and
                        friendly club is for you.</p>
                    <p>Email: <a href="mailto:canoe.club@durham.ac.uk">canoe.club@durham.ac.uk</a></p>
                    <p>Facebook: <a href="https://www.facebook.com/groups/canoe.club/" target="_blank"
                            rel="noopener noreferrer">www.facebook.com/groups/canoe.club/</a></p>
                    <p>Instagram: <a href="https://www.instagram.com/durhamuniversitycanoe/" target="_blank"
                            rel="noopener noreferrer">https://www.instagram.com/durhamuniversitycanoe/</a></p>
                </div>

                <div class="find-us-para" data-mos="zoom-in">
                    <h1>Where to Find Us</h1>
                    <p>
                        Our boathouse is located at the Maiden Castle sports centre, which is about a fifteen-minute
                        walk from the Hill colleges and less than half an hour from most other colleges.
                    </p>
                    <p>
                        To get there, navigate towards "Maiden Castle". The map below shows the precise location of our
                        boathouse on the river.
                    </p>
                    <div class="map-container">
                        <iframe
                            data-src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d4603.299914236021!2d-1.559015!3d54.768541!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487e87002bb2c4ad%3A0xdaca718450a9120f!2sDurham%20University%20Canoe%20Club!5e0!3m2!1sen!2suk!4v1763136022459!5m2!1sen!2suk"
                            width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"
                            referrerpolicy="no-referrer-when-downgrade"></iframe>
                    </div>
                    <p>
                        Once you arrive at the main entrance, follow the road down towards the river to find our
                        boathouse. The images below will guide you.
                    </p>
                    <div class="find-us-images">
                        <img src="/images/misc/maiden-castle-outside.jpg"
                            alt="View from the main entrance of Maiden Castle">
                        <img src="/images/misc/boathouse-outside.jpg"
                            alt="Path leading from the road towards the river and boathouse">
                    </div>
                </div>
            </div>
        </div>`;

// --- State ---

let layers = []; // Elements for cross-fading layers
let activeLayerIndex = 0;
let slideshowInterval = null;
let slideImages = [];
let currentIdx = 0;

// --- Helper Functions ---

/**
 * Ensures the Google Maps iframe is loaded only when needed.
 * Uses lazy loading via data-src attribute.
 */
function initMap() {
    const mapIframe = document.querySelector('.map-container iframe');
    if (mapIframe && !mapIframe.src) {
        mapIframe.src = mapIframe.getAttribute('data-src');
    }
}

/**
 * Sets the background of a hero slide layer with CSS gradients for readability.
 * @param {HTMLElement} layer - The slide layer element.
 * @param {string} url - The URL of the image to set.
 */
function setLayerBg(layer, url) {
    let urlString = url ? `, url("${url}")` : '';

    layer.style.setProperty('--slide-img-light', "linear-gradient(to left, rgba(245, 246, 252, 0), rgb(231, 182, 238))" + urlString);
    layer.style.setProperty('--slide-img-dark', "linear-gradient(to left, rgba(245, 246, 252, 0), rgb(77, 26, 87))" + urlString);
}

/**
 * Preloads hero images to ensure smooth transitions.
 * @param {string[]} urls - List of image URLs.
 */
function preload(urls) {
    // Load first 3 immediately for the start of the slideshow
    urls.slice(0, 3).forEach(u => {
        const img = new Image();
        img.src = u;
    });

    // Staggered loading for the rest to conserve bandwidth
    if (urls.length > 3) {
        setTimeout(() => {
            urls.slice(3).forEach((u, i) => {
                setTimeout(() => {
                    const img = new Image();
                    img.src = u;
                }, i * 500);
            });
        }, 2000);
    }
}

/**
 * Executes a crossfade transition between two slide layers.
 * @param {string} url - The URL of the next image.
 */
function crossfadeTo(url) {
    const nextLayerIndex = 1 - activeLayerIndex;
    const nextLayer = layers[nextLayerIndex];
    const activeLayer = layers[activeLayerIndex];

    setLayerBg(nextLayer, url);

    nextLayer.classList.add('show');
    activeLayer.classList.remove('show');

    activeLayerIndex = nextLayerIndex;
}

/**
 * Starts the automatic slideshow loop.
 */
function startSlideshow() {
    if (slideshowInterval || slideImages.length === 0) return;

    slideshowInterval = setInterval(() => {
        currentIdx = (currentIdx + 1) % slideImages.length;
        crossfadeTo(slideImages[currentIdx]);
    }, 5000);
}

/**
 * Stops the automatic slideshow loop.
 */
function stopSlideshow() {
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
    }
}

// --- Main Update Function ---

/**
 * Initializes slideshow DOM and fetches image list from API.
 * @param {HTMLElement} hero - The hero container.
 */
function initSlideshow(hero) {
    const layerA = document.createElement('div');
    const layerB = document.createElement('div');
    layerA.className = 'slide';
    layerB.className = 'slide';
    hero.appendChild(layerA);
    hero.appendChild(layerB);

    layers = [layerA, layerB];
    activeLayerIndex = 0;

    ajaxGet('/api/slides/images').then((data) => {
        slideImages = data?.images || [];

        if (!slideImages.length) return;
        preload(slideImages);

        // Start with a random slide
        currentIdx = Math.floor(Math.random() * slideImages.length);

        setLayerBg(layers[activeLayerIndex], slideImages[currentIdx]);
        layers[activeLayerIndex].classList.add('show');

        // Delay applying transition property to prevent initial load flicker
        setTimeout(() => {
            layerA.style.transition = 'opacity 900ms ease';
            layerB.style.transition = 'opacity 900ms ease';

            if (window.location.pathname === '/home' || window.location.pathname === '/') {
                startSlideshow();
            }
        }, 50);
    }).catch(error => {
        console.error('Failed to load slide images:', error);
        setLayerBg(layers[0], null);
        layers[0].classList.add('show');
    });
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    const hero = document.querySelector('.hero');
    if (hero) {
        initSlideshow(hero);
    }

    // Listen for SPA view changes to start/stop the slideshow and map
    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        if (resolvedPath === '/home') {
            startSlideshow();
            initMap();
        } else {
            stopSlideshow();
        }
    });

    if (window.location.pathname === '/home' || window.location.pathname === '/') {
        initMap();
    }
});

// Append the view template to the main container
document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
