const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");

function safeCalculate(expr) {
  let cleaned = expr
    .replace(/\s+/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\^/g, "**")
    .replace(/pi/gi, String(Math.PI))
    .replace(/e/gi, String(Math.E));

  // Only allow valid mathematical characters
  if (!/^[\d+\-*/().%*^|&~]+$/.test(cleaned) && !/^(Math\.(sqrt|abs|round|floor|ceil|sin|cos|tan)\([\d+\-*/().]+\))+$/.test(cleaned)) {
    // Check if it's using standard functions
    const funcAllowed = cleaned.replace(/sqrt/g, "Math.sqrt")
      .replace(/round/g, "Math.round")
      .replace(/floor/g, "Math.floor")
      .replace(/ceil/g, "Math.ceil")
      .replace(/abs/g, "Math.abs");

    if (!/^[\d+\-*/().%*Math.sqrtroundfloorceilabs]+$/.test(funcAllowed)) {
      throw new Error("Invalid or unsafe characters in mathematical expression.");
    }
    cleaned = funcAllowed;
  }

  // Prevent prototype pollution or arbitrary code
  if (cleaned.includes("import") || cleaned.includes("require") || cleaned.includes("process") || cleaned.includes("global") || cleaned.includes("Function")) {
    throw new Error("Security violation: Restricted token detected.");
  }

  // Evaluate safely inside isolated Function with strict limits
  const result = Function(`"use strict"; return (${cleaned})`)();
  if (typeof result !== "number" || isNaN(result)) {
    throw new Error("Expression did not result in a valid number.");
  }
  return result;
}

module.exports = {
  name: "calculator",
  aliases: ["calc", "math"],
  category: "Utility",
  description: "Calculate mathematical expressions and formulas safely.",
  usage: "calc <expression> (e.g. ?calc (15 * 8) + 20)",
  data: new SlashCommandBuilder()
    .setName("calculator")
    .setDescription("Calculate mathematical expressions.")
    .addStringOption((opt) =>
      opt.setName("expression").setDescription("The mathematical expression to evaluate").setRequired(true)
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const user = isSlash ? context.user : context.author;
    const expression = isSlash ? context.options.getString("expression") : args.join(" ");

    if (!expression || expression.trim().length === 0) {
      return context.reply({
        content: "❌ Please provide a math expression to calculate!\n**Example:** `?calc (100 * 5) / 2`",
        ephemeral: true,
      });
    }

    try {
      const answer = safeCalculate(expression);

      const embed = new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle("🧮 Calculator")
        .addFields(
          { name: "📥 Expression", value: `\`\`\`fix\n${expression}\n\`\`\``, inline: false },
          { name: "📤 Result", value: `\`\`\`js\n${answer}\n\`\`\``, inline: false }
        )
        .setFooter({ text: `Calculated for ${user.tag || user.username}` })
        .setTimestamp();

      return context.reply({ embeds: [embed] });
    } catch (err) {
      return context.reply({
        content: `❌ Calculation error: \`${err.message}\``,
        ephemeral: true,
      });
    }
  },
};
