#!/usr/bin/env node
const Discord = require('discord.js');
const express = require('express');
const app = express();
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const request = require("request");
const mongoose = require("mongoose");

// Bot
const client = new Discord.Client();

var commands = {};
var websiteModules;  // Modules to render on the website, not specific per server
/*
var commands = {
  "429687446566076427": {
    "ping": function (msg) {
      msg.reply("pong");
    }
  }
};
*/

// Runs at startup and on server join/leave
function loadDiscatServers() {
  client.joinedServers = [];  // Array of the ID's of servers Discat is in
  client.guilds.forEach((guild) => {
    var serverId = guild.id;
    client.joinedServers.push(serverId);

    // Check if server has been added to database, add if not
    modifyDbServer(serverId, (server) => {
      if (server == undefined) {
        server = new dbServer({
          id: serverId,
          prefix: "!",
        });
      }
      server.save((err, server) => { if (err) throw err; });
    });
  });
}

function loadWebsiteModules() {
  const fs = require("fs");

  fs.readdir("discat-modules/modules/", (err, files) => {
    if (err) throw err;

    var newWebsiteModules = [];  // Don't change modules one by one, but all at once by using modules = newModules

    for (var i = 0; i < files.length; i++) {
      var moduleName = files[i];

      websiteModule = JSON.parse(fs.readFileSync(__dirname + "/discat-modules/modules/" + moduleName + "/config.json", "utf8"));

      // If module has server settings
      if (websiteModule.serverdefaults != undefined) {
        // Discat will generate an automatic settings page if the client doesn't provide one 
        if (fs.existsSync(__dirname + "/discat-modules/modules/" + moduleName + "/serversettings.pug"))
          websiteModule.serversettings = 1;  // Serversettings = 1 means that the module has their own serversettings
        else websiteModule.serversettings = 0;  // Serversettings = 0 means that Discat should auto-generate serversettings
      }

      if (fs.existsSync(__dirname + "/discat-modules/modules/" + moduleName + "/usersettings.pug"))
        websiteModule.hasusersettings = true;
      else websiteModule.hasusersettings = false;

      newWebsiteModules.push(websiteModule);
    }
    websiteModules = newWebsiteModules;
  });
}

client.on('ready', () => {
  var date = new Date();
  var day = date.getDate();
  if (day.toString().length == 1) day = "0" + day;
  var month = date.getMonth() + 1;
  if (month.toString().length == 1) month = "0" + month;
  var year = date.getFullYear();
  var time = date.toLocaleTimeString();
  var startupTime = `[${day}-${month}-${year} ${time}]`;

  console.log(`${startupTime} Logged in as ${client.user.tag}!`);

  // Store client id and secret in client object
  client.id = require("./config.json").discat_client_id;
  client.secret = require("./config.json").discat_client_secret;
});

client.on('message', msg => {
  var guild; var reply;
  if (msg.author == client.user || commands[(guild = msg.guild.id)] == null) return;
  if ((reply = commands[guild][msg.content.toLowerCase()]) == null) return;
  reply(msg);
});

client.on('guildCreate', guild => {
  loadDiscatServers();  // When Discat joins a guild, refresh the variable that stores what server Discat's in
});

client.on('guildDelete', guild => {
  loadDiscatServers();  // When Discat leaves a guild, refresh the variable that stores what server Discat's in
  dbServer.remove({ id: guild.id }, (err) => {
    // Remove server from database on server leave
    if (err) throw err;
  })
});

// Mongoose
mongoose.connect("mongodb://localhost/discat")
var db = mongoose.connection;
var dbServer;
db.on("error", console.error.bind(console, "Error connecting to MongoDB!"));
db.once("open", function () {
  var serverSchema = mongoose.Schema({
    id: String,
    prefix: String,
    modules: []
  });
  dbServer = mongoose.model("servers", serverSchema);

  // Wait 1500ms to make sure Discord client could connect
  setTimeout(() => {
    loadWebsiteModules();  // Load all the modules
    loadDiscatServers();  // Load servers Discat is in
  }, 1500);

  var date = new Date();
  var day = date.getDate();
  if (day.toString().length == 1) day = "0" + day;
  var month = date.getMonth() + 1;
  if (month.toString().length == 1) month = "0" + month;
  var year = date.getFullYear();
  var time = date.toLocaleTimeString();
  var startupTime = `[${day}-${month}-${year} ${time}]`;

  console.log(startupTime + " MongoDB connected!");
});


// Wrapper to get rid of boilerplate code
function modifyDbServer(serverId, modification) {
  dbServer.find({ id: serverId }, (err, servers) => {
    if (err) throw err;
    modification(servers[0]);
  });
  // To save: server.save((err, server) => { if (err) throw err; });
}

// Website
app.set("view engine", "pug");
app.use(require("body-parser").json());
app.set("trust proxy", 1);  // Trust NGINX
app.use(session({
  store: new MongoStore({ mongooseConnection: mongoose.connection }),
  secret: "kokop54sdf56fgfgs849fzer",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 518400000,  // 6 days. Every 5 days the tokens are refreshhed, so this is more than necessary
    //sameSite: true TODO sameSite and seure both cause errors
    secure: true
  }
}));

