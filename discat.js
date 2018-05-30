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

// Store client id and secret in memory
clientId = require("./config.json").discat_client_id;
clientSecret = require("./config.json").discat_client_secret;

var commands = {};
var config;  // Config needed by modules, for example api_keys, modules...
var websiteModules;  // Modules to render on the website, not specific per server

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
  config = {};  // Reset config

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

      if (require(__dirname + "/discat-modules/modules/" + moduleName + "/module.js").getConfig != undefined) {
        // Config the requires and api keys that every module needs
        config[moduleName] = require(__dirname + "/discat-modules/modules/" + moduleName + "/module.js").getConfig();

        // Check if anything needs to be get from discat config.json
        var configKeys = Object.keys(config[moduleName]);
        for (var j = 0; j < configKeys.length; j++) {
          // If value of a config parameter has GET_FROM_CONFIG
          if (config[moduleName][configKeys[j]] == "GET_FROM_CONFIG") {
            // Get it's data from config.json and set it
            config[moduleName][configKeys[j]] = require("./config.json").third_party[configKeys[j]];
          }
        }
      }

      newWebsiteModules.push(websiteModule);
    }
    websiteModules = newWebsiteModules;
  });
}

function loadCommands(serverId) {
  dbServer.find({ id: serverId }, (err, servers) => {

    commands[serverId] = {};  // Add server to commands object

    var prefix = servers[0].prefix;  // Get the prefix used in that server
    var serverModules = servers[0].modules;  // Get the modules that server has installed

    // Scroll through servers' modules
    for (var i = 0; i < serverModules.length; i++) {
      var serverModuleName = serverModules[i].name;  // Name of module currently being handled

      // Get the commands of each installed modules
      var commandsToAdd = require(__dirname + "/discat-modules/modules/" + serverModuleName + "/module.js").getCommands(
        serverModules.filter(module => (module.name == serverModuleName))[0].settings);

      // For each command of the module, add to the commands object
      for (var i = 0; i < commandsToAdd.length; i++)
        commands[serverId][prefix + commandsToAdd[i].command] = commandsToAdd[i].reply;
    }
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
});

client.on('message', msg => {
  var guild; var reply;
  if (msg.author == client.user || commands[(guild = msg.guild.id)] == null) return;
  if ((reply = commands[guild][msg.content.toLowerCase().split(" ")[0]]) == null) return;
  reply(msg, config);
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

    // Load commands for each server Discat is in
    for (var i = 0; i < client.joinedServers.length; i++)
      loadCommands(client.joinedServers[i]);
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
app.use(require("helmet")());
app.set("trust proxy", 1);  // Trust NGINX
app.use(session({
  store: new MongoStore({ mongooseConnection: mongoose.connection }),
  secret: require("./config.json").session_secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 864000000,  // User stays logged in for 10 days
    secure: true,
    //sameSite: true,
    domain: ".discat.website"
  }
}));

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

app.post("/moduleupdate", (req, res) => {
  if (req.body.ref != "refs/heads/master") {
    res.status(200).send("Not a master commit, no update!");  // Return 200 even if commit wasn't meant for module update
    return;
  }

  try {
    const crypto = require("crypto");
    if (crypto.timingSafeEqual(
      new Buffer(req.headers["x-hub-signature"]),
      new Buffer(("sha1=" + crypto.createHmac("sha1", require("./config.json").discat_modules_repository_webhook_secret).update(JSON.stringify(req.body)).digest("hex"))))) {
      const spawn = require("child_process").spawn;  // Require the spawn function

      var pull = spawn("git", ["pull"], {
        cwd: __dirname + "/discat-modules"
      });  // Pull the new update from github
      pull.on("exit", function () {  // Once the update has been pulled
        const fs = require("fs");

        var reloadModules = false;  // If a module has been added or modified, 
        var modifiedModules = [];

        function handleFileAdded(filename) {
          if (!filename.startsWith("modules/")) return;  // If not a module update, don't handle
          if (filename.endsWith("module.js")) reloadModules = true;
          // If new module has been added, it doesn't need to be added anywhere, just reload website modules
        }

        function handleFileModified(filename) {
          if (!filename.startsWith("modules/")) return;  // If not a module update, don't handle

          // If module code has been updated, remove and re-add it from every server, keeping settings that are valid
          if (filename.endsWith(".js") || filename.endsWith(".json") || filename.endsWith(".pug")) {
            reloadModules = true;  // If description update, reload website modules

            var moduleName = filename.split("/")[1];  // Example: modules/ping/module.js => ping

            // There is no need to update the same module twice in the same commit, it would give no benefit at a performance cost
            if (modifiedModules.indexOf(moduleName) >= 0) return;  // If the module has already been updated in this commit, return
            else modifiedModules.push(moduleName);  // Else, make sure that it doesn't get updated

            // newSettings are the new keys that need to be defined, as well as the types that the settings currently entered should use
            var newSettings = JSON.parse(fs.readFileSync(__dirname + "/discat-modules/modules/" + moduleName + "/config.json", "utf8")).serverdefaults;
            // Modify module in each server
            client.joinedServers.forEach((serverId) => {
              modifyDbServer(serverId, (server) => {
                var serverModuleToModify = server.modules.filter(module => (module.name == moduleName))[0];

                // Store old settings and replace them with the new ones
                var oldSettings = serverModuleToModify.settings;
                serverModuleToModify.settings = newSettings;


                // Save what you can from the old settings
                Object.keys(newSettings).forEach((settingKey) => {
                  if (typeof serverModuleToModify.settings[settingKey] == typeof oldSettings[settingKey])
                    // If the previous setting is of the same type, re-use it
                    serverModuleToModify.settings[settingKey] = oldSettings[settingKey];
                });

                server.markModified("modules");  // Notify Mongoose that modules have changed
                server.save((err, server) => { if (err) throw err; loadCommands(serverId); });
              });
            });
          }
        }

        function handleFileRemoved(filename) {
          if (!filename.startsWith("modules/")) return;  // If not a module update, don't handle

          // If module has been removed
          if (filename.endsWith("module.js")) {
            // Remove it from each server
            var moduleName = filename.split("/")[1];  // Example: modules/ping/module.js => ping
            client.joinedServers.forEach((serverId) => {
              modifyDbServer(serverId, (server) => {
                // Remove module from server modules array
                var moduleToRemove = server.modules.filter(module => (module.name == moduleName))[0];
                server.modules.splice(server.modules.indexOf(moduleToRemove, 1));
                server.markModified("modules");  // Notify Mongoose that modules have changed
                server.save((err, server) => { if (err) throw err; loadCommands(serverId); });
              });
            });
          }
        }

        var commits = req.body.commits;
        commits.forEach(commit => {
          commit.added.forEach(handleFileAdded);
          commit.modified.forEach(handleFileModified);
          commit.removed.forEach(handleFileRemoved);
        });

        if (reloadModules) loadWebsiteModules();
        res.sendStatus(200);
      });
    }
    else throw "Authentication failed";
  } catch (e) {
    console.log(e);
    res.status(400).send("Post failed!");
  }
});

// Require csurf here so that the github webhooks don't use csrf
app.use(require("csurf")());

app.use(function (req, res, next) {
  res.locals.csrftoken = req.csrfToken();
  next();
});

app.get("/login", (req, res) => {
  // If a code is passed to exchange for access token, exchange it before ifUserLoggedIn attempts to use it
  if (req.query.code != undefined && req.query.state != undefined) {
    // if csrfToken is not valid, block the request
    console.log("session state " + req.session.state);
    console.log("query " + req.query.state);
    if (req.query.state != req.session.state) {
      res.status(403).send("State invalid!");
      return;
    }
    exchangeToken(req, res, "authorization_code");
  }
  else if (req.session.accessToken != null) {  // If user is logged in
    ifUserLoggedIn(req, res, () => {
      res.redirect("/select");  // let him select server or user settings
    });
  }  // If user isn't logged in
  else {
    console.log("csrf: " + req.csrfToken());
    req.session.state = req.csrfToken();  // Use a csrfToken to check state
    console.log("session: " + req.session.state);

    res.redirect(  // Redirect him to the Discord authentication, which will redirect back to /login
      "https://discordapp.com/api/oauth2/authorize?" +
      "client_id=432905547487117313&redirect_uri=https%3A%2F%2Fwww.discat.website%2Flogin&response_type=code&scope=guilds%20identify&state=" + req.session.state);
  }
});

app.get("/logout", (req, res) => {
  req.session.accessToken = null;
  res.redirect("/");
});

function exchangeToken(req, res, grantType) {
  var options = {
    url: "https://discordapp.com/api/oauth2/token",
    form: {
      "client_id": clientId,
      "client_secret": clientSecret,
      "grant_type": grantType,
      // code or refresh_token will be added in if statement below
      "redirect_uri": "https://www.discat.website/login"
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }

  if (grantType == "authorization_code") options.form.code = req.query.code;
  else options.form.refresh_token = req.session.refreshToken;

  request.post(options, (error, response, body) => {
    if (error) throw error;
    var token = JSON.parse(body);
    req.session.accessToken = token.token_type + " " + token.access_token;
    req.session.refreshToken = token.refresh_token;
    res.redirect("/login");
  });
}

app.get("/servers", (req, res) => {
  ifUserLoggedIn(req, res, () => {
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
});

function ifUserLoggedIn(req, res, callback) {
  // If user has no accessToken, get one
  if (req.session.accessToken == null) res.redirect("/login");
  else {
    // Else check if accessToken works by requesting user data
    var options = {
      url: "https://discordapp.com/api/users/@me",
      headers: {
        "Authorization": req.session.accessToken,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
    request.get(options, (error, response, body) => {
      var user = JSON.parse(body);

      if (user.message != undefined) {  // If Discord returns a message, an error happened
        if (user.message = "401: Unauthorized") {  // If the error is user not properly logged in
          if (req.session.refreshToken != undefined) {  // Check for refresh token
            // If user has refreshtoken, use it to re-authorize the user
            exchangeToken(req, res, "refresh_token");
          }
          else { res.redirect("/login"); }  // If user doesn't have a refreshtoken, re-authenticate
        }
      }

      // Save user data in session
      req.session.user = {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar
      };
      callback();
    });
  }
}

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
        csrfToken: req.csrfToken()
      });
    });
  });
});

