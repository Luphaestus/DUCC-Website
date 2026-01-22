import { ajaxGet } from '/js/utils/ajax.js';
import { ViewChangedEvent, addRoute } from '/js/utils/view.js';
import { KAYAKING_SVG, SOCIAL_LEADERBOARD_SVG, CAMPING_SVG } from '../../images/icons/outline/icons.js';


/**
 * Home page view management.
 * @module Home
 */

const home_view_id = 'home-view';
addRoute('/home', 'home');

/**
 * Home page template.
 */
const HTML_TEMPLATE = /*html*/`<div id="${home_view_id}" class="view hidden">
            <div class="hero">
                <div class="hero-title" data-mos="fade-up">
                    <h1>Welcome to<br>Durham University<br>Canoe Club</h1>
                    <p>Paddle, Compete, Explore. Connect.</p>
                </div>

                <div class="hero-offer">
                    <h3>What We Offer</h3>
                    <div class="hero-offer-boxes">
                        <div class="hero-offer-box" data-mos="zoom-in">
                            ${KAYAKING_SVG}
                            <h3>Weekly Sessions</h3>
                            <p>Beginner-friendly trips of the Wear & Tees plus pool sessions.</p>
                        </div>
                        <div class="hero-offer-box" data-mos="zoom-in">
                            ${CAMPING_SVG}
                            <h3>UK & Europe Trips</h3>
                            <p>Exciting whitewater adventures year-round.</p>
                        </div>
                        <div class="hero-offer-box" data-mos="zoom-in">
                            ${SOCIAL_LEADERBOARD_SVG}
                            <h3>Competitive Teams</h3>
                            <p>White Water Racing, Canoe Polo, Slalom & Freestyle.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="small-container">
                <h1>About Us</h1>
                <div class="about-us-para" data-mos="slide-up">
                    <p>Durham University Canoe Club is one of the most successful university canoe clubs in the country.</p>
                    <p>The club has a relaxed and friendly atmosphere. Beginners are always welcome!</p>
                    <p>Our boathouse occupies a prime spot by the River Wear at the Maiden Castle sports centre.</p>
                    <p>We run weekly sessions on the Wear and Tees, pool training, and whitewater trips across the UK and Europe.</p>
                    <p>If you're interested in joining, talk to an exec member or email us. Membership is only £55/year.</p>
                    <p>Email: <a href="mailto:canoe.club@durham.ac.uk">canoe.club@durham.ac.uk</a></p>
                </div>

                <div class="find-us-para" data-mos="zoom-in">
                    <h1>Where to Find Us</h1>
                    <p>Our boathouse is located at the Maiden Castle sports centre.</p>
                    <div class="map-container">
                        <iframe
                            data-src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d4603.299914236021!2d-1.559015!3d54.768541!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487e87002bb2c4ad%3A0xdaca718450a9120f!2sDurham%20University%20Canoe%20Club!5e0!3m2!1sen!2suk!4v1763136022459!5m2!1sen!2suk"
                            width="600" height="450" allowfullscreen="" loading="lazy"
                            referrerpolicy="no-referrer-when-downgrade"></iframe>
                    </div>
                    <div class="find-us-images">
                        <img src="/images/misc/maiden-castle-outside.jpg" alt="Maiden Castle entrance">
                        <img src="/images/misc/boathouse-outside.jpg" alt="Path to boathouse">
                    </div>
                </div>
            </div>
        </div>`;

let layers = [];
let activeLayerIndex = 0;
let slideshowInterval = null;
let slideImages = [];
let currentIdx = 0;

/**
 * Initialize Google Maps iframe.
 */
function initMap() {
    const mapIframe = document.querySelector('.map-container iframe');
    if (mapIframe && !mapIframe.src) {
        mapIframe.src = mapIframe.getAttribute('data-src');
    }
}

/**
 * Set hero slide background image.
 * @param {HTMLElement} layer
 * @param {string} url
 */
function setLayerBg(layer, url) {
    let urlString = url ? `url("${url}")` : 'none';
    layer.style.setProperty('--slide-img-url', urlString);
}

/**
 * Preload slideshow images.
 * @param {string[]} urls
 */
function preload(urls) {
    urls.slice(0, 3).forEach(u => { const img = new Image(); img.src = u; });
    if (urls.length > 3) {
        setTimeout(() => {
            urls.slice(3).forEach((u, i) => {
                setTimeout(() => { const img = new Image(); img.src = u; }, i * 500);
            });
        }, 2000);
    }
}

/**
 * Crossfade to next slide.
 * @param {string} url
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
 * Start automatic slideshow.
 */
function startSlideshow() {
    if (slideshowInterval || slideImages.length === 0) return;
    slideshowInterval = setInterval(() => {
        currentIdx = (currentIdx + 1) % slideImages.length;
        crossfadeTo(slideImages[currentIdx]);
    }, 5000);
}

/**
 * Stop automatic slideshow.
 */
function stopSlideshow() {
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
    }
}

/**
 * Initialize slideshow and fetch images.
 * @param {HTMLElement} hero
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

        setTimeout(() => {
            if (window.location.pathname === '/home' || window.location.pathname === '/') startSlideshow();
        }, 50);
    }).catch(error => {
        setLayerBg(layers[0], null);
        layers[0].classList.add('show');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const hero = document.querySelector('.hero');
    if (hero) initSlideshow(hero);

    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        if (resolvedPath === '/home') {
            startSlideshow();
            initMap();
        } else stopSlideshow();
    });

    if (window.location.pathname === '/home' || window.location.pathname === '/') initMap();
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);