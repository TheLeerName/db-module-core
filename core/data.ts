import fs from "fs";
import * as L from './logger';

export const config_version = 2;

export class Data {
	readonly version_path = "data/version.json";
	readonly guilds_path = "data/guilds.json";
	readonly global_path = "data/global.json";
	readonly legacy_path = "data.json";
	readonly version = {
		guilds: 0,
		global: 0
	};
	readonly version_needed = {
		guilds: 1,
		global: 1
	} as const;

	readonly guilds: Record<string, Record<string, unknown>>;
	readonly global: Record<string, unknown>;

	constructor() {
		if (!fs.existsSync("data")) fs.mkdirSync("data");

		var content = fs.existsSync(this.version_path) ? fs.readFileSync(this.version_path).toString() : null;
		if (content) {
			const json: unknown = JSON.parse(content);
			if (!this.isRecord<number>(json, ["guilds", "global"])) throw new Error(`./${this.version_path} is not {guilds: number, global: number}`);

			var do_save = false;

			if (json.guilds) {
				this.version.guilds = json.guilds;
				/*switch(json.guilds) {
					case 1:
						break;
				}*/
			}
			else {
				json.guilds = this.version.guilds = this.version_needed.guilds;
				do_save = true;
			}

			if (json.global) {
				this.version.global = json.global;
				/*switch(json.global) {
					case 1:
						break;
				}*/
			}
			else {
				json.global = this.version.global = this.version_needed.global;
				do_save = true;
			}

			if (do_save) fs.writeFileSync(this.version_path, JSON.stringify(json));
		} else
			fs.writeFileSync(this.version_path, JSON.stringify({guilds: this.version_needed.guilds, global: this.version_needed.global}));

		content = fs.existsSync(this.guilds_path) ? fs.readFileSync(this.guilds_path).toString() : null;
		if (content) {
			const json: unknown = JSON.parse(content);
			if (!this.isRecord<unknown>(json)) throw new Error(`./${this.guilds_path} is not Record<string, Record<string, unknown>>`);
			if (!this.isRecord<unknown>(json["core"])) throw new Error(`./${this.guilds_path} is not Record<string, Record<string, unknown>>`);
			this.guilds = json as Record<string, Record<string, unknown>>;
		}
		else
			this.guilds = { core: {} };

		content = fs.existsSync(this.global_path) ? fs.readFileSync(this.global_path).toString() : null;
		if (content) {
			let json: unknown = JSON.parse(content);
			if (!this.isRecord<unknown>(json)) throw new Error(`./${this.global_path} is not Record<string, Record<string, unknown>>`);
			if (!this.isRecord<unknown>(json["core"])) throw new Error(`./${this.global_path} is not Record<string, Record<string, unknown>>`);
			this.global = json;
		}
		else
			this.global = { core: {} };

		content = fs.existsSync(this.legacy_path) ? fs.readFileSync(this.legacy_path).toString() : null;
		if (content) {
			const json: unknown = JSON.parse(content);
			if (!this.isRecord<unknown>(json)) return;

			// converting guildsData object of data.json to data/guilds.json
			if (!this.isRecord<unknown>(json.guildsData)) return;
			for (const [guild_id, guild_data] of Object.entries(json.guildsData)) {
				if (!this.isRecord<unknown>(guild_data)) continue;
				for (const [module_name, module_data] of Object.entries(guild_data)) {
					if (!this.guilds[module_name]) this.guilds[module_name] = {};
					if (!this.isRecord<object>(module_data)) continue;
					this.guilds[module_name][guild_id] = module_data;
				}
			}

			// converting module to new module name with changing field names
			if (this.guilds["stage-channel"]) {
				this.guilds["guest-text-channel"] = this.guilds["stage-channel"];
				delete this.guilds["stage-channel"];
				for (const g of Object.values<any>(this.guilds["guest-text-channel"])) {
					console.log(JSON.stringify(g));
					g.voice_channel_id = g.stageChannelID;
					delete g.stageChannelID;
					g.text_channel_id = g.textChannelID;
					delete g.textChannelID;
					console.log(JSON.stringify(g));
				}
			}

			// converting module data with changing field names
			if (this.guilds["verification-reaction"])
				for (const g of Object.values<any>(this.guilds["verification-reaction"])) {
					g.channel_id = g.channelID;
					delete g.channelID;
					g.message_id = g.messageID;
					delete g.messageID;
					g.role_id = g.roleID;
					delete g.roleID;
				}

			// converting modulesData object of data.json to data/global.json
			if (!this.isRecord<unknown>(json.modulesData)) return;
			for (const [module_name, module_data] of Object.entries(json.modulesData)) {
				if (!this.isRecord<object>(module_data)) continue;
				this.global[module_name] = module_data;
			}

			// converting module data with changing field names
			if (this.guilds["twitch-notifications"] && this.isRecord<object>(this.global["twitch-notifications"])) {
				this.global["twitch-notifications"].channels = {};
				(this.global["twitch-notifications"] as any).access_token ??= "";
				(this.global["twitch-notifications"] as any).refresh_token ??= "";
				for (const g of Object.values<any>(this.guilds["twitch-notifications"])) {
					g.discord_category_id = g.discordCategoryID;
					delete g.discordCategoryID;
					g.ping_role_id = g.pingRoleID;
					delete g.pingRoleID;
					const guild_channels: any = {};
					for (const [id, ch] of Object.entries<any>(g.channels)) {
						(this.global["twitch-notifications"].channels as any)[id] = {
							subscriptions_id: [],
							user: ch.userData,
							stream: ch.vodData ? {
								status: "getting_vod",
								id: ch.vodData.stream_id,
								started_at: ch.vodData.created_at,
								title: ch.vodData.title,
								games: ch.vodData.games,
								ended_at: ch.vodData.ended_at,
								tries_to_get: ch.vodData.triesToGet
							} : {
								status: "offline"
							}
						};
						
						guild_channels[id] = {
							discord_channel_id: ch.discordChannelID,
							discord_message_id: ch.discordMessageID
						};
					}
					g.channels = guild_channels;
				}
			}

			this.version.guilds = 1;
			this.version.global = 1;

			fs.writeFileSync(this.guilds_path, JSON.stringify(this.guilds));
			fs.writeFileSync(this.global_path, JSON.stringify(this.global));
			fs.rmSync(this.legacy_path);
			L.info("Successfully converted data.json to data folder format, start the bot again");
			process.exit(0);
		}
	}

	/** @returns Record with key as guild id */
	getGuilds<T>(requested_module_name: string): Record<string, T> {
		for (const [module_name, guilds_data] of Object.entries<Record<string, T>>(this.guilds as any)) {
			if (module_name === requested_module_name) return guilds_data;
		}
		return {};
	}
	saveGuilds(requested_module_name: string, data?: Record<string, unknown>) {
		if (data) this.guilds[requested_module_name] = data;
		fs.writeFileSync(this.guilds_path, JSON.stringify(this.guilds));
	}

	getGlobal<T>(requested_module_name: string): T {
		for (const [module_name, global_data] of Object.entries<T>(this.global as any)) {
			if (module_name === requested_module_name) return global_data;
		}
		throw new Error("This exception is not possible");
	}
	saveGlobal(requested_module_name: string, data?: unknown) {
		if (data) this.global[requested_module_name] = data;
		fs.writeFileSync(this.global_path, JSON.stringify(this.global));
	}

	isRecord<Value = any, Key extends string = string>(record: unknown, keys?: Key[]): record is Record<Key, Value> {
		if (record == null) return false;
		if (typeof record !== "object") return false;
		if (keys) for (const key of keys) if (!(record as any)[key]) return false;
		return true;
	}
}