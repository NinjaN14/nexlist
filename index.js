const Discord = require('discord.js');
const { promisify } = require('util');
const readdir = promisify(require('fs').readdir);
const fs = require("fs");

const client = new Discord.Client();

client.db = require("quick.db");
client.moment = require('moment');
client.cooldown = new Discord.Collection();
client.ownerGuild = "764552990593515520";

try {
	client.config = require('./src/config.js');
  client.color = require("./src/config.js").color;
} catch (err) {
	console.error('Não foi possível carregar as configs! \n', err);
	process.exit(1);
}

require('./src/modules/functions.js')(client);

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();

client.talkedRecently = new Set();

if (client.config.musicEnabled === 'true') {
	client.musicQueue = new Map();
}

const init = async () => {

	const cmdFiles = await readdir('./commands/');
	client.commandsNumber = cmdFiles.length;
	console.log(`[LOG] Carregando ${client.commandsNumber} comandos [CARREGAMENTO]`);
	cmdFiles.forEach(f => {
		try {
			const props = require(`./commands/${f}`);
			if (f.split('.').slice(-1)[0] !== 'js') return;
			client.commands.set(props.help.name, props);
			props.conf.aliases.forEach(alias => {
				client.aliases.set(alias, props.help.name);
			});
		} catch (e) {
			client.log(`[ERRO] Não foi possível carregar o comando ${f} : ${e}`);
		}
	});

	const evtFiles = await readdir('./events/');
	console.log(`[LOG] Carregando ${evtFiles.length} eventos.[CARREGAMENTO]`);
	evtFiles.forEach(file => {
		const eventName = file.split('.')[0];
		const event = require(`./events/${file}`);
		client.on(eventName, event.bind(null, client));
	});

	var token = client.config.token;

	client.login("NzQ3MjUxMTM3NDIxMzc3NTQ2.X0MJ2g.mhH6MfBI2lwghADvu3mZ5xC4GBw");
};

init();