module.exports = {
    // Every module should contain one function: getCommands, which returns an array of functions (commands)
    getCommands() {
        var commands = [{
            command: "ping",
            reply: function ping(msg){
                msg.reply("pong");
            }
        }];

        if ("@pong" == true){  // Variable linked to serversettings.json
            commands.push({
                command: "pong",
                reply: "ping"
            });
        }
        
        return commands;
    }

    
};