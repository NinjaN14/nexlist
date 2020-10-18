module.exports = async client => {
	const moment = require('moment');
  let db = require('quick.db');

	if (!client.user.bot) {
		client.log('[ERRO]', '', '[INFO]');
		return process.exit(0);
	}

	//await wait(1000);

	client.appInfo = await client.fetchApplication();
	setInterval(async () => {
		client.appInfo = await client.fetchApplication();
	}, 60000);

	require('../src/dashboard')(client);
  require('../src/modules/functions')(client);

	let statuses = [
		`em ${client.guilds.cache.size} servidores`,
    `com ${client.users.cache.size} usuários`,
    `com ${client.emojis.cache.size} emojis `,
    `nekz.glitch.me`,
	]; 

	setInterval(function() {

		let statuss = statuses[Math.floor(Math.random() * statuses.length)];

		client.user.setActivity(statuss,{ type: "LISTENING"});
	}, 15000);


  client.guilds.cache.forEach(async guild => {
  const welcomeChannel = await db.fetch(`guildSettings_${guild.id}_welcomeChannel`)
  const byeChannel = await db.fetch(`guildSettings_${guild.id}_byeChannel`)
  const welcomeMessage = await db.fetch(`guildSettings_${guild.id}_welcomeMessage`)
  const byeMessage = await db.fetch(`guildSettings_${guild.id}_byeMessage`)
  const welcomeAutoRole = await db.fetch(`guildSettings_${guild.id}_welcomeAutoRole`)
  const serverList = await db.fetch(`guildSettings_${guild.id}_serverList`)
    
  const guildSettings = {
   welcomeChannel: welcomeChannel,
   byeChannel: byeChannel,
   welcomeMessage: welcomeMessage,
   byeMessage: byeMessage,
   welcomeAutoRole: welcomeAutoRole,
   serverList: serverList,
  };

  client.guilds.cache.get(guild.id).options =  guildSettings;
    
 });

 console.log(`[LOG] Carregando Opções de Servidores [CARREGAMENTO]`);

 client.users.cache.forEach(async user => {
  const description = await db.fetch(`userDesc_${user.id}`)
  const token = await  db.fetch(`userToken_{user.id}`)
  const userSettings = {
    description: description,
    token: token,
   };

   client.users.cache.get(user.id).options = userSettings;
 });

 console.log(`[LOG] Carregando Opções de Usuários [CARREGAMENTO]`);
}