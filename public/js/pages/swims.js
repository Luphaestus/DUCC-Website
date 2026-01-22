/**
 * swims.js
 * 
 * Logic for the Swimming Leaderboard view.
 * Features a dynamic podium for the top 3 swimmers and a ranked list for the rest.
 * Supports toggling between "This Year" and "All Time" statistics.
 * 
 * Registered Route: /swims
 */

import { ajaxGet } from '/js/utils/ajax.js';
import { ViewChangedEvent, addRoute } from '/js/utils/view.js';
import { SOCIAL_LEADERBOARD_SVG, TROPHY_SVG, CROWN_SVG } from '../../images/icons/outline/icons.js';

// Register route
addRoute('/swims', 'swims');

/** HTML Template for the leaderboard page */
const HTML_TEMPLATE = /*html*/`
<div id="swims-view" class="view hidden">
    <div class="small-container">
        <h1>Leaderboard</h1>
        
        <!-- Stats Mode Toggle -->
        <div class="swims-toggle-container">
            <div class="toggle-wrapper" id="swims-toggle-wrapper">
                <div class="toggle-bg"></div>
                <button id="swims-yearly-btn" class="active">This Year</button>
                <button id="swims-alltime-btn">All Time</button>
            </div>
        </div>

        <div id="leaderboard-content">
            <p class="leaderboard-status" aria-busy="true">Loading leaderboard...</p>
        </div>
    </div>
</div>`;

/** @type {string} Current filter mode: 'yearly' or 'alltime' */
let currentMode = 'yearly'; 

/**
 * Fetches swim data from the API and renders the podium and table.
 */
async function populateLeaderboard() {
    const content = document.getElementById('leaderboard-content');
    if (!content) return;

    content.innerHTML = '<p class="leaderboard-status" aria-busy="true">Loading...</p>';

    try {
        const isYearly = currentMode === 'yearly';
        const leaderboardData = (await ajaxGet(`/api/user/swims/leaderboard?yearly=${isYearly}`)).data;

        if (!leaderboardData || leaderboardData.length === 0) {
            content.innerHTML = '<p class="leaderboard-status">No swims recorded yet!</p>';
            return;
        }

        const top3 = leaderboardData.slice(0, 3);
        const rest = leaderboardData.slice(3);

        // --- Render Podium (1st, 2nd, 3rd) ---
        let podiumHtml = '<div class="podium-container">';
        
        // Visual order: [Silver, Gold, Bronze]
        const podiumOrder = [1, 0, 2]; 
        const styles = ['gold', 'silver', 'bronze']; 

        podiumOrder.forEach(idx => {
            if (top3[idx]) {
                const user = top3[idx];
                const style = styles[idx];
                const rank = idx + 1;
                const icon = rank === 1 ? TROPHY_SVG : SOCIAL_LEADERBOARD_SVG;
                const isMe = user.is_me;

                podiumHtml += `
                    <div class="podium-place ${style}">
                        ${rank === 1 ? `<div class="crown-icon">${CROWN_SVG}</div>` : ''}
                        <div class="swimmer-name">${user.first_name} ${isMe ? '(You)' : ''}</div>
                        <div class="swim-count">${user.swims} Swims</div>
                        <div class="podium-step">
                            <div class="rank-circle">${rank}</div>
                            <div class="medal-icon">${icon}</div>
                        </div>
                    </div>`;
            }
        });
        podiumHtml += '</div>';

        // --- Render List (4th and below) ---
        let listHtml = '<div class="leaderboard-list glass-panel">';
        rest.forEach(user => {
            const isMe = user.is_me;
            listHtml += `
                <div class="leaderboard-row ${isMe ? 'highlight' : ''}">
                    <div class="rank-box">${user.rank}</div>
                    <div class="swimmer-info">
                        ${user.first_name} ${user.last_name}
                        ${isMe ? '<span class="you-tag">YOU</span>' : ''}
                    </div>
                    <div class="swims-count">${user.swims} <span>swims</span></div>
                </div>`;
        });
        listHtml += '</div>';

        content.innerHTML = podiumHtml + listHtml;

    } catch (error) {
        console.error(error);
        content.innerHTML = '<p class="leaderboard-error">Failed to load leaderboard.</p>';
    }
}

/**
 * Updates the toggle switch UI state and refreshes data.
 */
function updateToggleState() {
    const wrapper = document.getElementById('swims-toggle-wrapper');
    const yearlyBtn = document.getElementById('swims-yearly-btn');
    const alltimeBtn = document.getElementById('swims-alltime-btn');

    if (currentMode === 'yearly') {
        wrapper.removeAttribute('data-state'); 
        yearlyBtn.classList.add('active');
        alltimeBtn.classList.remove('active');
    } else {
        wrapper.setAttribute('data-state', 'alltime');
        yearlyBtn.classList.remove('active');
        alltimeBtn.classList.add('active');
    }
    populateLeaderboard();
}

document.addEventListener('DOMContentLoaded', () => {
    // Refresh data when navigating to this view
    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        if (resolvedPath === '/swims') populateLeaderboard();
    });

    const yearlyBtn = document.getElementById('swims-yearly-btn');
    const alltimeBtn = document.getElementById('swims-alltime-btn');

    if (yearlyBtn && alltimeBtn) {
        yearlyBtn.addEventListener('click', () => {
            if (currentMode !== 'yearly') {
                currentMode = 'yearly';
                updateToggleState();
            }
        });

        alltimeBtn.addEventListener('click', () => {
            if (currentMode !== 'alltime') {
                currentMode = 'alltime';
                updateToggleState();
            }
        });
    }
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);