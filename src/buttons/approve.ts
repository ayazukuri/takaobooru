import { ColorResolvable, TextChannel } from "discord.js";
import { ButtonFunction, CPostDoc } from "../interfaces";
import { getPending } from "../util";

export const handler: ButtonFunction = (context, xGuild) => async (interaction) => {
    const cpost = <CPostDoc | null> <unknown> await context.db.collection("cpost").findOne({ "_id.approvalId": interaction.message.id, "status": 0 });
    if (!cpost) {
        interaction.reply({ content: "Post not found!", ephemeral: true });
        return;
    }
    const xMember = xGuild.getMember(cpost._id.authorId);
    const member = await interaction.guild.members.fetch(cpost._id.authorId);
    await context.db.collection("cpost").updateOne({ "_id.approvalId": interaction.message.id }, { $set: { "status": 1 } });
    await xMember.modifyXp(100 * cpost.count, {
        guild: interaction.guild,
        member: member
    });
    context.memQ.add(xMember);
    const pending = await getPending(context.db, cpost._id.authorId);
    if (xMember.uploadLimit > pending && xMember.uploadLimit <= pending + cpost.count) {
        await member.roles.remove(xGuild.limitedRole);
    }
    await interaction.channel?.messages.delete(interaction.message.id);
    const logch = <TextChannel> interaction.guild.channels.cache.get(xGuild.logChannel)!;
    await logch.send({ content: `<@${cpost._id.authorId}>`, embeds: [{
        title: "✅ Approved",
        description: `By <@${interaction.user.id}>`,
        footer: {
            text: new Date().toLocaleString("de")
        },
        color: <ColorResolvable> context.config.defaultColour
    }] });
};
