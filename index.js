const Discord = require('discord.js');
const express = require('express');
const app = express();

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
app.get("*", (req, res) => { res.sendFile(__dirname + "/pages/notfound.html"); });



app.listen(443, () => console.log("Website enabled on port 443"));
client.login(require("./config.json").discordApiKey);