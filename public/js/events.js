/**
 * Weekly calendar view for events.
 */

import { ajaxGet } from './misc/ajax.js';
import { LoginEvent } from './login.js';
import { ViewChangedEvent } from './misc/view.js';
import './event.js';

/**
 * Main events view template.
 */
const HTML_TEMPLATE = `
        <div id="/events-view" class="view hidden small-container">
            <div class="events-controls">
                <div class="week-nav-icons">
                    <span class="prev-week nav-icon" title="Previous Week"><svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12 21a9 9 0 1 0 0 -18a9 9 0 0 0 0 18" />
  <path d="M8 12l4 4" />
  <path d="M8 12h8" />
  <path d="M12 8l-4 4" />
</svg></span>
                    <span class="next-week nav-icon" title="Next Week"><svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0 -18" />
  <path d="M16 12l-4 -4" />
  <path d="M16 12h-8" />
  <path d="M12 16l4 -4" />
</svg></span>
                </div>
                <h1 id="events-controls-title">Loading Week...</h1>
                <button class="this-week-button secondary">Today 📅</button>
            </div>

            <div id="events-list">
                <div id="events-slider">
                    <div class="events-page" id="events-page-current">
                        <p aria-busy="true" style="text-align: center; margin-top: 2rem;">Loading events...</p>
                    </div>
                </div>
            </div>
            <div id="event-navigation"></div>
        </div>`

let relativeWeekOffset = 0;
let isAnimating = false;
let isDragging = false;
let startX = 0;
let currentTranslate = 0;
let animationID = 0;

/**
 * Calculate HSL hue from HEX color.
 */
function getHueFromHex(hex) {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 0;

    var r = parseInt(result[1], 16) / 255;
    var g = parseInt(result[2], 16) / 255;
    var b = parseInt(result[3], 16) / 255;

    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max == min) {
        h = s = 0; 
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return Math.round(h * 360);
}

/**
 * Format event data into an HTML card.
 */
function formatEvent(event) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const startTime = startDate.toLocaleTimeString('en-UK', timeOptions);
    const endTime = endDate.toLocaleTimeString('en-UK', timeOptions);

    const tagsHtml = (event.tags || []).map(tag => `<span class="tag" style="background-color: ${tag.color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-right: 4px;">${tag.name}</span>`).join('');

    let hue = 0;
    let hasTags = false;

    if (event.tags && event.tags.length > 0) {
        hasTags = true;
        const highestPriorityTag = event.tags.reduce((prev, current) => {
            return ((prev.priority || 0) > (current.priority || 0)) ? prev : current;
        });
        hue = getHueFromHex(highestPriorityTag.color || '#808080');
    }

    let classes = 'event-item';
    if (startDate < new Date()) classes += ' past-event';
    if (!hasTags) classes += ' glassy';

    let style = hasTags ? `--event-bg-light: hsl(${hue}, 70%, 85%); --event-bg-dark: hsl(${hue}, 50%, 30%);` : '';

    return `
        <div class="${classes}" style="${style}" onclick="switchView('event/${event.id}')">
            <div class="event-top">
                <span>${startTime} - ${endTime}</span>
                ${event.is_attending ? `<span class="attending-badge" style="background: #2ecc71; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; margin-left: auto;">✓ Attending</span>` : ''}
            </div>
            <div class="event-middle">
                <h3>${event.title || 'No Title'}</h3>
            </div>
            <div class="event-bottom">
                <div class="event-location">
                    <span>📍 ${event.location || 'No Location'}</span>
                </div>
                <div class="event-tags" style="margin-left: auto;">${tagsHtml}</div>
            </div>
        </div>
    `;
}

/**
 * Sync week offset to URL.
 */
function updateUrlParams() {
    const url = new URL(window.location);
    if (relativeWeekOffset === 0) url.searchParams.delete('week');
    else url.searchParams.set('week', relativeWeekOffset);
    window.history.pushState({}, '', url);
}

/**
 * Fetch and render events for a specific week into a target element.
 */
async function renderWeekContent(offset, targetElement) {
    try {
        const data = await ajaxGet(`/api/events/rweek/${offset}`);
        const events = data.events;

        if (!events || events.length === 0) {
            targetElement.innerHTML = '<p style="text-align: center; margin-top: 2rem;">No events scheduled for this week.</p>';
            return;
        }

        let html = '';
        let last_day = null;
        for (const event of events) {
            const eventDate = new Date(event.start).getDate();
            if (last_day !== eventDate) {
                if (last_day !== null) html += '</div>';
                last_day = eventDate;
                html += `<h2 class="event-day-header">${new Date(event.start).toLocaleDateString('en-UK', { weekday: 'long', month: 'short', day: 'numeric' })}</h2><div class="day-events-container">`;
            }
            html += formatEvent(event);
        }
        if (events.length > 0) html += '</div>';
        targetElement.innerHTML = html;
    } catch (error) {
        targetElement.innerHTML = '<p class="error-message">Failed to load events.</p>';
    }
}

/**
 * Update the controls (title and buttons).
 */
