/** @module Message */
import Base from "./Base";
import Attachment from "./Attachment";
import User from "./User";
import type Guild from "./Guild";
import type Member from "./Member";
import PartialApplication from "./PartialApplication";
import type ClientApplication from "./ClientApplication";
import type AnnouncementChannel from "./AnnouncementChannel";
import type AnnouncementThreadChannel from "./AnnouncementThreadChannel";
import type PublicThreadChannel from "./PublicThreadChannel";
import type TextChannel from "./TextChannel";
import GuildChannel from "./GuildChannel";
import type PrivateChannel from "./PrivateChannel";
import type Client from "../Client";
import TypedCollection from "../util/TypedCollection";
import { BASE_URL, type MessageTypes } from "../Constants";
import type { Uncached } from "../types/shared";
import type {
    AnyGuildTextChannel,
    AnyTextChannelWithoutGroup,
    ChannelMention,
    EditMessageOptions,
    Embed,
    GetReactionsOptions,
    MessageActivity,
    MessageInteraction,
    MessageReference,
    RawAttachment,
    RawMessage,
    StartThreadFromMessageOptions,
    StickerItem,
    MessageReaction,
    MessageActionRow,
    AnyThreadChannel
} from "../types/channels";
import type { RawMember } from "../types/guilds";
import type { DeleteWebhookMessageOptions, EditWebhookMessageOptions } from "../types/webhooks";
import type { JSONMessage } from "../types/json";
import * as Routes from "../util/Routes";
import type { CreateMessageOptions } from "../types/channels";

/** Represents a message. */
export default class Message<T extends AnyTextChannelWithoutGroup | Uncached = AnyTextChannelWithoutGroup | Uncached> extends Base {
    private _cachedChannel!: T extends AnyTextChannelWithoutGroup ? T : undefined;
    private _cachedGuild?: T extends AnyGuildTextChannel ? Guild : Guild | null;
    /** The [activity](https://discord.com/developers/docs/resources/channel#message-object-message-activity-structure) associated with this message. */
    activity?: MessageActivity;
    /**
     * The application associated with this message. This can be present in two scenarios:
     * * If the message was from an interaction or application owned webhook ({@link ClientApplication} if any shard has reached READY, {@link PartialApplication} otherwise).
     * * If the message has a rich presence embed ({@link PartialApplication})
     */
    application?: PartialApplication | ClientApplication;
    /**
     * The ID of the application associated with this message. This can be present in two scenarios:
     * * If the message was from an interaction or application owned webhook ({@link ClientApplication} if any shard has reached READY, {@link PartialApplication} otherwise).
     * * If the message has a rich presence embed ({@link PartialApplication})
     */
    applicationID: string | null;
    /** The attachments on this message. */
    attachments: TypedCollection<string, RawAttachment, Attachment>;
    /** The author of this message. */
    author: User;
    /** The ID of the channel this message was created in. */
    channelID: string;
    /** The components on this message. */
    components: Array<MessageActionRow>;
    /** The content of this message. */
    content: string;
    /** The timestamp at which this message was last edited. */
    editedTimestamp: Date | null;
    /** The embeds on this message. */
    embeds: Array<Embed>;
    /** The [flags](https://discord.com/developers/docs/resources/channel#message-object-message-flags) on this message. */
    flags: number;
    /** The ID of the guild this message is in. */
    guildID: T extends AnyGuildTextChannel ? string : string | null;
    /** The interaction info, if this message was the result of an interaction. */
    interaction?: MessageInteraction;
    /** The member that created this message, if this message is in a guild. */
    member: T extends AnyGuildTextChannel ? Member : Member | undefined;
    /** Channels mentioned in a `CROSSPOSTED` channel follower message. See [Discord's docs](https://discord.com/developers/docs/resources/channel#channel-mention-object) for more information. */
    mentionChannels?: Array<ChannelMention>;
    /** The mentions in this message. */
    mentions: {
        /** The ids of the channels mentioned in this message. */
        channels: Array<string>;
        /** If @everyone/@here is mentioned in this message. */
        everyone: boolean;
        /** The members mentioned in this message. */
        members: Array<Member>;
        /** The ids of the roles mentioned in this message. */
        roles: Array<string>;
        /** The users mentioned in this message. */
        users: Array<User>;
    };
    /** If this message is a `REPLY` or `THREAD_STARTER_MESSAGE`, some info about the referenced message. */
    messageReference?: MessageReference;
    /** A nonce for ensuring a message was sent. */
    nonce?: number | string;
    /** If this message is pinned. */
    pinned: boolean;
    /** This message's relative position, if in a thread. */
    position?: number;
    /** The reactions on this message. */
    reactions: Record<string, MessageReaction>;
    /** If this message is a `REPLY` or `THREAD_STARTER_MESSAGE`, this will be the message that's referenced. */
    referencedMessage?: Message | null;
    // stickers exists, but is deprecated
    /** The sticker items on this message. */
    stickerItems?: Array<StickerItem>;
    /** The thread associated with this message, if any. */
    thread?: AnyThreadChannel;
    /** The timestamp at which this message was sent. */
    timestamp: Date;
    /** If this message was read aloud. */
    tts: boolean;
    /** The [type](https://discord.com/developers/docs/resources/channel#message-object-message-types) of this message. */
    type: MessageTypes;
    /** The webhook associated with this message, if sent via a webhook. This only has an `id` property. */
    webhookID?: string;
    constructor(data: RawMessage, client: Client) {
        super(data.id, client);
        this.attachments = new TypedCollection(Attachment, client);
        this.channelID = data.channel_id;
        this.components = [];
        this.content = data.content;
        this.editedTimestamp = null;
        this.embeds = [];
        this.flags = 0;
        this.guildID = (data.guild_id === undefined ? null : data.guild_id) as T extends AnyGuildTextChannel ? string : string | null;
        this.member = (data.member !== undefined ? this.client.util.updateMember(data.guild_id!, data.author.id, { ...data.member, user: data.author }) : undefined) as T extends AnyGuildTextChannel ? Member : Member | undefined;
        this.mentions = {
            channels: [],
            everyone: false,
            members:  [],
            roles:    [],
            users:    []
        };
        this.pinned = !!data.pinned;
        this.reactions = {};
        this.timestamp = new Date(data.timestamp);
        this.tts = data.tts;
        this.type = data.type;
        this.webhookID = data.webhook_id;
        this.update(data);
        this.author = data.author.discriminator !== "0000" ? client.users.update(data.author) : new User(data.author, client);
        if (data.application_id !== undefined) {
            if (client["_application"] && client.application.id === data.application_id) {
                if (data.application) {
                    client.application["update"](data.application);
                }
                this.application = client.application;
            } else {
                this.application = data.application ? new PartialApplication(data.application, client) : undefined;
            }
            this.applicationID = data.application_id;
        } else {
            this.applicationID = null;
        }
        if (data.attachments) {
            for (const attachment of data.attachments) {
                this.attachments.update(attachment);
            }
        }
    }

