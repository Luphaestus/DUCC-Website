export {};

declare global {
    interface Window {
        currentUser: {
            id: number | string;
            permissions: string[];
            is_member: boolean;
        } | null;
    }
}
