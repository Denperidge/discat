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
    "ping": function(msg){
      msg.reply("pong");
    }
  }
};



client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
}); // TODO session

client.on('message', msg => {
  var guild; var reply;
  if (msg.author == client.user || commands[(guild = msg.guild.id)] == null) return;
  if ((reply=commands[guild][msg.content.toLowerCase()]) == null) return;
  reply(msg);
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
  console.log(event);
  const spawn = require("child_process").spawn;  // Require the spawn function

  var pull = spawn("git pull");  // Pull the new update from github
  pull.on("exit", function(){  // Once the update has been pulled
    var moveNginxConf = spawn("cp nginx/nginx.conf /etc/nginx/nginx.conf");  // Pull the new update from github
    moveNginxConf.on("exit", function(){  // Once the update is pulled
      var moveDiscatConf = spawn("cp nginx/discat.conf /etc/nginx/conf.d/discat.conf");  // copy nginx.confto the required directory
      moveDiscatConf.on("exit", function(){  // Once the config files have been moved
        var reloadNginx = spawn("nginx -s reload");  // Reload nginx
        reloadNginx.on("exit", function(){  // Once nginx has been reloaded
          //make a non-child process that reloads discat.js
          var reloadDiscat = spawn("pm2 reload discat", [], {
            detached: true,
            stdio: ["ignore", "ignore", "ignore"]
          });
          reloadDiscat.unref();
        });
      });
    });
  });
});

app.listen(3000, () => console.log("Website enabled on port 3000"));
client.login(require("./config.json").discordApiKey);