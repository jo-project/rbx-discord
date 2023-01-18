/** @module ChatInputCommandInteraction */
import Attachment from "./Attachment";
import Member from "./Member";
import Message from "./Message";
import Role from "./Role";
import User from "./User";
import InteractionResolvedChannel from "./InteractionResolvedChannel";

import CommandInteraction from "./CommandInteraction";
import type { RawApplicationCommandInteraction, ApplicationCommandInteractionResolvedData  } from "../types/interactions";
import type Client from "../Client";
import TypedCollection from "../util/TypedCollection";
import InteractionOptionsWrapper from "../util/InteractionOptionsWrapper";
import type { JSONChatInputCommandInteraction } from "../types/json";

export default class ChatInputCommandInteraction extends CommandInteraction {
    public options;
    constructor(data: RawApplicationCommandInteraction, client: Client) {
        super(data, client);
        const resolved: ApplicationCommandInteractionResolvedData = {
            attachments: new TypedCollection(Attachment, client),
            channels:    new TypedCollection(InteractionResolvedChannel, client) ,
            members:     new TypedCollection(Member, client),
            messages:    new TypedCollection(Message, client),
            roles:       new TypedCollection(Role, client),
            users:       new TypedCollection(User, client)
        };

        this.options = new InteractionOptionsWrapper(data.data.options ?? [], resolved ?? null);
    }

    override toJSON(): JSONChatInputCommandInteraction {
        return {
            ...super.toJSON(),
            appPermissions: this.appPermissions?.toJSON(),
            channelID:      this.channelID,
            data:           this.data,
            guildID:        this.guildID ?? undefined,
            guildLocale:    this.guildLocale,
            locale:         this.locale,
            member:         this.member?.toJSON(),
            type:           this.type,
            user:           this.user.toJSON(),
            options:        this.options
        };
    }
}