function updateControls() {
    const title = document.getElementById('events-controls-title');
    if (!title) return;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1) + relativeWeekOffset * 7);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    title.textContent = `${startOfWeek.toLocaleDateString('en-UK', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-UK', { month: 'short', day: 'numeric' })}`;

    const thisWeekButton = document.querySelector('.this-week-button');
    if (thisWeekButton) thisWeekButton.disabled = relativeWeekOffset === 0;
}

/**
 * Change the current week with an optional animation.
 */
async function changeWeek(delta, animated = true) {
    if (isAnimating) return;
    const slider = document.getElementById('events-slider');
    const currentView = document.getElementById('events-page-current');
    if (!slider || !currentView) return;

    if (delta === 0 && relativeWeekOffset === 0) return;

    isAnimating = true;
    
    // Determine animation direction
    let direction = delta;
    if (delta === 0) {
        direction = relativeWeekOffset > 0 ? -1 : 1;
    }

    const newOffset = delta === 0 ? 0 : relativeWeekOffset + delta;
    relativeWeekOffset = newOffset;
    
    updateUrlParams();
    updateControls();

    if (!animated) {
        await renderWeekContent(relativeWeekOffset, currentView);
        isAnimating = false;
        currentTranslate = 0;
        slider.style.transform = 'translateX(0%)';
        return;
    }

    const nextView = document.createElement('div');
    nextView.className = 'events-page';
    nextView.innerHTML = '<p aria-busy="true" style="text-align: center; margin-top: 2rem;">Loading events...</p>';
    
    const loadPromise = renderWeekContent(relativeWeekOffset, nextView);

    if (direction > 0) { // Sliding to the Left (Forward)
        slider.appendChild(nextView);
        slider.style.transition = 'none';
        slider.style.transform = `translateX(${currentTranslate}px)`;
        slider.offsetHeight; // Reflow
        slider.classList.add('transitioning');
        slider.style.transform = 'translateX(-100%)';
    } else { // Sliding to the Right (Backward)
        slider.insertBefore(nextView, currentView);
        slider.style.transition = 'none';
        slider.style.transform = `translateX(calc(-100% + ${currentTranslate}px))`;
        slider.offsetHeight; // Reflow
        slider.classList.add('transitioning');
        slider.style.transform = 'translateX(0%)';
    }

    setTimeout(async () => {
        try {
            await loadPromise;
            currentView.innerHTML = nextView.innerHTML;
        } catch (e) {}
        
        slider.classList.remove('transitioning');
        slider.style.transition = 'none';
        slider.style.transform = 'translateX(0%)';
        if (nextView.parentNode === slider) {
            slider.removeChild(nextView);
        }
        isAnimating = false;
        currentTranslate = 0;
    }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
    const eventsView = document.getElementById('/events-view');
    const slider = document.getElementById('events-slider');

    const getPositionX = (event) => {
        return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    };

    const touchStart = (event) => {
        if (isAnimating) return;
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        isDragging = true;
        startX = getPositionX(event);
        slider.classList.remove('transitioning');
        animationID = requestAnimationFrame(animation);
    };

    const touchMove = (event) => {
        if (!isDragging) return;
        const currentX = getPositionX(event);
        currentTranslate = currentX - startX;
    };

    const touchEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        cancelAnimationFrame(animationID);

        const movedBy = currentTranslate;
        if (movedBy < -100) {
            changeWeek(1);
        } else if (movedBy > 100) {
            changeWeek(-1);
        } else {
            slider.classList.add('transitioning');
            slider.style.transform = 'translateX(0%)';
            setTimeout(() => {
                slider.classList.remove('transitioning');
                currentTranslate = 0;
            }, 300);
        }
    };

    const animation = () => {
        setSliderPosition();
        if (isDragging) requestAnimationFrame(animation);
    };

    const setSliderPosition = () => {
        slider.style.transform = `translateX(${currentTranslate}px)`;
    };

    if (eventsView && slider) {
        slider.addEventListener('touchstart', touchStart, { passive: true });
        slider.addEventListener('touchmove', touchMove, { passive: true });
        slider.addEventListener('touchend', touchEnd);
        
        slider.addEventListener('mousedown', touchStart);
        window.addEventListener('mousemove', (e) => { if(isDragging) touchMove(e); });
        window.addEventListener('mouseup', () => { if(isDragging) touchEnd(); });
    }

    document.querySelector('.prev-week').addEventListener('click', () => changeWeek(-1));
    document.querySelector('.next-week').addEventListener('click', () => changeWeek(1));
    document.querySelector('.this-week-button').addEventListener('click', () => changeWeek(0));

    document.addEventListener('keydown', (e) => {
        const eventsView = document.getElementById('/events-view');
        if (!eventsView || eventsView.classList.contains('hidden')) return;
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        if (e.key === 'ArrowLeft') {
            changeWeek(-1);
        } else if (e.key === 'ArrowRight') {
            changeWeek(1);
        } else if (e.key === ' ') {
            e.preventDefault();
            changeWeek(0);
        }
    });

    LoginEvent.subscribe(() => changeWeek(0, false));

    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        if (resolvedPath === '/events') {
            const urlParams = new URLSearchParams(window.location.search);
            const weekParam = parseInt(urlParams.get('week'));
            relativeWeekOffset = isNaN(weekParam) ? 0 : weekParam;
            changeWeek(0, false);
        }
    });
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);