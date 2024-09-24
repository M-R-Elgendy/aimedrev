import { Global, Injectable, Module, Scope } from '@nestjs/common';
import { Role, SessionToken } from './types';

@Injectable({
    scope: Scope.REQUEST,
})
export class AuthContext {
    private id: string;
    // private username: string;
    // private phone: string;
    // private firebaseId: string;
    // private role: Role;

    constructor() { }

    getUser(): SessionToken | null {
        if (!this.id) return null;
        return {
            id: this.id,
            // sub: this.sub,
            // phone: this.phone,
            // firebaseId: this.firebaseId,
        };
    }

    setUser(user: SessionToken) {
        this.id = user.id;
        // this.role = user.role;
        // this.firebaseId = user.firebaseId;
        // this.phone = user.phone;
    }
}

@Global()
@Module({
    providers: [AuthContext],
    exports: [AuthContext],
})
export class AuthContextModule { }