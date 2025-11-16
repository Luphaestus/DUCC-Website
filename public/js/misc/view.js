let Views = []
let CurrentView = ""

function getViews() {
    return Views.slice()
}

function isView(viewID) {
    return Views.includes(viewID)
}

function isCurrentView(viewID) {
    return CurrentView === viewID
}

function switchView(viewName, event = null) {
    const viewID = viewName + "-view"

    if (!isView(viewID)) {
        console.warn('Attempted to switch to unknown view:', viewID)
        switchView('home')
        return false
    }

    if (isCurrentView(viewID)) {
        // console.log('View is already current:', viewID)
        return true
    }

    if (event) { event.preventDefault() }
    window.history.pushState({}, viewID, window.location.origin + '/' + viewName)


    for (const v of Views) {
        const el = document.getElementById(v)
        if (!el) continue

        if (v === viewID) {
            el.classList.remove('hidden')
        } else {
            el.classList.add('hidden')
        }
    }

    CurrentView = viewID
    document.title = `DUCC - ${viewName.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`


    return true
}


document.addEventListener('DOMContentLoaded', () => {
    Views = Array.from(document.querySelectorAll('.view')).map(v => v.id)
});

function updateContent() {
    switchView(String(window.location.pathname).substring(1));
}

window.onpopstate = updateContent;

window.onload = updateContent;




export { getViews, isView, isCurrentView, switchView }

