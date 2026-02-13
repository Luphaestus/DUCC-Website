export interface UserProfile {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    permissions: string[];
    is_member: boolean;
    is_instructor: boolean;
    filled_legal_info: boolean;
    legal_filled_at: string;
    phone_number: string;
    first_aid_expiry: string;
    free_sessions: number;
    balance: number;
    swims: number;
    booties: number;
    swimmer_rank: number;
    profile_picture_path: string;
    profile_picture_color: string;
    profile_picture_font: string;
    profile_picture_initials: string;
    totp_enabled: boolean;
    email_2fa_enabled: boolean;
    swimmer_stats?: {
        allTime: { swims: number; rank: string };
        yearly: { swims: number; rank: string };
    };
}

export interface KitVariant {
    id: number;
    name: string;
}

export interface KitItem {
    id: number;
    name: string;
    type: string;
    variants: KitVariant[];
}

export interface KitPref {
    kit_item_id: number;
    kit_variant_id: number | null;
    item_name: string;
    item_type: string;
    variant_name: string | null;
}

export interface Car {
    id: number;
    name: string;
    seats: number;
    boats: number;
    is_global: boolean;
}

export interface Transaction {
    id: number;
    amount: number;
    description: string;
    created_at: string;
    after: number;
    status: 'pending' | 'completed' | 'failed';
}
