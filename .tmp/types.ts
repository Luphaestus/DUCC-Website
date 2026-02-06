export type Theme = 'light' | 'dark';

export interface NavItem {
  label: string;
  href: string;
}

export interface Discipline {
  id: string;
  title: string;
  description: string;
  iconName: string; // Mapping to lucide-react icons manually
  image: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  type: 'social' | 'trip' | 'competition';
}
