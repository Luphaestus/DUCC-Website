
/**
 * No Internet / Connection Lost view.
 * @module NoInternet
 */

const HTML_TEMPLATE = `
        <div id="no-connection-view" class="view hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2000; background: rgba(0,0,0,0.85); backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; flex-direction: column;">
            <div class="container" style="text-align: center; color: white;">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem;">
                    <path d="M11 13a6 6 0 0 1 -6 -6" />
                    <path d="M19 13a6 6 0 0 1 -6 -6" />
                    <path d="M12 20a10 10 0 0 1 -10 -10" />
                    <path d="M4.929 4.929l14.142 14.142" />
                </svg>
                <h1>No Internet Connection</h1>
                <p>Please check your network settings.</p>
                <p>We'll try to reconnect automatically...</p>
            </div>
        </div>`;

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
