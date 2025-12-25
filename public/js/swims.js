import { ajaxGet } from './misc/ajax.js';
import { ViewChangedEvent } from './misc/view.js';

/**
 * Swims View Module.
 * Displays a ranked list of users based on their swim count.
 */

const HTML_TEMPLATE = `
<div id="/swims-view" class="view hidden">
    <div class="small-container">
        <h1>Swims</h1>
        <article class="form-box">
            <div id="leaderboard-container">
                <table role="grid">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>Swims</th>
                        </tr>
                    </thead>
                    <tbody id="leaderboard-body">
                        <tr><td colspan="3" style="text-align:center;" aria-busy="true">Loading leaderboard...</td></tr>
                    </tbody>
                </table>
            </div>
        </article>
    </div>
</div>`;

async function populateLeaderboard() {
    const body = document.getElementById('leaderboard-body');
    if (!body) return;

    try {
        const leaderboard = (await ajaxGet('/api/user/swims/leaderboard')).data;

        if (!leaderboard || leaderboard.length === 0) {
            body.innerHTML = '<tr><td colspan="3" style="text-align:center;">No swimmers yet!</td></tr>';
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
        console.error("Error fetching swim leaderboard", error);
        body.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--error);">Failed to load leaderboard.</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        if (resolvedPath === '/swims') {
            populateLeaderboard();
        }
    });
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
