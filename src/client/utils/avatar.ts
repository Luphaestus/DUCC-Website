/**
 * avatar.js
 * 
 * Helper for rendering user avatars with initials fallback and customization.
 */

/**
 * Generates HTML for a user avatar bubble.
 * 
 * @param {object} user - User data containing first_name, last_name, and profile customization fields.
 * @param {object} options - Options for rendering.
 * @param {string} [options.classes=''] - Additional CSS classes.
 * @param {string} [options.dataAttributes=''] - Additional data attributes.
 * @returns {string} - HTML string for the avatar.
 */
export function renderAvatar(user: Record<string, any>, options: { classes?: string; dataAttributes?: string } = {}) {
    const { classes = '', dataAttributes = '' } = options;
    
    if (!user) {
        return `<div class="avatar-bubble ${classes}" ${dataAttributes}>?</div>`;
    }

    const firstInitial = user.first_name ? user.first_name[0] : '';
    const lastInitial = user.last_name ? user.last_name[0] : '';
    let initials = `${firstInitial}${lastInitial}`;
    
    if (user.profile_picture_initials === 'first') initials = firstInitial;
    else if (user.profile_picture_initials === 'last') initials = lastInitial;

    const colors = [
        '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', 
        '#e74c3c', '#1abc9c', '#34495e', '#d35400', '#c0392b'
    ];
    
    let color = user.profile_picture_color;
    if (!color) {
        const nameSum = ((user.first_name || '') + (user.last_name || '')).split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        color = colors[nameSum % colors.length];
    }

    let fontClass = '';
    if (user.profile_picture_font === 'serif') fontClass = 'font-serif';
    else if (user.profile_picture_font === 'outfit') fontClass = 'font-display';
    else if (user.profile_picture_font === 'gothic') fontClass = 'font-gothic';
    else if (user.profile_picture_font === 'accent') fontClass = 'font-accent';
    else if (user.profile_picture_font === 'mono') fontClass = 'font-mono';

    const imgHtml = user.profile_picture_path 
        ? `<img src="${user.profile_picture_path}" alt="${user.first_name} ${user.last_name}" onerror="this.style.display='none'">` 
        : '';

    return `<div class="avatar-bubble ${classes} ${fontClass}" 
                 style="background-color: ${color};" 
                 ${dataAttributes}>
        ${imgHtml}
        <span class="avatar-initials">${initials || '?'}</span>
    </div>`;
}