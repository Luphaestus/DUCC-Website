/**
 * Animated background with floating blobs and drifting kayak icons.
 */

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;

    const colors = [
        'rgba(170, 64, 191, 0.1)',
        'rgba(91, 125, 196, 0.1)',
        'rgba(57, 134, 188, 0.1)',
        'rgba(43, 195, 195, 0.1)',
        'rgba(38, 222, 129, 0.1)'
    ];

    const kayakSvg = `
        <svg viewBox="0 0 153.41 103.85" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(-247.58 -156.15)">
                <path d="m393.36 156.65-19.25 13.438c-3.561 2.483-6.2816 9.5887-7.7812 12.094l-13.125 7.875s-1.4989-0.86191-2.7188-0.6875c-2.1092 0.30157-4.666 1.3796-5.5625 3.3125-0.3685 0.79452 0 2.625 0 2.625l-8.25 5.25-0.375-3s1.3342-10.369-2.0625-13.312c-3.382-2.9307-9.4762-3.5845-11.812 3.1875-1.1943 3.4619 0.78179 10.201 3 10.875l2.625 3.7812-6 4.5-8.2812 7.875-7.875 5.25s-1.5166-0.66661-3.0625-0.40625c-1.7705 0.29818-3.2385 0.7368-4 2.3438-0.53579 1.1306 0.125 2.4062 0.125 2.4062l-16.625 10.594c-4.5642 0.0147-9.4311 1.3101-14.344 2.7188-6.8261 4.3647-13.433 9.1792-19.906 14.25l6.7812 7.875 20.969-12.781c9.5301 4.627 20.224 5.1282 30.438 5.6562 20.214 1.5302 43.913-2.4517 66.438-11.625 5.9125-2.408 8.039-10.255 3.75-19.531 0 0-4.8125 4.1561-7.75 5.1562-6.0835 2.0714-19.219 1.3438-19.219 1.3438l-0.34375-12.312s3.9604-3.8081 6.5312-5.125c2.0861-1.0686 5.0048-1.0908 6.1562-3 0.41206-0.68325 0.23374-1.6434 0-2.4062-1.3622-4.446-7.5625-10.469-7.5625-10.469l0.0625-1.9688 14.25-9.125s7.6076-0.50177 11.344-2.125c7.5511-3.2808 20.562-14.781 20.562-14.781zm-48.062 41 3.7188 1.1875 2.375-0.125 2.2812 2.6562 0.65625 3.3125-4.25-0.28125-3.8438-1.9688-5.5938 0.375-0.125-1.4375zm-23.625 19.625-0.125 13.156s-14.512-0.34089-21.094 2.25c-3.0871 1.2152-7.9688 5.9688-7.9688 5.9688-3.6453 0.61063-8.2664 1.812-8.75-0.4375 2.5469-3.4967 14.518-10.29 17.469-12.562l3.625-0.8125c3.1002 0.49708 2.2626 0.25144 5.3125 0 3.3931-0.64784 7.8201-4.3704 11.531-7.5625z" fill="currentColor"/>
            </g>
        </svg>`;

    const container = document.createElement('div');
    container.id = 'animated-background';
    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.zIndex = '-10';
    container.style.pointerEvents = 'none';
    container.style.overflow = 'hidden';
    body.appendChild(container);

    const styleSheet = document.createElement('style');
    document.head.appendChild(styleSheet);

    styleSheet.textContent = `
        @keyframes floatAround {
            0% { transform: translate(0, 0); }
            33% { transform: translate(40vw, -40vh); }
            66% { transform: translate(-40vw, 40vh); }
            100% { transform: translate(0, 0); }
        }
        @keyframes driftAcross {
            from { transform: translateX(-200px) rotate(0deg); }
            to { transform: translateX(calc(100vw + 200px)) rotate(15deg); }
        }
    `;

    // Generate floating blobs
    colors.forEach((color, i) => {
        const blob = document.createElement('div');
        blob.className = 'bg-blob';
        const size = 40 + (i * 10);
        blob.style.width = `${size}vmax`;
        blob.style.height = `${size}vmax`;
        blob.style.backgroundColor = color;
        blob.style.filter = 'blur(30px)';

        const positions = [
            { top: '-20%', left: '-20%' },
            { top: '-20%', left: '60%' },
            { top: '60%', left: '-20%' },
            { top: '40%', left: '40%' },
            { top: '70%', left: '70%' }
        ];

        blob.style.top = positions[i].top;
        blob.style.left = positions[i].left;
        blob.style.animation = `floatAround ${40 + i * 10}s infinite ease-in-out`;
        blob.style.animationDelay = `${i * -20}s`;
        container.appendChild(blob);
    });

    // Generate drifting kayak icons
    for (let i = 0; i < 10; i++) {
        const icon = document.createElement('div');
        icon.className = 'bg-icon';
        icon.innerHTML = kayakSvg;
        const size = 60 + Math.random() * 100;
        icon.style.width = `${size}px`;
        icon.style.top = `${Math.random() * 100}vh`;
        icon.style.left = "0";

        const duration = 40 + Math.random() * 60;
        icon.style.animation = `driftAcross ${duration}s linear infinite`;
        icon.style.animationDelay = `${Math.random() * -duration}s`;
        container.appendChild(icon);
    }
});