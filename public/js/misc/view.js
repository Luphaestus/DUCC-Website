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

function switchView(viewID) {
    if (!isView(viewID)) {
        console.warn('Attempted to switch to unknown view:', viewID)
        return false
    }

    if (isCurrentView(viewID)) {
        console.log('View is already current:', viewID)
        return true
    }

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
    document.title = `DUCC - ${viewID.replace("-view", "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`


    return true
}


document.addEventListener('DOMContentLoaded', () => {
    Views = Array.from(document.querySelectorAll('.view')).map(v => v.id)
});

export { getViews, isView, isCurrentView, switchView }
