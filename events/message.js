const Discord = require('discord.js')
const db = require('quick.db');
const cf = require("../src/config.js");

module.exports = async (client, message) => {
  if (message.author.bot) return;
	const settings = client.config.defaultSettings;
	const args = message.content.split(/\s+/g);
  function xp(message){
    if (!client.cooldown.has(`${message.author.id}`) || !(Date.now() - client.cooldown.get(`${message.author.id}`) > client.config.cooldown)) {
        let xp = client.db.add(`xp_${message.author.id}`, 1);
        let level = Math.floor(0.3 * Math.sqrt(xp));
        let lvl = client.db.get(`level_${message.author.id}`) || client.db.set(`level_${message.author.id}`,1);;
        if (level > lvl) {
            let newLevel = client.db.set(`level_${message.author.id}`,level);
            const embed = new Discord.MessageEmbed()
            .setDescription(`:tada: ${message.author.toString()}, Você subiu para o level ${newLevel}!`)
            .setColor(client.color)
            message.channel.send(embed);
        }
        client.cooldown.set(`${message.author.id}`, Date.now());
    }
	}
  
  xp(message)
  message.settings = settings;

  const prefix = cf.prefix;
	var command = args.shift().slice(prefix.length).toLowerCase();
	const level = client.permlevel(message);
	const cmd = client.commands.get(command) || client.commands.get(client.aliases.get(command));

	if (message.channel.type === 'dm') {
		if (!cmd) return;
		if (cmd.conf.guildOnly) return message.channel.send('Este comando está desativado em DMs');
	}

	if (message.channel.type !== 'dm') {
    const guild = message.guild;
		const guildSettings = client.config.defaultSettings;
    const config = await db.fetch(`guildSettings_${guild.id}_inviteFilter`)
		if (message.content.match(/(discord\.(gg|me|io)|(discordapp\.com|discord\.com)\/invite).*/) && config == 'true' || message.content.match(/(discord\.(gg|me|io)|(discordapp\.com|discord\.com)\/invite).*/) && config == null) {
			var msgInv = message.content.match(/discord\.gg\/[0-9A-Za-z-]+/);
			if (!msgInv) return;
			var dggInvCode = msgInv[0].replace(/discord\.gg\//, '');
			if (level >= 2 || message.member.hasPermission('MANAGE_ROLES_OR_PERMISSIONS') || message.member.hasPermission('MANAGE_NICKNAMES')  || message.member.hasPermission('MANAGE_MESSAGES') || message.member.hasPermission('ADMINISTRATOR') ) {
				return console.log(`${message.author.tag} (${message.author.id}) ${level}`);
			}
			message.delete();
			message.channel.send('Convites não são permitidos neste servidor');
		}

    
		if (message.content.indexOf(client.config.prefix) !== 0) {
			return;
		}

                                                        
			client.talkedRecently.add(message.author.id);
			setTimeout(() => {
				client.talkedRecently.delete(message.author.id);
			}, parseInt(guildSettings.commandTimeout));

		if (guildSettings.logCommandUsage === 'true') {
			if (cmd) {
				if (level >= cmd.conf.permLevel) {
					if (cmd.conf.enabled === true) {
						cmd.run(client, message, args, level);
						 console.log(`${message.guild.name}/#${message.channel.name} (${message.channel.id}):${message.author.username} (${message.author.id}) Executou o comando ${message.content}`);
					} else {
						message.reply('<:fixed2:739582712909922354> Este comando está desligado para manutenções');
						console.log(`${message.guild.name}/#${message.channel.name} (${message.channel.id}):${message.author.username} (${message.author.id}) Executou o comando desligado ${message.content}`);
					}
				} else {
					message.reply('<:fixed2:739582712909922354> Você não tem permissão para isso!')
					console.log(`${message.guild.name}/#${message.channel.name} (${message.channel.id}):${message.author.username} (${message.author.id}) Executou o comando ${message.content} sem ter o nível de permissão`);
				}
			} else {
				console.log(`${message.guild.name}/#${message.channel.name} (${message.channel.id}):${message.author.username} (${message.author.id}) tentou executar um comando enexistente ${message.content}`);
				message.channel.send('<:fixed2:739582712909922354> Comando inexistente, digite `*help` para lista de comandos');
			}
		} else {
			cmd.run(client, message, args, level);
		}
	} else if (cmd) {
		if (level >= cmd.conf.permLevel) {
			if (cmd.conf.enabled) {
				cmd.run(client, message, args, level);
				if (client.config.defaultSettings.logCommandUsage === 'true') {
					console.log(`DM: ${message.author.username} (${message.author.id}) Executou o comando ${message.content}`);
				}
			} else if (client.config.defaultSettings.logCommandUsage === 'true') {
				console.log(`DM: ${message.author.username} (${message.author.id}) Executou o comando desligado ${message.content}`);
        message.reply('<:fixed2:739582712909922354> Este comando está desligado para manutenções')
			}
		} else if (client.config.defaultSettings.logCommandUsage === 'true') {
			console.log(`DM: ${message.author.username} (${message.author.id}) Executou o comando ${message.content} sem ter o nível de permissão`);
			message.reply('<:fixed2:739582712909922354> Você não tem permissão para isso!')
		}
	}
};