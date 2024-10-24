
export enum Role {
    ADMIN = 'admin',
    USER = 'user',
    PAID_USER = 'paid_user'
}

export type SessionToken = {
    id: string;
    role: Role;
    IP: string;
}