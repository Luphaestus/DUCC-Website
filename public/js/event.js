import { ViewChangedEvent } from "./misc/view.js";
import { ajaxGet, ajaxPost } from "./misc/ajax.js";

async function NavigationEventListner({ resolvedPath, path }) {
    if (resolvedPath !== "/event/*") return;

    const navContainer = document.getElementById('event-detail');
    if (!navContainer) return;

    try {
        const { event } = await ajaxGet("/api" + path);

        navContainer.innerHTML = `
            <h1>${event.title}</h1>
            <p><strong>Date:</strong> ${new Date(event.start).toLocaleString()} - ${new Date(event.end).toLocaleString()}</p>
            <p><strong>Description:</strong> ${event.description || 'No description provided.'}</p>
            <p><strong>Difficulty Level:</strong> ${event.difficulty_level}</p>
            <button id="attend-event-button">${event.isAttending ? 'Leave Event' : 'Attend Event'}</button>
            `;

        const attendeesResponse = await ajaxGet(`/api${path}/attendees`).catch((e) => { return null; });

        if (attendeesResponse && attendeesResponse.attendees && attendeesResponse.attendees.length > 0) {
            const attendees = attendeesResponse.attendees;
            const attendeesList = document.createElement('div');
            attendeesList.innerHTML = '<h2>Attendees:</h2>';
            const ul = document.createElement('ul');
            for (const user of attendees) {
                const li = document.createElement('li');
                li.textContent = `${user.first_name} ${user.last_name}`;
                ul.appendChild(li);
            }
            attendeesList.appendChild(ul);
            navContainer.appendChild(attendeesList);
        }

        const attendButton = document.getElementById('attend-event-button');
        const loggedIn = await ajaxGet('/api/user/loggedin').then((data) => data.loggedIn).catch(() => false);

        if (attendButton) {
            if (!loggedIn) {
                attendButton.classList.add('hidden');
            } else {
                const isAttending = await ajaxGet(`/api${path}/isAttending`).then((data) => data.isAttending).catch(() => false);
                attendButton.textContent = isAttending ? 'Leave Event' : 'Attend Event';

                attendButton.classList.remove('hidden');
                attendButton.addEventListener('click', async () => {
                    await ajaxPost(`/api/event/${event.id}/${isAttending ? 'leave' : 'attend'}`, {});
                    NavigationEventListner({ resolvedPath, path });
                    attendButton.textContent = isAttending ? 'Leave Event' : 'Attend Event';
                });
            }
        }
    } catch (error) {
        console.error("Failed to load event details:", error);
        navContainer.innerHTML = `<p class="error-message">Could not load event details. You may not have permission to view this event.</p>`;
    }
}

ViewChangedEvent.subscribe(NavigationEventListner);