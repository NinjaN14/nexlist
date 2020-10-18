const url = require('url');
const path = require('path');
const fs = require('fs');
const owners = '557746795543789568';
const clientPerms = "2113404159";
const Discord = require('discord.js');
const db = require('quick.db');
const ms = require('ms');
const cF = require('currency-formatter');
const express = require('express');
const app = express();
const passport = require('passport');
const session = require('express-session');
const Strategy = require('passport-discord').Strategy;
const md = require('marked');
const morgan = require('morgan');
const moment = require('moment');
var queue = new Map();
const ytdl = require('ytdl-core');

require('moment-duration-format');

module.exports = (client) => {
  client.db = require('quick.db');
  //const DBL = require("dblapi.js");
  //const dbl = new DBL(process.env.DBLTOKEN, client);

	if (client.config.dashboard.enabled !== 'true') return console.log('LOG', 'Dashboard está desativada', 'INFO');

	const dataDir = path.resolve(`${process.cwd()}${path.sep}dashboard`);

	const templateDir = path.resolve(`${dataDir}${path.sep}templates`);

	app.set('trust proxy', 5);

	app.use('/public', express.static(path.resolve(`${dataDir}${path.sep}public`), { maxAge: '10h' }));
  app.use('/content', express.static(path.resolve(`${dataDir}${path.sep}content`), { maxAge: '10h' }));
  app.use('/js', express.static(path.resolve(`${dataDir}${path.sep}js`), { maxAge: '10h' }));
  app.use('/assets', express.static(path.resolve(`${dataDir}${path.sep}assets`), { maxAge: '10h' }));
	app.use(morgan('combined'));

	passport.serializeUser((user, done) => {
		done(null, user);
	});
	passport.deserializeUser((obj, done) => {
		done(null, obj);
	});

	var protocol;

	if (client.config.dashboard.secure === 'true') {
		client.protocol = 'https://';
	} else {
		client.protocol = 'http://';
	}

	protocol = client.protocol;

	if (client.config.dashboard.secure === 'true') {
		client.protocol = 'https://';
	} else {
		client.protocol = 'http://';
	}

	protocol = client.protocol;

	client.callbackURL = `https://nexlist.glitch.me/callback`;
	console.log('[LOG]', `Callback URL: ${client.callbackURL}`, '[INFO]');
	passport.use(new Strategy({
		clientID: client.user.id,
		clientSecret: client.config.dashboard.oauthSecret,
		callbackURL: client.callbackURL,
		scope: ['identify', 'guilds', 'email', 'connections']
	},
	(accessToken, refreshToken, profile, done) => {
		process.nextTick(() => done(null, profile));
	}))

app.use(session({
		secret: client.config.dashboard.sessionSecret,
		resave: true,
		saveUninitialized: false,
	}));

	app.use(passport.initialize());
	app.use(passport.session());

	app.locals.domain = client.config.dashboard.domain;

	app.engine('html', require('ejs').renderFile);
	app.set('view engine', 'html');
	var bodyParser = require('body-parser');
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({
		extended: true
	}));

	function checkAuth(req, res, next) {
		if (req.isAuthenticated()) return next();
		req.session.backURL = req.url;
		res.redirect('/login');
	}

	function cAuth(req, res) {
		if (req.isAuthenticated()) return;
		req.session.backURL = req.url;
		res.redirect('/login');
	}

	function checkAdmin(req, res, next) {
		if (req.isAuthenticated() && req.user.id === "557746795543789568" || req.isAuthenticated() && req.user.id === "489820999164887050" || req.isAuthenticated() && req.user.id === "652674110278729748") return next();
		req.session.backURL = req.originalURL;
		res.redirect('/');
	}

  var documentation = '';
	fs.readFile(`${process.cwd()}${path.sep}dashboard${path.sep}public${path.sep}documentacao.md`, function(err, data) {
		if (err) {
			console.log(err);
			documentation = 'Error';
			return;
		}
		documentation = data.toString().replace(/\{\{botName\}\}/g, client.user.username).replace(/\{\{email\}\}/g, client.config.dashboard.legalTemplates.contactEmail);
		if (client.config.dashboard.secure !== 'true') {
			documentation = documentation.replace('Sensitive and private data exchange between the Site and its Users happens over a SSL secured communication channel and is encrypted and protected with digital signatures.', '');
		}
	});

