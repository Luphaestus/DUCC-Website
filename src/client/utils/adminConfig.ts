import {
    FaSolidUsers, FaSolidCalendarDay, FaSolidTicket,
    FaSolidIdCard, FaSolidGear, FaSolidFolder, FaSolidImage,
    FaSolidArrowTrendUp, FaSolidList, FaSolidQuoteLeft,
    FaSolidEnvelope, FaSolidFileLines, FaSolidGavel, FaSolidKey
} from 'solid-icons/fa';
import { MdFillKayaking } from "solid-icons/md";

export interface AdminModule {
    id: string;
    title: string;
    desc: string;
    icon: any;
    href: string;
    isVisible: (perms: string[], isPresident: boolean) => boolean;
}

export const ADMIN_MODULES: AdminModule[] = [
    {
        id: 'users',
        title: 'Members',
        desc: 'Manage members & permissions',
        icon: FaSolidUsers,
        href: '/admin/users',
        isVisible: (perms) => perms.includes('user.manage') || perms.includes('transaction.manage') || perms.includes('user.read')
    },
    {
        id: 'invitations',
        title: 'Invitations',
        desc: 'Invite non-Durham members',
        icon: FaSolidEnvelope,
        href: '/admin/invitations',
        isVisible: (perms) => perms.includes('user.manage')
    },
    {
        id: 'keys',
        title: 'Keys',
        desc: 'Track boatshed keys',
        icon: FaSolidKey,
        href: '/admin/keys',
        isVisible: (perms) => perms.includes('keys.manage') || perms.includes('site.admin')
    },
    {
        id: 'events',
        title: 'Events',
        desc: 'Schedule & attendance',
        icon: FaSolidCalendarDay,
        href: '/admin/events',
        isVisible: (perms) => perms.includes('event.manage.all') || perms.includes('event.manage.scoped')
    },
    {
        id: 'emails',
        title: 'Announcements',
        desc: 'Send announcements',
        icon: FaSolidEnvelope,
        href: '/admin/emails',
        isVisible: (perms) => perms.includes('email.send') || perms.includes('site.admin')
    },
    {
        id: 'tags',
        title: 'Categories',
        desc: 'Event categories & styles',
        icon: FaSolidList,
        href: '/admin/tags',
        isVisible: (perms) => perms.includes('event.manage.all') || perms.includes('event.manage.scoped') || perms.includes('tag.write')
    },
    {
        id: 'files',
        title: 'Documents',
        desc: 'Documents & resources',
        icon: FaSolidFolder,
        href: '/admin/files',
        isVisible: (perms) => perms.includes('file.write') || perms.includes('file.edit') || perms.includes('file.category.manage')
    },
    {
        id: 'quotes',
        title: 'Quotes',
        desc: 'Moderate club quotes',
        icon: FaSolidQuoteLeft,
        href: '/admin/quotes',
        isVisible: (perms) => perms.includes('quote.manage')
    },
    {
        id: 'roles',
        title: 'Access Roles',
        desc: 'User roles & access',
        icon: FaSolidIdCard,
        href: '/admin/roles',
        isVisible: (perms) => perms.includes('role.manage')
    },
    {
        id: 'stats',
        title: 'Analytics',
        desc: 'Club usage analytics',
        icon: FaSolidArrowTrendUp,
        href: '/admin/stats',
        isVisible: (perms) => perms.includes('transaction.manage') || perms.includes('event.manage.all') || perms.includes('site.admin')
    },
    {
        id: 'forms',
        title: 'Forms',
        desc: 'Custom forms & surveys',
        icon: FaSolidFileLines,
        href: '/admin/forms',
        isVisible: (perms) => perms.includes('form.manage') || perms.includes('site.admin')
    },
    {
        id: 'elections',
        title: 'Elections',
        desc: 'Club committee voting',
        icon: FaSolidGavel,
        href: '/admin/elections',
        isVisible: (perms) => perms.includes('election.manage') || perms.includes('site.admin')
    },
    {
        id: 'slides',
        title: 'Slideshow',
        desc: 'Homepage slideshow',
        icon: FaSolidImage,
        href: '/admin/slides',
        isVisible: (perms) => perms.includes('exec.publish') || perms.includes('site.admin') || perms.length > 0
    },
    {
        id: 'kit',
        title: 'Inventory',
        desc: 'Club equipment inventory',
        icon: MdFillKayaking,
        href: '/admin/kit',
        isVisible: (perms) => perms.includes('kit.manage')
    },
    {
        id: 'globals',
        title: 'Settings',
        desc: 'System configuration',
        icon: FaSolidGear,
        href: '/admin/globals',
        isVisible: (perms, isPresident) => isPresident || perms.includes('globals.manage') || perms.includes('site.admin')
    }
];
