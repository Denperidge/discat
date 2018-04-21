#!/usr/bin/env node
const Discord = require('discord.js');
const express = require('express');
const app = express();
const session = require("express-session");
var handler = require("github-webhook-handler")({path: "/discatupdate", secret: require("./config.json").discatPushSecret });

// Bot
const client = new Discord.Client();

var commands = {
  "429687446566076427": {
    "ping": "pong"
  }
};



client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
}); // TODO session

client.on('message', msg => {
  var guild; var reply;
  if (msg.author == client.user || commands[(guild = msg.guild.id)] == null) return;
  if ((reply=commands[guild][msg.content]) == null) return;
  msg.reply(reply);
});


// Website
app.set("view engine", "pug");
app.use(session({
  secret: "kokop54sdf56fgfgs849fzer",
  resave: false,
  saveUninitialized: false,
}));

app.get("/server", (req, res) => {
  res.render("selectserver");
});

handler.on("push", function (event){  // When the Discat repository is updated
  const spawn = require("child_process").spawn;

  var pull = spawn("git pull");  // Pull the new update
  pull.on("exit", function(){
    // Once the update is pulled, make a non-child process that reloads the application
    var reload = spawn("pm2 reload discat", [], {
      detached: true,
      stdio: ["ignore", "ignore", "ignore"]
    });
    reload.unref();
  });
});

app.listen(443, () => console.log("Website enabled on port 443"));
client.login(require("./config.json").discordApiKey);