app.get("/login", (req, res) => {
  if (req.session.accessToken != null) {  // If user is logged in
    res.redirect("/select");  // let him select server or user settings
  }  // If user isn't logged in
  else res.redirect(  // Redirect him to the Discord authentication, which will redirect back to /auth
    "https://discordapp.com/api/oauth2/authorize?client_id=432905547487117313&redirect_uri=https%3A%2F%2Fwww.discat.website%2Fauth&response_type=code&scope=guilds");
});

app.get("/logout", (req, res) => {
  req.session.accessToken = null;
  res.redirect("/");
});

app.get("/auth", (req, res) => {
  var options = {
    url: "https://discordapp.com/api/oauth2/token",
    form: {
      "client_id": client.id,
      "client_secret": client.secret,
      "grant_type": "authorization_code",
      "code": req.query.code,
      "redirect_uri": "https://www.discat.website/auth"
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }
  request.post(options, (error, response, body) => {
    if (error) throw error;
    var token = JSON.parse(body);
    req.session.accessToken = token.token_type + " " + token.access_token;
    res.redirect("/login");
  });
});

app.get("/servers", (req, res) => {
  var options = {
    url: "https://discordapp.com/api/users/@me/guilds",
    headers: {
      "Authorization": req.session.accessToken,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }

  request.get(options, (error, response, body) => {
    var allServers = JSON.parse(body);
    var ownedServers = [];
    var serversToPush = [];
    for (var i = 0; i < allServers.length; i++) {
      var server = allServers[i];
      if (server.owner == true && client.joinedServers.includes(server.id)) {
        ownedServers.push(server.id);  // Owned server with just id, to be stored in session
        serversToPush.push({  // Owned servers with name/icon, to push to /servers
          id: server.id,
          name: server.name,
          icon: server.icon
        });
      }
    }

    req.session.ownedServers = ownedServers;

    res.render("servers", {
      servers: serversToPush
    });
  });
});

function checkIfUserOwnsDiscatServer(id, req, res, successCallback) {
  if (client.joinedServers.includes(id))  // Check if Discat is in the server
    if (req.session.ownedServers.includes(id))  // Check if user owns server
      successCallback(id);
    else res.status(403).send("You don't own this server"); // If user doesn't own the server, return 403 Forbidden
  else res.status(404).send("Discat is not added on this server");  // If discat isn't in the server, return 404 Not Found
}

app.get("/server", (req, res) => {
  checkIfUserOwnsDiscatServer(req.query.id, req, res, function () {
    var serverId = req.query.id;
    dbServer.find({ id: serverId }, (err, servers) => {
      if (err) throw err;
      res.render("server", {
        server: servers[0],
        serverModule: true,
      });
    });
  });
});

app.get("/allmodules", (req, res) => {
  res.render("modules", {
    modules: websiteModules
  });
});

app.patch("/saveserversettings", (req, res) => {
  var serverId = req.body.Discord_Server_Id;
  // Check if user is authorized to access server settings
  checkIfUserOwnsDiscatServer(serverId, req, res, function () {
    modifyDbServer(serverId, (server) => {
      server.prefix = req.body.Discat_Prefix;
      server.save((err, server) => { if (err) throw err; });
      res.sendStatus(200);
    });
  });
});

app.post("/addmodule", (req, res) => {
  var serverId = req.body.Discord_Server_Id;
  // Check if user is authorized to access server settings
  checkIfUserOwnsDiscatServer(serverId, req, res, function () {
    modifyDbServer(serverId, (server) => {
      var moduleName = req.body.Discat_Module_Name;

      if (server.modules.filter(module => (module.name == moduleName))[0] != undefined) {
        res.status(409).send("Module already added to server!");
        return;
      }

      var websiteModule = websiteModules.filter(module => (module.name == moduleName))[0];

      // Convert the website module to an object with all the necessary info for the server, to store in the database
      var serverModule = {
        name: websiteModule.name,  // Save name for usage in loadCommands
        settings: websiteModule.defaults  // Set the defaults as current options, again for usage in loadCommands
      };
      if (websiteModule.serversettings != undefined) serverModule.hasserversettings = true;  // Whether to load in server settings and show server settings button
      server.modules.push(serverModule);
      server.save((err, server) => { if (err) throw err; });
      res.sendStatus(200);
    });
  });

  // TODO loadcommands
});

app.delete("/removemodule", (req, res) => {
  var serverId = req.body.Discord_Server_Id;
  // Check if user is authorized to access server settings
  checkIfUserOwnsDiscatServer(serverId, req, res, function () {
    modifyDbServer(serverId, (server) => {
      var moduleName = req.body.Discat_Module_Name;

      // Should only be one, but can't grab [0] if length == 0
      var serverModulesWithCorrectName = server.modules.filter(module => (module.name == moduleName));
      if (serverModulesWithCorrectName.length < 1) {
        res.status(409).send("Can't remove module that isn't added to the server!");
        return;
      }
      server.modules.splice(server.modules.indexOf(serverModulesWithCorrectName[0]), 1);
      server.save((err, server) => { if (err) throw err; });
      res.sendStatus(200);
    });
    // TODO loadcommands
  });
});

app.get("/moduleserversettings", (req, res) => {
  var serverId = req.query.serverId;
  checkIfUserOwnsDiscatServer(serverId, req, res, function () {
    dbServer.find({ id: serverId }, (err, servers) => {
      if (err) throw err;

      var moduleName = req.query.modulename;
      var websiteModule = websiteModules.filter(module => (module.name == moduleName))[0];

      // Get module configuration for that server from database
      var serverModuleSettings = servers[0].modules.filter(module => (module.name == moduleName))[0].settings;

      if (websiteModule.serversettings == 0)  // if 0, auto generate server settings
        res.render("autogenmodservset", {
          settings: serverModuleSettings
        });
      else
        res.render(__dirname + "/discat-modules/modules/" + req.query.modulename + "/serversettings.pug", {
          settings: serverModuleSettings
        });
    });
  });
});

app.patch("/moduleserversettings", (req, res) => {
  var serverId = req.body.Discord_Server_Id;
  checkIfUserOwnsDiscatServer(serverId, req, res, function () {
    modifyDbServer(serverId, (server) => {
      var serverModuleSettings = server.modules.filter(module => (module.name == req.body.Discat_Module_Name))[0].settings;
      var newSettings = {};

      // Verify that the types of the original settings align with the new settings (so no messing around can be done)
      var serverModuleSettingsKeys = Object.keys(serverModuleSettings);
      console.log(serverModuleSettings);
      for (var i=0; i < serverModuleSettingsKeys.length; i++){
        var currentSetting = serverModuleSettingsKeys[i];
        console.log(currentSetting);
        console.log(typeof serverModuleSettings[currentSetting] + " " + serverModuleSettings[currentSetting])
        console.log(typeof req.body.Discat_Module_New_Settings[currentSetting] + " " + req.body.Discat_Module_New_Settings[currentSetting])

        if (typeof serverModuleSettings[currentSetting] == typeof req.body.Discat_Module_New_Settings[currentSetting])
          // If of the same type, add to the newSettings object
          newSettings[currentSetting] = req.body.Discat_Module_New_Settings[currentSetting];
        else {
          res.sendStatus(409);
          return;
        }
      }

      server.modules.filter(module => (module.name == req.body.Discat_Module_Name))[0].settings = newSettings;
      server.save((err, server) => { if (err) throw err; });
      res.sendStatus(200);
    });
  });
});

// App
app.post("/discatupdate", function (req, res) {
  try {
    const crypto = require("crypto");
    if (crypto.timingSafeEqual(
      new Buffer(req.headers["x-hub-signature"]),
      new Buffer(("sha1=" + crypto.createHmac("sha1", require("./config.json").discat_repository_webhook_secret).update(JSON.stringify(req.body)).digest("hex"))))) {
      const spawn = require("child_process").spawn;  // Require the spawn function

      var pull = spawn("git", ["pull"]);  // Pull the new update from github
      pull.on("exit", function () {  // Once the update has been pulled
        var moveNginxConf = spawn("cp", ["nginx/nginx.conf", "/etc/nginx/nginx.conf"]);  // copy nginx.conf to /etc/nginx/
        moveNginxConf.on("exit", function () {  // Once nginx.conf has been copied
          var moveDiscatConf = spawn("cp", ["nginx/discat.conf", "/etc/nginx/conf.d/discat.conf"]);  // copy discat.conf to etc/nginx/conf.d/
          moveDiscatConf.on("exit", function () {  // Once discat.conf has been copied
            var reloadNginx = spawn("sudo", ["/usr/sbin/nginx", "-s", "reload"]);  // Reload nginx
            reloadNginx.on("exit", function () {  // Once nginx has been reloaded
              // make a non-child process that reloads discat.js
              var reloadDiscat = spawn("pm2", ["reload", "discat"], {
                detached: true,
                stdio: ["ignore", "ignore", "ignore"]
              });
              reloadDiscat.unref();
              res.send("Discat updated!");
            });
          });
        });
      });
    }
    else throw "Authentication failed";
  } catch (e) {
    console.log(e);
    res.send("Post failed!")
  }
  // req.body.ref == refs/heads/master 
});

app.listen(3000, () => {
  var date = new Date();
  var day = date.getDate();
  if (day.toString().length == 1) day = "0" + day;
  var month = date.getMonth() + 1;
  if (month.toString().length == 1) month = "0" + month;
  var year = date.getFullYear();
  var time = date.toLocaleTimeString();
  var startupTime = `[${day}-${month}-${year} ${time}]`;

  console.log(startupTime + " Website enabled on port 3000");
});

client.login(require("./config.json").discat_api_key);