app.get("/allmodules", (req, res) => {
  if (!ifUserLoggedIn(req, res, () => {
    res.render("modules", {
      modules: websiteModules
    });
  }));
});

app.patch("/saveserversettings", (req, res) => {
  var serverId = req.body.Discord_Server_Id;
  // Check if user is authorized to access server settings
  checkIfUserOwnsDiscatServer(serverId, req, res, function () {
    modifyDbServer(serverId, (server) => {
      server.prefix = req.body.Discat_Prefix;
      server.save((err, server) => { if (err) throw err; res.sendStatus(200); loadCommands(serverId); });
    });
  });
});

app.post("/addmodule", (req, res) => {
  console.log(req);
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
        settings: websiteModule.serverdefaults  // Set the defaults as current options, again for usage in loadCommands
      };
      if (websiteModule.serversettings != undefined) serverModule.hasserversettings = true;  // Whether to load in server settings and show server settings button
      server.modules.push(serverModule);
      server.save((err, server) => { if (err) throw err; res.sendStatus(200); loadCommands(serverId); });
    });
  });
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
      server.save((err, server) => { if (err) throw err; res.sendStatus(200); loadCommands(serverId); });
    });
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
      for (var i = 0; i < serverModuleSettingsKeys.length; i++) {
        var currentSetting = serverModuleSettingsKeys[i];

        if (typeof serverModuleSettings[currentSetting] == typeof req.body.Discat_Module_New_Settings[currentSetting])
          // If of the same type, add to the newSettings object
          newSettings[currentSetting] = req.body.Discat_Module_New_Settings[currentSetting];
        else {
          res.sendStatus(409);
          return;
        }
      }

      server.modules.filter(module => (module.name == req.body.Discat_Module_Name))[0].settings = newSettings;
      server.markModified("modules");  // Notify Mongoose that modules have changed
      server.save((err, server) => { if (err) throw err; res.sendStatus(200); loadCommands(serverId); });
    });
  });
});

app.get("/user", (req, res) => {
  if (ifUserLoggedIn(req, res, () => {
    res.render("user", {
      modules: websiteModules.filter(websiteModule => (websiteModule.hasusersettings == true)),
      userModule: true
    });
  }));
});


// App
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