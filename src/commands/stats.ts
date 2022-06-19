import { MessageEmbed, ColorResolvable } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { totalmem, freemem } from "os";
import { readFileSync } from "fs";
import { join } from "path";
import { CommandFunction } from "../interfaces";

const packf: any = JSON.parse(readFileSync(join(__dirname, "../../package.json")).toString("utf8"));

function msToTime(duration: number): string {
    let seconds: string | number = Math.floor((duration / 1000) % 60);
    let minutes: string | number = Math.floor((duration / (1000 * 60)) % 60);
    let hours: string | number = Math.floor((duration / (1000 * 60 * 60)) % 24);
    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;
    return hours + ":" + minutes + ":" + seconds;
}


export const data = new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Display statistics.");
export const handler: CommandFunction = (context, xGuild) => async (interaction) => {
    const embed = new MessageEmbed();
    embed
        .setColor(context.config.defaultColour as ColorResolvable)
        .addField("Version", `${packf.version}: ${packf.description}`, true)
        .addField("Cached Users", context.client.users.cache.size.toString(), true)
        .addField("Ping", context.client.ws.ping.toFixed(0) + "ms", true)
        .addField("System Time", new Date().toLocaleTimeString(), true)
        .addField("RAM Usage", `${Math.floor((totalmem() - freemem()) / 1000000)}MB / ${Math.floor(totalmem() / 1000000)}MB`, true)
        .addField("Uptime", msToTime(new Date().getTime() - context.startTime), true)
        .setFooter({
            text: "Takao.booru"
        });
    interaction.reply({ embeds: [embed], ephemeral: true });
};
