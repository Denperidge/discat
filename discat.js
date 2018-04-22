#!/usr/bin/env node
const Discord = require('discord.js');
const express = require('express');
const app = express();
const session = require("express-session");

// Bot
const client = new Discord.Client();

var commands = {
  "429687446566076427": {
    "ping": function (msg) {
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
  if ((reply = commands[guild][msg.content.toLowerCase()]) == null) return;
  reply(msg);
});


// Website
app.set("view engine", "pug");
app.use(require("body-parser").json());
app.use(session({
  secret: "kokop54sdf56fgfgs849fzer",
  resave: false,
  saveUninitialized: false,
}));

app.get("/server", (req, res) => {
  res.render("selectserver");
});

app.post("/discatupdate", function (req, res) {
  try {
    const crypto = require("crypto");
    if (crypto.timingSafeEqual(
      new Buffer(req.headers["x-hub-signature"]),
      new Buffer(("sha1=" + crypto.createHmac("sha1", require("./config.json").discatPushSecret).update(JSON.stringify(req.body)).digest("hex"))))
    ) {
      const spawn = require("child_process").spawn;  // Require the spawn function

      console.log("[] pulling...");
      var pull = spawn("git", ["pull"]);  // Pull the new update from github
      pull.on("exit", function () {  // Once the update has been pulled
        console.log("[] Moving 1...");
        var moveNginxConf = spawn("cp", ["nginx/nginx.conf", "/etc/nginx/nginx.conf"]);  // Pull the new update from github
        moveNginxConf.on("exit", function () {  // Once the update is pulled
          console.log("[] Moving 2...");
          var moveDiscatConf = spawn("cp", ["nginx/discat.conf",  "/etc/nginx/conf.d/discat.conf"]);  // copy nginx.conf to the required directory
          moveDiscatConf.on("exit", function () {  // Once the config files have been moved
            console.log("[] Reloading nginx...");
            var reloadNginx = spawn("sudo" ["nginx", "-s", "reload"]);  // Reload nginx
            reloadNginx.on("exit", function () {  // Once nginx has been reloaded
              //make a non-child process that reloads discat.js
              console.log("[] Reloading pm2...");
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

app.listen(3000, () => console.log("Website enabled on port 3000"));
client.login(require("./config.json").discordApiKey);