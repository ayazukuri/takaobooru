import { XGuildDoc } from "./interfaces";

export class XGuild {
    id: string;
    logChannel: string;
    actionChannel: string;
    welcomeChannel: string;
    welcomeCount: number;

    constructor({ _id, logChannel, actionChannel, welcomeChannel }: XGuildDoc) {
        this.id = _id;
        this.logChannel = logChannel;
        this.actionChannel = actionChannel;
        this.welcomeChannel = welcomeChannel;
        this.welcomeCount = 0;
    }

    welcome() {
        return this.welcomeCount += 1;
    }

    toDoc(): XGuildDoc {
        return {
            _id: this.id,
            logChannel: this.logChannel,
            actionChannel: this.actionChannel,
            welcomeChannel: this.welcomeChannel
        };
    }
}
