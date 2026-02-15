import {
    GROUP_SVG, CALENDAR_TODAY_SVG, LOCAL_ACTIVITY_SVG,
    ID_CARD_SVG, SETTINGS_SVG, FOLDER_SVG, IMAGE_SVG,
    KAYAKING_SVG, TRENDING_UP_SVG, LIST_SVG, FORMAT_QUOTE_SVG,
    MAIL_SVG, DESCRIPTION_SVG, GAVEL_SVG, KEY_SVG
} from './icons';

export interface AdminModule {
    id: string;
    title: string;
    desc: string;
    icon: string;
    href: string;
    isVisible: (perms: string[], isPresident: boolean) => boolean;
}

export const ADMIN_MODULES: AdminModule[] = [
    {
        id: 'users',
        title: 'Members',
        desc: 'Manage members & permissions',
        icon: GROUP_SVG,
        href: '/admin/users',
        isVisible: (perms) => perms.includes('user.manage') || perms.includes('transaction.manage') || perms.includes('user.read')
    },
    {
        id: 'invitations',
        title: 'Invitations',
        desc: 'Invite non-Durham members',
        icon: MAIL_SVG,
        href: '/admin/invitations',
        isVisible: (perms) => perms.includes('user.manage')
    },
    {
        id: 'keys',
        title: 'Keys',
        desc: 'Track boatshed keys',
        icon: KEY_SVG,
        href: '/admin/keys',
        isVisible: (perms) => perms.includes('keys.manage') || perms.includes('site.admin')
    },
    {
        id: 'events',
        title: 'Events',
        desc: 'Schedule & attendance',
        icon: CALENDAR_TODAY_SVG,
        href: '/admin/events',
        isVisible: (perms) => perms.includes('event.manage.all') || perms.includes('event.manage.scoped')
    },
    {
        id: 'emails',
        title: 'Announcements',
        desc: 'Send announcements',
        icon: MAIL_SVG,
        href: '/admin/emails',
        isVisible: (perms) => perms.includes('email.send') || perms.includes('site.admin')
    },
    {
        id: 'tags',
        title: 'Categories',
        desc: 'Event categories & styles',
        icon: LIST_SVG,
        href: '/admin/tags',
        isVisible: (perms) => perms.includes('event.manage.all') || perms.includes('event.manage.scoped') || perms.includes('tag.write')
    },
    {
        id: 'files',
        title: 'Documents',
        desc: 'Documents & resources',
        icon: FOLDER_SVG,
        href: '/admin/files',
        isVisible: (perms) => perms.includes('file.write') || perms.includes('file.edit') || perms.includes('file.category.manage')
    },
    {
        id: 'quotes',
        title: 'Quotes',
        desc: 'Moderate club quotes',
        icon: FORMAT_QUOTE_SVG,
        href: '/admin/quotes',
        isVisible: (perms) => perms.includes('quote.manage')
    },
    {
        id: 'roles',
        title: 'Access Roles',
        desc: 'User roles & access',
        icon: ID_CARD_SVG,
        href: '/admin/roles',
        isVisible: (perms) => perms.includes('role.manage')
    },
    {
        id: 'stats',
        title: 'Analytics',
        desc: 'Club usage analytics',
        icon: TRENDING_UP_SVG,
        href: '/admin/stats',
        isVisible: (perms) => perms.includes('transaction.manage') || perms.includes('event.manage.all') || perms.includes('site.admin')
    },
    {
        id: 'forms',
        title: 'Forms',
        desc: 'Custom forms & surveys',
        icon: DESCRIPTION_SVG,
        href: '/admin/forms',
        isVisible: (perms) => perms.includes('form.manage') || perms.includes('site.admin')
    },
    {
        id: 'elections',
        title: 'Elections',
        desc: 'Club committee voting',
        icon: GAVEL_SVG,
        href: '/admin/elections',
        isVisible: (perms) => perms.includes('election.manage') || perms.includes('site.admin')
    },
    {
        id: 'slides',
        title: 'Slideshow',
        desc: 'Homepage slideshow',
        icon: IMAGE_SVG,
        href: '/admin/slides',
        isVisible: (perms) => perms.includes('exec.publish') || perms.includes('site.admin') || perms.length > 0
    },
    {
        id: 'kit',
        title: 'Inventory',
        desc: 'Club equipment inventory',
        icon: KAYAKING_SVG,
        href: '/admin/kit',
        isVisible: (perms) => perms.includes('kit.manage')
    },
    {
        id: 'globals',
        title: 'Settings',
        desc: 'System configuration',
        icon: SETTINGS_SVG,
        href: '/admin/globals',
        isVisible: (perms, isPresident) => isPresident || perms.includes('globals.manage') || perms.includes('site.admin')
    }
];
