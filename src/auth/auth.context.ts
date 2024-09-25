import { Global, Injectable, Module, Scope } from '@nestjs/common';
import { Role, SessionToken } from '../global/types';

@Injectable({
    scope: Scope.REQUEST,
})
export class AuthContext {
    private id: string;
    private role: Role;
    private IP: string;

    constructor() { }

    getUser(): SessionToken | null {
        if (!this.id) return null;
        return {
            id: this.id,
            role: this.role,
            IP: this.IP
        };
    }

    setUser(user: SessionToken) {
        this.id = user.id;
        this.role = user.role;
        this.IP = user.IP;
    }
}

@Global()
@Module({
    providers: [AuthContext],
    exports: [AuthContext],
})
export class AuthContextModule { }