import { ajaxGet } from '/js/utils/ajax.js';
import { ViewChangedEvent, addRoute } from '/js/utils/view.js';

/**
 * Ranked list of users by swim count.
 * @module Swims
 */

addRoute('/swims', 'swims');

const HTML_TEMPLATE = /*html*/`
<div id="swims-view" class="view hidden">
    <div class="small-container">
        <h1>Swims</h1>
        <article class="form-box">
            <div class="swims-tab-group admin-nav-group">
                <button id="swims-yearly-tab" disabled>Current Year</button>
                <button id="swims-alltime-tab">All-time</button>
            </div>
            <div id="leaderboard-container" class="table-responsive">
                <table role="grid">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>Swims</th>
                        </tr>
                    </thead>
                    <tbody id="leaderboard-body">
                        <tr><td colspan="3" class="leaderboard-status" aria-busy="true">Loading leaderboard...</td></tr>
                    </tbody>
                </table>
            </div>
        </article>
    </div>
</div>`;

/**
 * Fetch and render the leaderboard.
 * @param {boolean} yearly
 */
async function populateLeaderboard(yearly = true) {
    const body = document.getElementById('leaderboard-body');
    if (!body) return;

    body.innerHTML = '<tr><td colspan="3" class="leaderboard-status" aria-busy="true">Loading leaderboard...</td></tr>';

    try {
        const leaderboard = (await ajaxGet(`/api/user/swims/leaderboard?yearly=${yearly}`)).data;

        if (!leaderboard || leaderboard.length === 0) {
            body.innerHTML = '<tr><td colspan="3" class="leaderboard-status">No swimmers yet!</td></tr>';
            return;
        }

        body.innerHTML = leaderboard.map(user => `
            <tr>
                <td><strong>${user.rank}</strong></td>
                <td>${user.first_name} ${user.last_name}</td>
                <td>${user.swims}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        body.innerHTML = '<tr><td colspan="3" class="leaderboard-error">Failed to load leaderboard.</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        if (resolvedPath === '/swims') populateLeaderboard(true);
    });

    document.body.addEventListener('click', (e) => {
        const yearlyBtn = document.getElementById('swims-yearly-tab');
        const alltimeBtn = document.getElementById('swims-alltime-tab');

        if (e.target.id === 'swims-yearly-tab') {
            alltimeBtn.disabled = false;
            e.target.disabled = true;
            populateLeaderboard(true);
        } else if (e.target.id === 'swims-alltime-tab') {
            yearlyBtn.disabled = false;
            e.target.disabled = true;
            populateLeaderboard(false);
        }
    });
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);