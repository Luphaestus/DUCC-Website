/**
 * StandardCard.js
 * 
 * Widget for rendering a standardized event card.
 */

import {
    CHECK_SVG, LOCATION_ON_SVG, SCHEDULE_SVG, GROUP_SVG, CURRENCY_POUND_SVG
} from '../../images/icons/outline/icons.js';
import { Tag } from './Tag.js';

export class StandardCard {
    /**
     * Generates the HTML for a single event card.
     * @param {object} event 
     * @returns {string} HTML string
     */
    static render(event) {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        const isPast = endDate < new Date();
        const isCanceled = event.is_canceled;

        const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
        const startTime = startDate.toLocaleTimeString('en-UK', timeOptions);
        const endTime = endDate.toLocaleTimeString('en-UK', timeOptions);

        const tagsHtml = Tag.renderList(event.tags || []);

        const imageUrl = event.image_url || '/images/misc/ducc.png';
        const imageHtml = /*html*/`
            <div class="event-image-container">
                <div class="event-image" style="--event-image-url: url('${imageUrl}');"></div>
                <div class="image-overlay"></div>
                <div class="event-image-content">
                    <div class="event-tags">${tagsHtml}</div>
                    <h3 class="event-title-bold ${isCanceled ? 'strikethrough' : ''}">
                        ${event.title || 'Untitled Event'}
                    </h3>
                </div>
            </div>`;

        const count = event.attendee_count !== undefined ? event.attendee_count : '0';
        const max = event.max_attendees;
        const attendanceDisplay = max > 0 ? `${count}/${max}` : `${count}/∞`;
        const attendanceTitle = max > 0 ? `${count}/${max} Attending` : `${count} / Unlimited Attending`;

        const attendanceHtml = /*html*/`
            <div class="attendance-count" title="${attendanceTitle}">
                ${GROUP_SVG} <span>${attendanceDisplay}</span>
            </div>`;

        const costHtml = event.upfront_cost > 0 ? /*html*/`
            <div class="info-item cost" title="Upfront Cost">
                ${CURRENCY_POUND_SVG}
                <span>£${event.upfront_cost.toFixed(2)}</span>
            </div>` : '';

        let statusLabel = '';
        if (isCanceled) statusLabel = '<span class="status-badge error">Canceled</span>';
        else if (isPast) statusLabel = '<span class="status-badge neutral">Unavailable</span>';
        else if (event.can_attend === false && !event.is_attending) statusLabel = '<span class="status-badge neutral">Unavailable</span>';

        const cardClasses = ['event-card', 'glass-panel'];
        if (isPast) cardClasses.push('past-event');
        if (isCanceled) cardClasses.push('canceled-event');
        if (event.can_attend === false && !event.is_attending) cardClasses.push('unavailable-event');

        return /*html*/`
            <div class="${cardClasses.join(' ')}" data-nav="${`event/${event.id}`}" role="button" tabindex="0">
                ${imageHtml}
                <div class="event-card-content">
                    <div class="event-info-block">
                        <div class="info-item time">
                            ${SCHEDULE_SVG}
                            <span>${startTime} - ${endTime}</span>
                        </div>
                        <div class="info-item location">
                            ${LOCATION_ON_SVG}
                            <span>${event.location || 'Location TBD'}</span>
                        </div>
                        ${costHtml}
                    </div>

                    <div class="card-footer">
                        <div class="footer-left">
                            ${attendanceHtml}
                            ${event.is_attending ? `<div class="attendance-status">${CHECK_SVG} Attending</div>` : ''}
                        </div>
                        <div class="footer-right">
                            ${statusLabel}
                        </div>
                    </div>
                </div>
            </div>`;
    }
}
