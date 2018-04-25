#!/usr/bin/env node
const Discord = require('discord.js');
const express = require('express');
const app = express();
const session = require("express-session");
const request = require("request");

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
app.set("trust proxy", 1);  // Trust NGINX
app.use(session({
  secret: "kokop54sdf56fgfgs849fzer",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 518400000,  // 6 days. Every 5 days the tokens are refreshhed, so this is more than necessary
    sameSite: true//,
    //secure: true
  }
}));

app.get("/login", (req,res) => {
  console.log(req.session.accessToken);
  if (req.session.accessToken != null){  // If user is logged in
    res.redirect("/select");  // let him select server or user settings
  }  // If user isn't logged in
  else res.redirect(  // Redirect him to the Discord authentication, which will redirect back to /auth
    "https://discordapp.com/api/oauth2/authorize?client_id=432905547487117313&redirect_uri=https%3A%2F%2Fwww.discat.website%2Fauth&response_type=code&scope=guilds");
});

app.get("/auth", (req,res) => {
  var options = {
    url: "https://discordapp.com/api/oauth2/token",
    form: {
      "client_id": client.id,
      "client_secret": client.secret,
      "grant_type": "client_credentials",
      "code": req.query.code,
      "redirect_uri": "https://discat.website/auth"
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }
  request.post(options, (error, response, body) => {
    if (error) throw error;
    var token = JSON.parse(body);
    req.session.accessToken = token.token_type + " " + token.access_token;
    console.log(req.session.accessToken);
    res.redirect("/login");
  });
});

app.get("/server", (req, res) => {
  res.render("selectserver");
});

app.post("/discatupdate", function (req, res) {
  try {
    const crypto = require("crypto");
    if (crypto.timingSafeEqual(
      new Buffer(req.headers["x-hub-signature"]),
      new Buffer(("sha1=" + crypto.createHmac("sha1", require("./config.json").discat_repository_webhook_secret).update(JSON.stringify(req.body)).digest("hex"))))
    ) {
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

app.listen(3000, () => 
  {
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