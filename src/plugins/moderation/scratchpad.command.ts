import {SlashCommandBuilder, SlashCommandScope} from "../../builders/SlashCommandBuilder";
import {
    ActionRowBuilder,
    ButtonBuilder, ButtonStyle,
    ChatInputCommandInteraction,
    codeBlock, Events, Interaction, ModalBuilder,
    PermissionFlagsBits, TextInputBuilder, TextInputStyle,
    userMention
} from "discord.js";
import {useChatCommand} from "../../hooks/useChatCommand";
import {RAppleUser} from "../rApple/RAppleUser";
import {useEvent} from "../../hooks";

const builder = new SlashCommandBuilder()
    .setName("scratchpad")
    .setDescription("Shows a user's scratchpad")
    .addUserOption((option) =>
        option.setName("user").setDescription("User to view the scratchpad for.").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setEphemeral(true)
    .setScope(SlashCommandScope.MAIN_GUILD)

useChatCommand(builder, async (interaction: ChatInputCommandInteraction) => {
    const targetId = interaction.options.getUser("user", true).id;
    let rAppleUser = await RAppleUser.findOne({userId: targetId});
    if (!rAppleUser) {
        rAppleUser = new RAppleUser({userId: targetId});
    }
    let message = `${userMention(targetId)}'s scratchpad`;
    if (rAppleUser.scratchpad) {
        message += `:\n${codeBlock(rAppleUser.scratchpad)}`;
    } else {
        message += ` is empty.`;
    }
    const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`scratchpad-edit-${targetId}`)
                .setEmoji("📝")
                .setStyle(ButtonStyle.Secondary)
                .setLabel("Edit")
        )
    return {
        content: `${message}`,
        components: [actionRow]
    };
})

useEvent(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isButton()) {
        return;
    }
    const [type, action, targetId] = interaction.customId.split("-");
    if (type !== "scratchpad" || action !== "edit") {
        return;
    }
    const target = await interaction.client.users.fetch(targetId);
    const rAppleUser = await RAppleUser.findOne({userId: target.id})
    const textField = new TextInputBuilder()
        .setCustomId("text")
        .setLabel("Text")
        .setPlaceholder("big stinky poo poo")
        .setValue((rAppleUser?.scratchpad) ?? "")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
    const modal = new ModalBuilder()
        .setCustomId(`${interaction.customId}`)
        .setTitle(`Scratchpad for ${target.username}`)
        .addComponents([
            new ActionRowBuilder<TextInputBuilder>().addComponents(textField)
        ])
    interaction.showModal(modal);
})

useEvent(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isModalSubmit()) {
        return;
    }
    const [type, action, targetId] = interaction.customId.split("-");
    if (type !== "scratchpad" || action !== "edit") {
        return;
    }
    let rAppleUser = await RAppleUser.findOne({userId: targetId})
    if (!rAppleUser) {
        rAppleUser = new RAppleUser({userId: targetId});
    }
    rAppleUser.scratchpad = interaction.fields.getField("text").value;
    await rAppleUser.save();
    interaction.reply({
        content: `Edited ${userMention(targetId)}'s scratchpad`,
        ephemeral: true,
        allowedMentions: {parse: []}
    });
});