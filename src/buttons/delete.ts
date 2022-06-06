import { TextChannel, ColorResolvable } from "discord.js";
import { ButtonFunction, CPostDoc } from "../interfaces";

export const handler: ButtonFunction = (context, xGuild) => async (interaction) => {
    const cpost = <CPostDoc | null> <unknown> await context.db.collection("cpost").findOne({ "_id.approvalId": interaction.message.id, "status": 0 });
    if (!cpost) {
        interaction.reply({ content: "Post not found!", ephemeral: true });
        return;
    }
    await context.db.collection("cpost").updateOne({ "_id.approvalId": interaction.message.id }, { $set: { "status": 2 } });
    const { messageId, channelId } = cpost._id;
    const ch = <TextChannel> interaction.guild.channels.cache.get(channelId)!;
    await (await ch.messages.fetch(messageId)).delete();
    const logch = <TextChannel> interaction.guild.channels.cache.get(xGuild.logChannel)!;
    await logch.send({ content: `<@${cpost._id.authorId}>`, embeds: [{
        title: "❌ Deleted",
        description: `By <@${interaction.user.id}>`,
        footer: {
            text: new Date().toLocaleString("de")
        },
        color: <ColorResolvable> context.config.defaultColour
    }] });
};