app.get('/', (req, res) => {
    //dbl.getBot(client.user.id).then(bot => {
     res.render(path.resolve(`${templateDir}${path.sep}index.ejs`), {
			bot: client,
			auth: req.isAuthenticated() ? true : false,
			user: req.isAuthenticated() ? req.user : null,
       stats: {
		   members: client.users.cache.size,
       guilds: client.guilds.cache.size,
			 uptime:  moment.duration(client.uptime).format(' D[d], H[h], m[m], s[s]'),
		   commands: client.commandsNumber,
       channels: client.channels.cache.size
		 	},
      dbl: client,
     });
   //});
	});

  app.get('/music', (req, res) => {
    res.render(path.resolve(`${templateDir}${path.sep}music.ejs`), {
      bot: client,
      auth: req.isAuthenticated() ? true : false,
      user: req.isAuthenticated() ? req.user : null
    })
  });
  
  app.post('/music', async (req, res) => {
        const guild = req.body.guildID;
        const channel = req.body.channelID;
        let serverQueue = queue.get(guild);
        let url = req.body.music;
        const vc = client.channels.cache.get(channel);

        let songinfo = await ytdl.getInfo(url);
        let song = {
            title: songinfo.title,
            url: songinfo.video_url
        }

        if(!serverQueue) {
            let queueConst = {
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            };

            queue.set(guild, queueConst);
            queueConst.songs.push(song);

            try {
                let connection = await vc.join();
                queueConst.connection = connection
                playSong(guild, queueConst.songs[0])
            } catch (error) {
                console.log(error);
                queue.delete(guild);
            }
        } else {
            serverQueue.songs.push(song);
        }
    
      async function playSong(guild, song) {
      let serverQueue = queue.get(guild);

      if(!song){
          queue.delete(guild);
          return;
      }

      const dispatcher = serverQueue.connection.play(ytdl(song.url)).on('end', () => {
          serverQueue.songs.shift();
          playSong(guild, serverQueue.songs[0]);
      })
      .on('error', () => {
          console.log(error)
      })

      dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  }
    res.redirect('/music')
  })
  
app.get('/user/:userID', async (req, res) => {
let usuario = client.users.cache.get(req.params.userID)
const moment = require('moment')
let badge;
const badge2 = await db.fetch(`userItems_${req.params.userID.toString()}_badge2`)
const back = await db.fetch(`userBackground_${req.params.userID.toString()}`)
const bg = await db.fetch(`userItems_${req.params.userID.toString()}_background1`)
const cB = await db.fetch(`userBalance_${req.params.userID.toString()}`)
const coins = cF.format(cB, { code: 'BRL' });
const r = await db.fetch(`userRep1_${req.params.userID.toString()}`)
const p = await db.fetch(`userItems_${req.params.userID.toString()}_premium1`)
const b = await db.fetch(`userItems_${req.params.userID.toString()}_badge1`)
const desc = await db.fetch(`userDesc_${req.params.userID.toString()}`)
// Rank do usuario
const data = await db.all().filter(a => a.ID.startsWith(`level_`)).sort((a,b) => b.data - a.data);
const rank = await data.map(o => { return o.ID }).indexOf(`level_${req.params.userID.toString()}`) +1 || "N/A";
if (req.isAuthenticated()) {
  res.render(path.resolve(`${templateDir}${path.sep}user.ejs`), {
  bot: client,
  auth: true,
  user: req.user,
  usuario: usuario,
  moment: moment,
  badge: b,
  premium: p,
  reps: r,
  cB: coins,
  bg: bg,
  db: db,
  back: back,
  desc: desc,
  owners: owners,
  badge2: badge2,
  rank: rank
});
} else {
 res.render(path.resolve(`${templateDir}${path.sep}user.ejs`), {
   bot: client,
   auth: false,
   user: null,
   usuario: usuario,
   moment: moment,
   badge: b,
   premium: p,
   reps: r,
   cB: coins,
   bg: bg,
   db: db,
   back: back,
   desc: desc,
   owners: owners,
   badge2: badge2,
   rank: rank
   });
  };
});

