import { createMemo } from "solid-js";

interface AvatarProps {
    user: any;
    classes?: string;
    onClick?: () => void;
}

export default function Avatar(props: AvatarProps) {
    const colors = [
        '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22',
        '#e74c3c', '#1abc9c', '#34495e', '#d35400', '#c0392b'
    ];

    const initials = createMemo(() => {
        const u = props.user;
        if (!u) return '?';
        const firstInitial = u.first_name ? u.first_name[0] : '';
        const lastInitial = u.last_name ? u.last_name[0] : '';
        if (u.profile_picture_initials === 'first') return firstInitial;
        if (u.profile_picture_initials === 'last') return lastInitial;
        return `${firstInitial}${lastInitial}` || '?';
    });

    const color = createMemo(() => {
        const u = props.user;
        if (!u) return colors[0];
        if (u.profile_picture_color) return u.profile_picture_color;
        const nameSum = ((u.first_name || '') + (u.last_name || '')).split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        return colors[nameSum % colors.length];
    });

    const fontClass = createMemo(() => {
        const u = props.user;
        if (!u) return '';
        if (u.profile_picture_font === 'serif') return 'font-serif';
        if (u.profile_picture_font === 'outfit') return 'font-display';
        if (u.profile_picture_font === 'gothic') return 'font-gothic';
        if (u.profile_picture_font === 'accent') return 'font-accent';
        if (u.profile_picture_font === 'mono') return 'font-mono';
        return '';
    });

    return (
        <div
            class={`avatar-bubble avatar-style ${props.classes || ''} ${fontClass()}`}
            style={{ "--avatar-color": color() }}
            onClick={() => props.onClick?.()}
        >
            {props.user?.profile_picture_path && typeof props.user.profile_picture_path === 'string' && (
                <img
                    src={`${props.user.profile_picture_path}${props.user.profile_picture_path.includes('?') ? '&' : '?'}t=${Date.now()}`}
                    alt={`${props.user.first_name} ${props.user.last_name}`}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                />
            )}
            <span class="avatar-initials">{initials()}</span>
        </div>
    );
}
