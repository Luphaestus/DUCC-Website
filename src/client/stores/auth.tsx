import { createSignal, createResource } from "solid-js";
import { apiRequest } from "@/utils/api";

export interface UserPermissions {
    [key: string]: boolean;
}

export interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    is_member: boolean;
    swims: number;
    booties: number;
    balance: number;
    permissions: string[];
}

const [user, { mutate: setUser, refetch: refetchUser }] = createResource<User | null>(async () => {
    try {
        const status = await apiRequest('GET', '/api/auth/status', null, true);
        if (status.authenticated) {
            return await apiRequest('GET', '/api/user/elements/permissions,is_member,id,swims,booties,balance,first_name,last_name,email', null, true);
        }
    } catch (e) {
        return null;
    }
    return null;
});

export function useAuth() {
    const logout = async () => {
        try {
            await apiRequest('GET', '/api/auth/logout');
            setUser(null);
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    const isAdmin = () => (user()?.permissions?.length || 0) > 0;
    const isMember = () => user()?.is_member || false;
    const isAuthenticated = () => !!user();

    return { 
        user, 
        setUser, 
        refetchUser, 
        logout, 
        isAdmin, 
        isMember, 
        isAuthenticated 
    };
}
