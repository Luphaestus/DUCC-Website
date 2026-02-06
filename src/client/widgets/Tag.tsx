export function getContrastColour(hexColour: string): string {
    if (!hexColour || !hexColour.startsWith('#')) return 'white';
    
    let hex = hexColour.replace('#', '');
    
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    
    if (hex.length > 6) {
        hex = hex.substring(0, 6);
    }

    if (hex.length !== 6) return 'white';

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 2), 16);
    const b = parseInt(hex.substring(4, 2), 16);
    
    if (isNaN(r) || isNaN(g) || isNaN(b)) return 'white';

    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
}

interface TagProps {
    name: string;
    color?: string;
    class?: string;
    style?: any;
    dimmed?: boolean;
}

interface TagComponent {
    (props: TagProps): any;
    render: (tag: { name: string; color?: string }, extraClasses?: string, extraStyles?: string) => string;
    renderList: (tags: { name: string; color?: string }[], extraClasses?: string) => string;
}

export const Tag: TagComponent = (props: TagProps) => {
    const colour = () => props.color || 'var(--pico-primary)';
    const textColour = () => getContrastColour(props.color || '');
    
    return (
        <span 
            class={`tag-badge tag-badge-style ${props.class || ''}`} 
            classList={{ 'tag-dimmed': props.dimmed }}
            style={{
                "--tag-colour": colour(),
                "--tag-text-colour": textColour(),
                "--original-color": colour(),
                ...props.style
            }}
        >
            {props.name}
        </span>
    );
};

Tag.render = (tag: { name: string; color?: string }, extraClasses = '', extraStyles = '') => {
    const colour = tag.color || 'var(--pico-primary)';
    const textColour = getContrastColour(tag.color || '');
    return `<span class="tag-badge ${extraClasses}" style="--tag-colour: ${colour}; --tag-text-colour: ${textColour}; ${extraStyles}">${tag.name}</span>`;
};

Tag.renderList = (tags: { name: string; color?: string }[], extraClasses = '') => {
    if (!tags || tags.length === 0) return '';
    return tags.map(tag => Tag.render(tag, extraClasses)).join('');
};
