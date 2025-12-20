import { ajaxGet } from './misc/ajax.js';
import { ViewChangedEvent } from './misc/view.js';

// --- DOM IDs ---

const home_view_id = '/home-view';

// --- Constants & Templates ---

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
                            <img src="/images/icons/kayaking.svg" alt="">
                            <h3>Weekly Sessions</h3>
                            <p>Beginner-friendly trips of the Wear & Tees plus pool sessions.</p>
                        </div>
                        <div class="hero-offer-box" data-mos="zoom-in">
                            <img src="/images/icons/camping.svg" alt="">
                            <h3>UK & Europe Trips</h3>
                            <p>Exciting whitewater adventures year-round.</p>
                        </div>
                        <div class="hero-offer-box" data-mos="zoom-in">
                            <img src="/images/icons/social_leaderboard.svg" alt="">
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
                            src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d4603.299914236021!2d-1.559015!3d54.768541!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487e87002bb2c4ad%3A0xdaca718450a9120f!2sDurham%20University%20Canoe%20Club!5e0!3m2!1sen!2suk!4v1763136022459!5m2!1sen!2suk"
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

let layers = [];
let activeLayerIndex = 0;
let slideshowInterval = null;
let slideImages = [];
let currentIdx = 0;

// --- Helper Functions ---

/**
 * Sets the hero background image.
 * @param {HTMLElement} layer - The slide layer element.
 * @param {string} url - The URL of the image to set as the background.
 */
function setLayerBg(layer, url) {
    let urlString = url ? `, url("${url}")` : '';

    layer.style.setProperty('--slide-img-light', "linear-gradient(to left, rgba(245, 246, 252, 0), rgb(231, 182, 238))" + urlString);
    layer.style.setProperty('--slide-img-dark', "linear-gradient(to left, rgba(245, 246, 252, 0), rgb(77, 26, 87))" + urlString);
}

/**
 * Preloads an array of image URLs to avoid flickering.
 * @param {string[]} urls - An array of image URLs to preload.
 */
function preload(urls) {
    urls.forEach(u => {
        const img = new Image();
        img.src = u;
    });
}

/**
 * Crossfades to a new slide image.
 * @param {string} url - The URL of the new image to display.
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
 * Starts the slideshow interval if images are loaded and not already running.
 */
function startSlideshow() {
    if (slideshowInterval || slideImages.length === 0) return;

    slideshowInterval = setInterval(() => {
        currentIdx = (currentIdx + 1) % slideImages.length;
        crossfadeTo(slideImages[currentIdx]);
    }, 5000);
}

/**
 * Stops the slideshow interval.
 */
function stopSlideshow() {
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
    }
}

// --- Main Update Function ---

/**
 * Initializes the slideshow elements and starts the transition loop.
 * @param {HTMLElement} hero - The hero container element.
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

        currentIdx = Math.floor(Math.random() * slideImages.length);

        setLayerBg(layers[activeLayerIndex], slideImages[currentIdx]);
        layers[activeLayerIndex].classList.add('show');

        // Set transition after the initial image is shown to prevent the first image from fading in.
        setTimeout(() => {
            layerA.style.transition = 'opacity 900ms ease';
            layerB.style.transition = 'opacity 900ms ease';

            // Start the slideshow if we are currently viewing the home page
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

    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        if (resolvedPath === '/home') {
            startSlideshow();
        } else {
            stopSlideshow();
        }
    });
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