app.get('/user' && '/user/', (req, res) => {
  res.redirect('/')
});


  const renderTemplate = (res, req, template, data = {}) => {
    const baseData = {
      bot: client,
      path: req.path,
      user: req.isAuthenticated() ? req.user : null
    };
    res.render(path.resolve(`${templateDir}${path.sep}${template}`), Object.assign(baseData, data));
  };

 app.get("/autherror", (req, res) => {
    res.render(path.resolve(`${templateDir}${path.sep}autherror.ejs`), {
			bot: client,
			auth: req.isAuthenticated() ? true : false,
			user: req.isAuthenticated() ? req.user : null,
    });
  });

	app.get('/guide', function (req, res) {
    var showdown	= require('showdown');
		var	converter = new showdown.Converter(),
			textPr			= documentation,
			htmlPr			= converter.makeHtml(textPr),
			textTe			= documentation,
			htmlTe			= converter.makeHtml(textTe);
		res.render(path.resolve(`${templateDir}${path.sep}documentacao.ejs`), {
			bot: client,
			auth: req.isAuthenticated() ? true : false,
			user: req.isAuthenticated() ? req.user : null,
			commands: htmlPr.replace(/\\'/g, `'`),
			manage: htmlTe.replace(/\\'/g, `'`),
			edited: client.config.dashboard.legalTemplates.lastEdited
		})
  });

app.get('/guilds',async (req, res) => {
    const db = require("quick.db")
      // if (partner == true) {return true} else {return false};
    //client.guilds.cache.map(async guild => {
    //const description = await db.fetch(`guildSettings_${guild.id}_description`);
		res.render(path.resolve(`${templateDir}${path.sep}guilds.ejs`),{
			bot: client,
      db: db,
      //description: description,
			auth: req.isAuthenticated() ? true : false,
			user: req.isAuthenticated() ? req.user : null,
		 });
    //});
});
  
   app.get('/users', (req, res) => {
		res.render(path.resolve(`${templateDir}${path.sep}users.ejs`), {
			bot: client,
			auth: req.isAuthenticated() ? true : false,
			user: req.isAuthenticated() ? req.user : null,
      owners: owners
		 });
	});

  app.get('/guild/:guildID', (req, res) => {
   const guild = client.guilds.cache.get(req.params.guildID);
    res.render(path.resolve(`${templateDir}${path.sep}guild.ejs`), {
      bot: client,
      auth: req.isAuthenticated() ? true : false,
      user: req.isAuthenticated() ? req.user : null,
      guild: guild,
      moment: moment,
      owners: owners,
      serverList: client.guilds.cache.get(req.params.guildID).options,
      invite: guild.options,
      createdAt: moment.utc(client.guilds.cache.get(req.params.guildID).createdAt).format('LLLL').replace('January', 'Janeiro').replace('February', 'Fevereiro').replace('March', 'Março').replace('April', 'Abril').replace('May', 'Maio').replace('June', 'Junho').replace('July', 'Julho').replace('August', 'Agosto').replace('September', 'Setembro').replace('October', 'Outubro').replace('November', 'Novembro').replace('December', 'Dezembro').replace('Sunday', 'Domingo').replace('Monday', 'Segunda-Feira').replace('Tuesday', 'Terça-Feira').replace('Wednesday', 'Quarta-Feira').replace('Thursday', 'Quinta-Feira').replace('Friday', 'Sexta-Feira').replace('Saturday', 'Sábado')
     });
  });

  app.get('/support', (req, res) => {
    res.redirect("https://discord.gg/nNBB3TP")
  });

	app.get('/login', (req, res, next) => {
		if (req.session.backURL) {
			req.session.backURL = req.session.backURL;
		} else if (req.headers.referer) {
			const parsed = url.parse(req.headers.referer);
			if (parsed.hostname === app.locals.domain) {
				req.session.backURL = parsed.path;
			}
		} else {
			req.session.backURL = '/me';
		}
		next();
	},
	passport.authenticate('discord'));


  app.get('/login/default', (req, res) => {
   res.render(path.resolve(`${templateDir}${path.sep}loginDefault.ejs`), {
	  bot: client,
    auth: req.isAuthenticated() ? true : false,
    user: req.isAuthenticated() ? req.user : null,
	 });
  });

  app.post('/login/default', (req, res) => {

  });

  
	app.get('/callback', passport.authenticate('discord', {
		failureRedirect: '/autherror'
	}), (req, res) => {
		if (req.session.backURL) {
			res.redirect(req.session.backURL);
			req.session.backURL = null;
		} else {
			res.redirect('/');
		}
	});

  app.get('/manage/project', checkAdmin, async (req, res) => {
		res.render(path.resolve(`${templateDir}${path.sep}project.ejs`), {
			bot: client,
			user: req.user,
      db: db,
			auth: true
		});
	});
  
	app.get('/admin', checkAdmin, async (req, res) => {
    const data = db.all().filter(o => o.ID.startsWith(`level_`)).sort((a,b) => b.data - a.data);
    let array = [];
    for (let i in data) {
      const id = data[i].ID.split("level_")[1];
      let level = db.get(`level_${id}`);
      let rank = data.indexOf(data[i]) + 1;
      let user = await client.users.fetch(id);
      let users = await client.users.fetch(id);
      user = user ? user.tag : "Unknown User#0000";
      let avatar = users.displayAvatarURL();
      array.push({
        level,
        rank,
        user: { id, tag: user },
        users,
        oriUser: users,
        avatar: avatar
      })
    }
		res.render(path.resolve(`${templateDir}${path.sep}admin.ejs`), {
			bot: client,
			user: req.user,
      array: array,
      db: db,
			auth: true
		});
	});
  
  app.post('/admin', checkAdmin, async (req, res) => {
    const premium = req.body.premium;
    const validade = await db.has(`PremiumKeys.keys`, premium);
    console.log(req.body.premium)
    if (validade == true){
      res.redirect('/admin')
      res.status(200)
      db.delete(`PremiumKeys`)
    } else {
      res.redirect('/');
    }
	});
  
  app.get('/rmpartner/:guildID', checkAdmin, (req, res) => {
    db.set(`GuildPartner_${req.params.guildID.toString()}`, false)
    res.redirect("/admin")
  })
  
  app.get('/addpartner/:guildID', checkAdmin, (req, res) => {
    db.set(`GuildPartner_${req.params.guildID.toString()}`, true)
    res.redirect("/admin")
  })

		app.get('/me', checkAuth, (req, res) => {
		const perms = Discord.Permissions;
    const user = req.user;
    
		res.render(path.resolve(`${templateDir}${path.sep}dashboard.ejs`), {
			perms: perms,
			bot: client,
			user: user,
			auth: true,
      moment: moment
    });
	});

	app.get('/add/:guildID', checkAuth, (req, res) => {
		req.session.backURL = '/me';
		var invitePerm = client.config.dashboard.invitePerm;
		var inviteURL = `https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&guild_id=${req.params.guildID}&response_type=code&redirect_uri=${encodeURIComponent(`${client.callbackURL}`)}&permissions=${invitePerm}`;
		if (client.guilds.cache.has(req.params.guildID)) {
			res.send('<p>Dark já está neste servidor <script>setTimeout(function () { window.location="/me"; }, 1000);</script><noscript><meta http-equiv="refresh" content="1; url=/dashboard" /></noscript>');
		} else {
			res.redirect(inviteURL);
		}
	});

	app.post('/manage/:guildID', checkAuth, (req, res) => {
		const guild = client.guilds.cache.get(req.params.guildID);
		if (!guild) return res.status(404);
		const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has('MANAGE_GUILD') : false;
		if (req.user.id === client.config.ownerID) {} else if (!isManaged) {
			res.redirect('/');
		}
   const guildSettings = {
      welcomeChannel: req.body.welcomeChannel,
      byeChannel: req.body.byeChannel,
      welcomeMessage: req.body.welcomeMessage,
      byeMessage: req.body.byeMessage,
      welcomeAutoRole: req.body.welcomeAutoRole,
   };
    
   client.guilds.cache.get(guild.id).options = guildSettings;
   let welcome = req.body.welcomeChannel;
    if (!welcome){ welcome = null };
   let bye = req.body.byeChannel;
    if (!bye){ bye = null };
   let welcomeMessage = req.body.welcomeMessage;
    if (!welcomeMessage){ welcomeMessage = null };
   let byeMessages = req.body.byeMessage;
    if (!byeMessages){ byeMessages = null };
   let role = req.body.welcomeAutoRole;
    if (!role){ role = null };
    console.log(role)
    
   db.set(`guildSettings_${guild.id}_welcomeChannel`, welcome);
   db.set(`guildSettings_${guild.id}_byeChannel`, bye);
   db.set(`guildSettings_${guild.id}_welcomeMessage`, welcomeMessage);
   db.set(`guildSettings_${guild.id}_byeMessage`, byeMessages);
   db.set(`guildSettings_${guild.id}_welcomeAutoRole`, role);
		res.redirect(`/manage/${req.params.guildID}`);
	});

	app.get('/manage/:guildID', checkAuth, (req, res) => {
		const guild = client.guilds.cache.get(req.params.guildID);
		if (!guild) return res.status(404);
    
		const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has('MANAGE_GUILD') : false;
		if (req.user.id === client.config.ownerID) {
			console.log(``);
		} else if (!isManaged) {
			res.redirect('/me');
		};
		res.render(path.resolve(`${templateDir}${path.sep}manage.ejs`), {
			bot: client,
			guild: guild,
			user: req.user,
			auth: true,
      packs: {
       moment: moment,
       db: db
      },
		});
	});
  
	app.get('/commands', (req, res) => {
		if (req.isAuthenticated()) {
			res.render(path.resolve(`${templateDir}${path.sep}commands.ejs`), {
				bot: client,
				auth: true,
				user: req.user,
				md: md
			});
		} else {
			res.render(path.resolve(`${templateDir}${path.sep}commands.ejs`), {
				bot: client,
				auth: false,
				user: null,
				md: md
			});
		}
	});

  app.get('/i/:guildID', (req, res) => {
    let guild = client.guilds.cache.get(req.params.guildID);
    guild.fetchInvites().then(invites => {
     var oxone = invites.filter(inv => inv.inviter.id == client.user.id)
     guild.channels.cache.random().createInvite().then(a => res.redirect(a.toString()))
    })
  });

  app.get('/remove/:guildID', checkAdmin, (req, res) => {
    const guild = client.guilds.cache.get(req.params.guildID);
    if (!guild || guild == undefined) return;
    guild.leave()
    res.redirect('/admin')
  });
  
  app.get('/genkey', checkAdmin, (req, res) => {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";
    for (var i = 0; i < 28; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
    db.set(`PremiumKeys`, { keys: text })
    res.redirect('/admin')
  });
  
  app.get('/reskey', async (req, res) => {
    const premium = req.body.premium;
    const validade = await db.has(`PremiumKeys.keys`, premium);
    console.log(req.body.premium)
    if (validade == true){
      client.users.cache.get('557746795543789568').send("Key TGY-nmyZhwzFqgvO3j2AyGzU3K4t\nFoi resgatada por Codein")
    } else {
      res.redirect('/');
    }
  })
  
  // Anti raid URL, completa assim que fazer uma function para checkar admin
  
  /*app.get('/raidon/:guildID', checkAuth, (req, res) => {
    const guild = client.guilds.cache.get(req.params.guildID);
    db.set(`AntiRaid_${req.params.guildID.toString()}`, true)
    res.redirect('/guild/' + req.params.guildID);
  });
  
  app.get('/raidoff/:guildID', checkAuth, (req, res) => {
    const guild = client.guilds.cache.get(req.params.guildID);
    db.set(`AntiRaid_${req.params.guildID.toString()}`, undefined)
    res.redirect('/guild/' + req.params.guildID);
  });*/
  
	app.get('/premium',function (req, res) {

		md.setOptions({
			renderer: new md.Renderer(),
			gfm: true,
			tables: true,
			breaks: false,
			pedantic: false,
			sanitize: false,
			smartLists: true,
			smartypants: false
		});

		res.render(path.resolve(`${templateDir}${path.sep}premium.ejs`), {
			bot: client,
			auth: req.isAuthenticated() ? true : false,
			user: req.isAuthenticated() ? req.user : null,
			premium: md(documentation),
			edited: client.config.dashboard.legalTemplates.lastEdited
		});
	});
  
  app.post('/premium', async (req, res) => {
    if (req.isAuthenticated() == true){
      const key = req.body.key;
      const validade = await db.has(`PremiumKeys.keys`, key);
      if (validade == true){
        res.redirect('/premium')
        res.status(200)
        db.delete(`PremiumKeys`)
        db.add(`userBalance_${req.user.id}`, 10000)
        db.add(`userRep1_${req.user.id}`, 1)
        db.add(`level_${req.user.id}`, 1)
        db.set(`Premium_${req.user.id}`, true)
      } else {
        res.redirect('/');
      }
    } else {
      res.redirect('/login')
    }
	});

	app.get('/logout', function (req, res) {
		req.logout();
		res.redirect('/');
	});

  app.get('/contributors', (req, res) => {
    res.render(path.resolve(`${templateDir}${path.sep}contributors.ejs`), {
			bot: client,
			auth: req.isAuthenticated() ? true : false,
			user: req.isAuthenticated() ? req.user : null,
    });
  });
  
  app.get('/add', (req, res) => {
   res.redirect(`https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=${clientPerms}`);
  });
 
  app.get('/edit', checkAuth, (req, res) => {
    res.render(path.resolve(`${templateDir}${path.sep}userEdit.ejs`), {
   		bot: client,
      db: db,
			user: req.user,
			auth: true,
    });
  });
  

  app.get('/generateToken', checkAuth, (req, res ) => {
   function generateToken() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";

    for (var i = 0; i < 10; i++)
     text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
   }
  
    var token = generateToken()
    client.db.set(`userToken_${req.user.id}`, token);
    client.users.cache.get(req.user.id).options.token = token;
    
   res.redirect('/edit');
  });

app.post('/edit', checkAuth, (req, res) => {
  let desc = req.body.description;
  let background = req.body.background;
  
  if (!background){ return background = null }
  if (!desc){ return desc = null }
  
  const userSettings = {
    description: desc
  };
  
   db.set(`userBackground_${req.user.id.toString()}`, background)
   db.set(`userDesc_${req.user.id.toString()}`, desc);
   client.users.cache.get(req.user.id).options = userSettings;
   res.redirect('/edit')
});

  app.get('/watch/:videoID', (req, res) => {
     res.render(path.resolve(`${templateDir}${path.sep}video.ejs`), {
			bot: client,
			auth: req.isAuthenticated() ? true : false,
			user: req.isAuthenticated() ? req.user : null,
      videoID: req.params.videoID
   });
  });

  app.get('/clip/:clipID', (req, res) => {
     res.render(path.resolve(`${templateDir}${path.sep}clip.ejs`), {
			bot: client,
			auth: req.isAuthenticated() ? true : false,
			user: req.isAuthenticated() ? req.user : null,
      clipID: req.params.clipID
   });
  });

	app.get('*', function(req, res) { // Catch-all 404
		res.send('		<link href="/public/theme-dark.css" rel="stylesheet" id="theme"> <h1 style="font-family: "Pacifico", cursive; text-transform: none;"> 404 Página não encontrada...</h1> <script>setTimeout(function () { window.location = "/"; }, 1000);</script><noscript><meta http-equiv="refresh" content="1; url=/" /></noscript>');
	});

	client.site = app.listen(client.config.dashboard.port, function() {
		console.log('[LOG]', `Painel em execução na porta ${client.config.dashboard.port}`, '[INFO]');
	}).on('error', (err) => {
		console.log('[ERROR]', `Erro ao iniciar o painel: ${err.code}`);
		return process.exit(0);
	});
};
