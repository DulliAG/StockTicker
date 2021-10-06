const helper = require("@dulliag/discord-helper");
const { settings } = require("../config.json");

const getStockChannels = (channelList) => {
  return channelList.filter((channel) =>
    settings.valid_channel_names.find((name) => channel.name.includes(name))
  );
};

const findChannelsOnServer = (client, guildId) => {
  const GUILD = client.guilds.cache.get(guildId);

  if (GUILD == undefined) {
    helper.error(`${client.user.tag} is not featured on a guild listening on id ${guildId}!`);
    return;
  }

  return getStockChannels(GUILD.channels.cache);
};

module.exports = {
  getStockChannels,
  findChannelsOnServer,
};
