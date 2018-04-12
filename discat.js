#!/usr/bin/env node
const Discord = require('discord.js');
const express = require('express');
const app = express();
var handler = require("github-webhook-handler")({path: "/discatupdate", secret: require("./config.json").discatPushSecret });

// Bot
const client = new Discord.Client();

var commands = {
  "ping": "pong"
};

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
}); // TODO session

client.on('message', msg => {
  var reply = commands[msg.content];
  if (msg.author == client.user || reply == null) return;
  msg.reply(commands[msg.content]);
});


// Website
app.set("view engine", "pug");
app.use(express.static("pages/public"));


app.get("/", (req, res) => { res.sendFile(__dirname + "/pages/index.html"); });
app.get("/login", (req, res) => {
  if (req == undefined) return;
  res.sendFile(__dirname + "/pages/login.html");
});
app.get("/controlpanel", (req, res) => {
  res.render("controlpanel");
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

app.get("*", (req, res) => { res.sendFile(__dirname + "/pages/notfound.html"); });

app.listen(443, () => console.log("Website enabled on port 443"));
client.login(require("./config.json").discordApiKey);