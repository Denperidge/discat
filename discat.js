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
var modules = {};
/*
var commands = {
  "429687446566076427": {
    "ping": function (msg) {
      msg.reply("pong");
    }
  }
};
*/

function loadDiscatServers() {
  client.joinedServers = [];  // Array of the ID's of servers Discat is in
  client.guilds.forEach((guild) => {
    client.joinedServers.push(guild.id);
  });
}

function loadModules() {
  const fs = require("fs");

  fs.readdir("discat-modules/modules/", (err, files) => {
    if (err) throw err;

    var newModules = {};  // Don't change modules one by one, but all at once by using modules = newModules
    var newCommands;  // Don't change commands one by one, but all at once by using commands = newCommands

    for (var i = 0; i < files.length; i++) {
      var discatModule = files[i];

      var description = fs.readFileSync(__dirname + "/discat-modules/modules/" + discatModule + "/description.txt", "utf8");

      newModules[discatModule] = {};
      newModules[discatModule].description = description;

      /* TODO serversettings
      fs.readFile(__dirname + "/discat-modules/modules/" + module + "/serversettings.pug", (err, data) => {
        newModules[module.command].serversettings = data;
      });
      */

      // TODO usersettings
    }
    modules = newModules;
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

  loadModules();  // Load all the modules for the website
  loadDiscatServers();  // Load servers Discat is in

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
});

// Mongoose
mongoose.connect("mongodb://localhost/discat")
var db = mongoose.connection;
db.on("error", console.error.bind(console, "Error connecting to MongoDB!"));
db.once("open", function(){
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

app.get("/server", (req, res) => {
  if (client.joinedServers.includes(req.query.id))  // Check if Discat is in the server
    if (req.session.ownedServers.includes(req.query.id))  // Check if user owns server
      res.render("server");  // TODO pass servers' installed modules
    else res.redirect("/servers?error=403");  // If user isn't allowed, return to server selection with 403 Forbidden
  else res.redirect("/servers?error=404");  // If discat isn't in the server, return to server selection with 404, Discat not found on the server
});

app.get("/modules", (req, res) => {
  res.render("modules", {
    keys: Object.keys(modules),
    modules: modules
  });
});

app.get("/addmodule", (req, res) => {
  console.log(req.query.id + " " + req.query.module);

  // TODO loadcommands
});

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