    protected override update(data: Partial<RawMessage>): void {
        if (data.mention_everyone !== undefined) {
            this.mentions.everyone = data.mention_everyone;
        }
        if (data.mention_roles !== undefined) {
            this.mentions.roles = data.mention_roles;
        }
        if (data.mentions !== undefined) {
            const members: Array<Member> = [];
            this.mentions.users = data.mentions.map(user => {
                if (this.channel && "guildID" in (this.channel as T) && user.member) {
                    members.push(this.client.util.updateMember((this.channel as AnyGuildTextChannel).guildID, user.id, { ...user.member, user }));
                }
                return this.client.users.update(user);
            });
            this.mentions.members = members;
        }
        if (data.activity !== undefined) {
            this.activity = data.activity;
        }
        if (data.attachments !== undefined) {
            for (const id of this.attachments.keys()) {
                if (!data.attachments.some(attachment => attachment.id === id)) {
                    this.attachments.delete(id);
                }
            }

            for (const attachment of data.attachments) {
                this.attachments.update(attachment);
            }
        }
        if (data.components !== undefined) {
            this.components = this.client.util.componentsToParsed(data.components);
        }
        if (data.content !== undefined) {
            this.content = data.content;
            this.mentions.channels = (data.content.match(/<#\d{17,21}>/g) ?? []).map(mention => mention.slice(2, -1));
        }
        if (data.edited_timestamp !== undefined) {
            this.editedTimestamp = data.edited_timestamp ? new Date(data.edited_timestamp) : null;
        }
        if (data.embeds !== undefined) {
            this.embeds = this.client.util.embedsToParsed(data.embeds);
        }
        if (data.flags !== undefined) {
            this.flags = data.flags;
        }
        if (data.interaction !== undefined) {
            let member: RawMember | undefined;
            if (data.interaction.member) {
                member = {
                    ...data.interaction.member,
                    user: data.interaction.user
                };
            }
            this.interaction = {
                id:     data.interaction.id,
                member: member ? this.client.util.updateMember(data.guild_id!, member.user!.id, member) : undefined,
                name:   data.interaction.name,
                type:   data.interaction.type,
                user:   this.client.users.update(data.interaction.user)
            };
        }
        if (data.message_reference) {
            this.messageReference = {
                channelID:       data.message_reference.channel_id,
                failIfNotExists: data.message_reference.fail_if_not_exists,
                guildID:         data.message_reference.guild_id,
                messageID:       data.message_reference.message_id
            };
        }

        if (data.nonce !== undefined) {
            this.nonce = data.nonce;
        }
        if (data.pinned !== undefined) {
            this.pinned = data.pinned;
        }
        if (data.position !== undefined) {
            this.position = data.position;
        }
        if (data.reactions) {
            for (const reaction of data.reactions) {
                const name = reaction.emoji.id ? `${reaction.emoji.name}:${reaction.emoji.id}` : reaction.emoji.name;
                this.reactions[name] = {
                    count: reaction.count,
                    me:    reaction.me
                };
            }
        }

        if (data.referenced_message !== undefined) {
            if (data.referenced_message === null) {
                this.referencedMessage = null;
            } else {
                this.referencedMessage = this.channel ? this.channel.messages?.update(data.referenced_message) : new Message(data.referenced_message, this.client);
            }
        }


        if (data.sticker_items !== undefined) {
            this.stickerItems = data.sticker_items;
        }
        if (data.thread !== undefined) {
            this.thread = this.client.util.updateThread(data.thread);

        }
    }

    /** The channel this message was created in. */
    get channel(): T extends AnyTextChannelWithoutGroup ? T : undefined {
        return this._cachedChannel ?? (this._cachedChannel = this.client.getChannel(this.channelID) as T extends AnyTextChannelWithoutGroup ? T : undefined);
    }

    /** The guild this message is in. This will throw an error if the guild is not cached. */
    get guild(): T extends AnyGuildTextChannel ? Guild : Guild | null {
        if (this.guildID !== null && this._cachedGuild !== null) {
            if (!this._cachedGuild) {
                this._cachedGuild = this.client.guilds.get(this.guildID);

                if (!this._cachedGuild) {
                    throw new Error(`${this.constructor.name}#guild is not present if you don't have the GUILDS intent.`);
                }
            }

            return this._cachedGuild;
        }

        return this._cachedGuild === null ? this._cachedGuild : (this._cachedGuild = null as T extends AnyGuildTextChannel ? Guild : Guild | null);
    }

    /** A link to this message. */
    get jumpLink(): string {
        return `${BASE_URL}${Routes.MESSAGE_LINK(this.guildID ?? "@me", this.channelID, this.id)}`;
    }

    /**
     * Add a reaction to this message.
     * @param emoji The reaction to add to the message. `name:id` for custom emojis, and the unicode codepoint for default emojis.
     */
    async createReaction(emoji: string): Promise<void> {
        return this.client.rest.channels.createReaction(this.channelID, this.id, emoji);
    }

    /**
     * Show a typing indicator in this channel. How long users see this varies from client to client.
     */
    async defer(): Promise<void> {
        return this.client.rest.channels.sendTyping(this.channelID);
    }

    /**
     * Reply the message
     * @param options The options for the message.
     */
    async reply(options: CreateMessageOptions): Promise<Message<T>> {
        options.messageReference = {
            messageID: this.id
        }
        return this.client.rest.channels.createMessage<T>(this.channelID, options);
    }

    /**
     * Crosspost this message in an announcement channel.
     */
    async crosspost(): Promise<Message<T>> {
        return this.client.rest.channels.crosspostMessage<T>(this.channelID, this.id);
    }

    /**
     * Delete this message.
     * @param reason The reason for deleting the message.
     */
    async delete(reason?: string): Promise<void> {
        return this.client.rest.channels.deleteMessage(this.channelID, this.id, reason);
    }

    /**
     * Remove a reaction from this message.
     * @param emoji The reaction to remove from the message. `name:id` for custom emojis, and the unicode codepoint for default emojis.
     * @param user The user to remove the reaction from, `@me` for the current user (default).
     */
    async deleteReaction(emoji: string, user = "@me"): Promise<void> {
        return this.client.rest.channels.deleteReaction(this.channelID, this.id, emoji, user);
    }

    /**
     * Remove all, or a specific emoji's reactions from this message.
     * @param emoji The reaction to remove from the message. `name:id` for custom emojis, and the unicode codepoint for default emojis. Omit to remove all reactions.
     */
    async deleteReactions(emoji?: string): Promise<void> {
        return this.client.rest.channels.deleteReactions(this.channelID, this.id, emoji);
    }

    /**
     * Delete this message as a webhook.
     * @param token The token of the webhook.
     * @param options Options for deleting the message.
     */
    async deleteWebhook(token: string, options: DeleteWebhookMessageOptions): Promise<void> {
        if (!this.webhookID) {
            throw new Error("This message is not a webhook message.");
        }
        return this.client.rest.webhooks.deleteMessage(this.webhookID, token, this.id, options);
    }

    /**
     * Edit this message.
     * @param options The options for editing the message.
     */
    async edit(options: EditMessageOptions):  Promise<Message<T>> {
        return this.client.rest.channels.editMessage<T>(this.channelID, this.id, options);
    }

    /**
     * Edit this message as a webhook.
     * @param token The token of the webhook.
     * @param options The options for editing the message.
     */
    async editWebhook(token: string, options: EditWebhookMessageOptions): Promise<Message<T>> {
        if (!this.webhookID) {
            throw new Error("This message is not a webhook message.");
        }
        return this.client.rest.webhooks.editMessage<never>(this.webhookID, token, this.id, options);
    }

    /**
     * Get the users who reacted with a specific emoji on this message.
     * @param emoji The reaction to remove from the message. `name:id` for custom emojis, and the unicode codepoint for default emojis.
     * @param options The options for getting the reactions.
     */
    async getReactions(emoji: string, options?: GetReactionsOptions): Promise<Array<User>> {
        return this.client.rest.channels.getReactions(this.channelID, this.id, emoji, options);
    }

    /** Whether this message belongs to a cached guild channel. The only difference on using this method over a simple if statement is to easily update all the message properties typing definitions based on the channel it belongs to. */
    inCachedGuildChannel(): this is Message<AnyGuildTextChannel> {
        return this.channel instanceof GuildChannel;
    }

    /** Whether this message belongs to a direct message channel (PrivateChannel or uncached). The only difference on using this method over a simple if statement is to easily update all the message properties typing definitions based on the channel it belongs to. */
    inDirectMessageChannel(): this is Message<PrivateChannel | Uncached> {
        return this.guildID === null;
    }

    /**
     * Pin this message.
     * @param reason The reason for pinning the message.
     */
    async pin(reason?: string): Promise<void> {
        return this.client.rest.channels.pinMessage(this.channelID, this.id, reason);
    }


    /**
     * Create a thread from this message.
     * @param options The options for creating the thread.
     */
    async startThread(options: StartThreadFromMessageOptions): Promise<T extends AnnouncementChannel ? AnnouncementThreadChannel : T extends TextChannel ? PublicThreadChannel : never> {
        return this.client.rest.channels.startThreadFromMessage<T extends AnnouncementChannel ? AnnouncementThreadChannel : T extends TextChannel ? PublicThreadChannel : never>(this.channelID, this.id, options);
    }
    override toJSON(): JSONMessage {
        return {
            ...super.toJSON(),
            activity:        this.activity,
            applicationID:   this.applicationID ?? undefined,
            attachments:     this.attachments.map(attachment => attachment.toJSON()),
            author:          this.author.toJSON(),
            channelID:       this.channelID,
            components:      this.components,
            content:         this.content,
            editedTimestamp: this.editedTimestamp?.getTime() ?? null,
            embeds:          this.embeds,
            flags:           this.flags,
            guildID:         this.guildID ?? undefined,
            interaction:     !this.interaction ? undefined : {
                id:     this.interaction.id,
                member: this.interaction.member?.toJSON(),
                name:   this.interaction.name,
                type:   this.interaction.type,
                user:   this.interaction.user.toJSON()
            },
            mentionChannels: this.mentionChannels,
            mentions:        {
                channels: this.mentions.channels,
                everyone: this.mentions.everyone,
                members:  this.mentions.members.map(member => member.toJSON()),
                roles:    this.mentions.roles,
                users:    this.mentions.users.map(user => user.toJSON())
            },
            messageReference:  this.messageReference,
            nonce:             this.nonce,
            pinned:            this.pinned,
            position:          this.position,
            reactions:         this.reactions,
            referencedMessage: this.referencedMessage?.toJSON(),
            stickerItems:      this.stickerItems,
            thread:            this.thread?.toJSON(),
            timestamp:         this.timestamp.getTime(),
            tts:               this.tts,
            type:              this.type,
            webhook:           this.webhookID
        };
    }

    /**
     * Unpin this message.
     * @param reason The reason for unpinning the message.
     */
    async unpin(reason?: string): Promise<void> {
        return this.client.rest.channels.unpinMessage(this.channelID, this.id, reason);
    }
}
