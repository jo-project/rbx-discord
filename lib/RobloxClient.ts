import { LoggedInUserData, setCookie } from '@rbxdiscord/roblox';

export default class RobloxClient {
    private cookie: string;
    public user: LoggedInUserData = undefined!;
    constructor(cookie : string) {
        this.cookie = cookie;
    }

    async start() {
        this.user = await setCookie(this.cookie)
        return this.user
    }
}