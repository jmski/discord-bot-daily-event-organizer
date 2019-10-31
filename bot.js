const Map = require('collections/map');
const Discord = require('discord.js');
const Party = require('./party.js');
const DateTime = require('date-and-time');

const config = require('./config.js');
const client = new Discord.Client();
const parties = new Map();

var schedule = require('node-schedule');

DateTime.setLocales('en', {
    A: ['AM', 'PM']
});

function getFreeID() {
    let found = -1;
    for (let i = 1; i <= 100; i++) {
        if (parties.has(i)) continue;

        found = i;
        break;
    }

    if (found === -1) throw new Error(`Couldn't find a free ID from 1-100 range. Are there 100 parties active?`);
    return found;
}


function handleMessage(message) {

    if (message.author.bot) return;
    if (message.content.indexOf(config.prefix) !== 0) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    return handleCommand(message, command, args);
}

function handleCommand(message, command, args) {
    switch (command) {
        case 'create':
            handleCreate(message, args);
            break;
        case 'info':
            let id = Number(args[0]);
            if (!id) 
                return message.channel.send('Usage: info [id]')

            if (!parties.has(id)) 
                return message.channel.send(`Couldn't find any parties with the ID ${id}`);

            let party = parties.get(id);

            message.channel.send(`${party.type} (ID: ${id})\n${DateTime.format(party.time, 'MMM D hh:mm A')} CST\n${party.RIPE1} (Slot 1)\n${party.RIPE2} (Slot 2)\n${party.RIPE3} (Slot 3)\n${party.RIPE4} (Slot 4)\n${party.RIPE5} (Slot 5)\n${party.RIPE6} (Slot 6)`)
            break;
        case 'join': 
            handleJoin(message, args);
            break;
        case 'leave': 
            handleLeave(message, args);
            break;
        case 'cancel': 
            handleCancel(message, args);
            break;
        case 'call':
            handleCall(message, args);
            break;
        case 'help': 

            let helpMessages = [];

			helpMessages.push(' ');
			helpMessages.push('                                                                                                                Made by @jmski#7245');
			helpMessages.push(' ');
			helpMessages.push('=================================================================');
			helpMessages.push('                         Create a Party');
			helpMessages.push('=================================================================');
			helpMessages.push('!!Help - Shows all commands. Duh.');
			helpMessages.push(' ');
			helpMessages.push('!!create - Creates a party.');
			helpMessages.push('   !!create [1-11] [MM/DD] [HHmm] | (24-HR miliary format CST)');
			helpMessages.push('                          Example: !!create 1 12/25 2130');
			helpMessages.push('                                            (9:30PM CST)');
			helpMessages.push('    Events:');
			helpMessages.push('    1 - Endless Tower (Main)');
			helpMessages.push('    2 - Endless Tower (Alt)');
			helpMessages.push('    3 - Board Quest + Training Grounds + Rifts');
			helpMessages.push('    4 - Boss Hunt');
			helpMessages.push('    5 - VR40');
			helpMessages.push('    6 - VR60');
			helpMessages.push('    7 - VR80');
			helpMessages.push('    8 - VR100');
			helpMessages.push('    9 - Oracle (Easy)');
			helpMessages.push('    10 - Oracle (Normal)');
			helpMessages.push('    11 - Oracle (Hard)');
			helpMessages.push(' ');
			helpMessages.push('Note: You must have RIPE role for commands to work ');
			helpMessages.push(' ');
            helpMessages.push('=================================================================');
            helpMessages.push('                         Party Commands');
			helpMessages.push('=================================================================');
			helpMessages.push(' ');
            helpMessages.push('!!info [party id] - Displays created event party.');
			helpMessages.push(' ');
            helpMessages.push('!!cancel [party id] - Cancels a previously created event party.');
			helpMessages.push(' ');
            helpMessages.push('!!call [party id] - Sends a notification to the party members.');
			helpMessages.push(' ');
            helpMessages.push('!!join [party id] - Joins a previously created event party.');
			helpMessages.push(' ');
			helpMessages.push('!!leave [party id] -  Leaves a previously joined event party.');
			helpMessages.push(' ');
			helpMessages.push('!!invite [party id] [user] - Adds a user to created event party.');
			helpMessages.push(' ');
            helpMessages.push('!!kick [party id] [user] -  Kick a user that has previously joined an event party.');
			helpMessages.push(' ');
            helpMessages.push('!!list -  Lists all available parties.');
    		helpMessages.push(' ');
	
            message.channel.send(`\`\`\`${helpMessages.join('\n')}\`\`\``);
            break;
        case 'kick':
            handleKick(message, args);
            break;
        case 'invite':
            handleInvite(message, args);
            break;
        case 'list':
            let partyList = [];
            
            parties.forEach((party, id) => {
                partyList.push(`ID: ${id} | Event: ${party.type} | Time: ${DateTime.format(party.time, 'MMM D hh:mm A')} CST`)
            })

            message.channel.send(`Current active parties: \`\`\`${partyList.join('\n')}\`\`\``);
            break;
        default:
            break;
    }
}

function handleCreate(message, args) {

    let [type, ...datetime] = args;
    datetime = datetime.join(' ');
    
    let types = [];
    for(let i = 1; i <= config.acceptedEvents.length; i++) 
        types.push(`${i} = ${config.acceptedEvents[i-1]}`)


    if (!type || !datetime || !DateTime.isValid(datetime, 'MM/DD HHmm') || !config.acceptedEvents[Number(type) - 1]) 
        return message.channel.send(`**Usage:** create [event] [date] [Time]\n**Accepted events:** \`\`${types.join("\`\`, \`\`")}\`\`\n**Accepted time format:** MM/DD HHmm`);

    let date = new Date(DateTime.parse(datetime, 'MM/DD HHmm'));
    date.setYear(new Date().getFullYear())

    if (date < new Date) 
        return message.channel.send(`**Usage:** create [event] [date] [Time]\n**Accepted events:** \`\`${types.join("\`\`, \`\`")}\`\`\n**Accepted time format:** MM/DD HHmm`);

    let role;
    let guildMember = client.guilds.get(message.guild.id).members.get(message.author.id);

    if (guildMember.roles.has(config.roles.RIPE)) role = 'RIPE1';

    if (!role) 
        return message.channel.send(`You must have the 'RIPE' role to use this bot. Sorry!`);
    
    let id = getFreeID();
    let party = new Party(config.acceptedEvents[Number(type) - 1], date, role, guildMember);

    parties.set(id, party);
    message.channel.send(`${party.type} (ID: ${id})\n${DateTime.format(party.time, 'MMM D hh:mm A')} CST\n${party.RIPE1} (Slot 1)\n${party.RIPE2} (Slot 2)\n${party.RIPE3} (Slot 3)\n${party.RIPE4} (Slot 4)\n${party.RIPE5} (Slot 5)\n${party.RIPE6} (Slot 6)`)

    party.timer = schedule.scheduleJob(party.time, () => partyStartCallback(id, party, message));
}

function handleCall(message, args) {
    let id = Number(args[0]);
    if (!id) 
        return message.channel.send('Usage: call [id]')

    if (!parties.has(id)) 
        return message.channel.send(`Couldn't find any parties with the ID ${id}`);

    let party = parties.get(id);
    let member = client.guilds.get(message.guild.id).members.get(message.author.id);
    
    if (party.owner.id !== member.id)
        return message.channel.send(`You are not the owner of this party...`);
    
    let players = [];

    if (party.RIPE1 !== 'OPEN') players.push(party.RIPE1.toString());
    if (party.RIPE2 !== 'OPEN') players.push(party.RIPE2.toString());
    if (party.RIPE3 !== 'OPEN') players.push(party.RIPE3.toString());
    if (party.RIPE4 !== 'OPEN') players.push(party.RIPE4.toString());
    if (party.RIPE5 !== 'OPEN') players.push(party.RIPE5.toString());
	if (party.RIPE6 !== 'OPEN') players.push(party.RIPE6.toString());
    

    message.channel.send(`${players.join(', ')} party **${party.type} (ID: ${id}) (${DateTime.format(party.time, 'MMM D hh:mm A')} CST)** is starting soon... `)
}

function handleCancel(message, args) {
    let id = Number(args[0]);
    if (!id) 
        return message.channel.send('Usage: cancel [id]')

    if (!parties.has(id)) 
        return message.channel.send(`Couldn't find any parties with the ID ${id}`);

    let party = parties.get(id);
    let member = client.guilds.get(message.guild.id).members.get(message.author.id);
    
    if (party.owner.id !== member.id && !member.hasPermission('ADMINISTRATOR'))
        return message.channel.send(`You are not the owner of this party...`);
       
    party.timer.cancel();
    parties.delete(id);
    message.channel.send(`Successfully canceled the party with ID ${id}`);
}

function handleLeave(message, args) {

    let id = Number(args[0]);
    if (!id) 
        return message.channel.send('Usage: leave [id]')

    if (!parties.has(id)) 
        return message.channel.send(`Couldn't find any parties with the ID: ${id}`);

    let party = parties.get(id);
    let member = client.guilds.get(message.guild.id).members.get(message.author.id);
    
    if (member.roles.has(config.roles.RIPE)) role = 'RIPE';

    if (!role) 
        return message.channel.send(`You must have the 'RIPE' role to use this bot. Sorry!`);

    if (role === 'RIPE') {
        if (party[role+'1'] === member) role = role + '1';
        else if (party[role+'2'] === member) role = role + '2';
        else if (party[role+'3'] === member) role = role + '3';
		else if (party[role+'4'] === member) role = role + '4';
		else if (party[role+'5'] === member) role = role + '5';
		else if (party[role+'6'] === member) role = role + '6';
        else return message.channel.send(`Party is full! Sorry!`);
    }

    if (party[role].id !== member.id)
        return message.channel.send(`Party is full! Sorry!`);
       
    party[role] = 'OPEN';

    if (party.owner.id === member.id) {
        if (party.RIPE1 !== 'OPEN') party.owner = party.RIPE1;
        else if (party.RIPE2 !== 'OPEN') party.owner = party.RIPE2;
        else if (party.RIPE3 !== 'OPEN') party.owner = party.RIPE3;
        else if (party.RIPE4 !== 'OPEN') party.owner = party.RIPE4;
        else if (party.RIPE5 !== 'OPEN') party.owner = party.RIPE5;
		else if (party.RIPE6 !== 'OPEN') party.owner = party.RIPE6;
        else {
            party.timer.cancel();
            parties.delete(id);
            return message.channel.send(`Successfully canceled the party with ID ${id} due to lack of members.`);
        }    
    }
    
    parties.set(id, party);
    message.channel.send(`${party.type} (ID: ${id})\n${DateTime.format(party.time, 'MMM D hh:mm A')} CST\n${party.RIPE1} (Slot 1)\n${party.RIPE2} (Slot 2)\n${party.RIPE3} (Slot 3)\n${party.RIPE4} (Slot 4)\n${party.RIPE5} (Slot 5)\n${party.RIPE6} (Slot 6)`)
    message.channel.send(`Party owner is: ${party.owner.toString()}`);
}

function handleJoin(message, args) {

    let id = Number(args[0]);
    if (!id) 
        return message.channel.send('Usage: join [id]')

    if (!parties.has(id)) 
        return message.channel.send(`Couldn't find any parties with the ID ${id}`);

    let party = parties.get(id);
    let member = client.guilds.get(message.guild.id).members.get(message.author.id);
    
    if (member.roles.has(config.roles.RIPE)) role = 'RIPE';

    if (!role) 
        return message.channel.send(`You must have the 'RIPE' role to use this bot. Sorry!`);

    if (role === 'RIPE') {
        if (party[role+'1'] === 'OPEN') role = role + '1';
        else if (party[role+'2'] === 'OPEN') role = role + '2';
        else if (party[role+'3'] === 'OPEN') role = role + '3';
		else if (party[role+'4'] === 'OPEN') role = role + '4';
		else if (party[role+'5'] === 'OPEN') role = role + '5';
		else if (party[role+'6'] === 'OPEN') role = role + '6';
        else return message.channel.send(`Something went wrong. Sorry!`);
    }

    if (party[role] !== 'OPEN')
        return message.channel.send(`Party is full! Sorry!`);
       
    party[role] = member;

    parties.set(id, party);
    message.channel.send(`${party.type} (ID: ${id})\n${DateTime.format(party.time, 'MMM D hh:mm A')} CST\n${party.RIPE1} (Slot 1)\n${party.RIPE2} (Slot 2)\n${party.RIPE3} (Slot 3)\n${party.RIPE4} (Slot 4)\n${party.RIPE5} (Slot 5)\n${party.RIPE6} (Slot 6)`)

    if ((!party.RIPE1 === 'OPEN') && (!party.RIPE2 === 'OPEN') && (!party.RIPE3 === 'OPEN') && (!party.RIPE4 === 'OPEN') && (!party.RIPE5 === 'OPEN') && (!party.RIPE6 === 'OPEN')) {
        let players = [];

        if (party.RIPE1 !== 'OPEN') players.push(party.RIPE1.toString());
        if (party.RIPE2 !== 'OPEN') players.push(party.RIPE2.toString());
        if (party.RIPE3 !== 'OPEN') players.push(party.RIPE3.toString());
        if (party.RIPE4 !== 'OPEN') players.push(party.RIPE4.toString());
        if (party.RIPE5 !== 'OPEN') players.push(party.RIPE5.toString());
		if (party.RIPE6 !== 'OPEN') players.push(party.RIPE6.toString());
        
        message.channel.send(`${players.join(', ')} party **${party.type} (ID: ${id}) (${DateTime.format(party.time, 'MMM D hh:mm A')} CST)** is full and ready to go.`);
    }
}

function handleInvite(message, args) {

    let user = message.mentions.members.first();
    let id = Number(args[0]);

    if (!id || !user) 
        return message.channel.send('Usage: invite [id] [user]')

    if (!parties.has(id)) 
        return message.channel.send(`Couldn't find any parties with the ID: ${id}`);

    let party = parties.get(id);
    let member = client.guilds.get(message.guild.id).members.get(message.author.id);
    
    if (party.owner.id !== member.id && !member.hasPermission('ADMINISTRATOR'))
        return message.channel.send(`You are not the owner of this party...`);

    if (user.roles.has(config.roles.RIPE)) role = 'RIPE';

    if (!role) 
        return message.channel.send(`Couldn't find a team role for this user...`);

    if (role === 'RIPE') {
        if (party[role+'1'] === 'OPEN') role = role + '1';
        else if (party[role+'2'] === 'OPEN') role = role + '2';
        else if (party[role+'3'] === 'OPEN') role = role + '3';
		else if (party[role+'4'] === 'OPEN') role = role + '4';
		else if (party[role+'5'] === 'OPEN') role = role + '5';
        else if (party[role+'6'] === 'OPEN') role = role + '6';
        else return message.channel.send(`Party is full! Sorry!`);
    }

    if (party[role] !== 'OPEN')
        return message.channel.send(`Party is full! Sorry!`);
       
    party[role] = user;

    parties.set(id, party);
    message.channel.send(`${party.type} (ID: ${id})\n${DateTime.format(party.time, 'MMM D hh:mm A')} CST\n${party.RIPE1} (Slot 1)\n${party.RIPE2} (Slot 2)\n${party.RIPE3} (Slot 3)\n${party.RIPE4} (Slot 4)\n${party.RIPE5} (slot 5)\n${party.RIPE6} (slot 6)`)

    if ((!party.RIPE1 === 'OPEN') && (!party.RIPE2 === 'OPEN') && (!party.RIPE3 === 'OPEN') && (!party.RIPE4 === 'OPEN') && (!party.RIPE5 === 'OPEN')) {
        let players = [];

        if (party.RIPE1 !== 'OPEN') players.push(party.RIPE1.toString());
        if (party.RIPE2 !== 'OPEN') players.push(party.RIPE2.toString());
        if (party.RIPE3 !== 'OPEN') players.push(party.RIPE3.toString());
        if (party.RIPE4 !== 'OPEN') players.push(party.RIPE4.toString());
        if (party.RIPE5 !== 'OPEN') players.push(party.RIPE5.toString());
		if (party.RIPE6 !== 'OPEN') players.push(party.RIPE6.toString());
        
        message.channel.send(`${players.join(', ')} party **${party.type} (ID: ${id}) (${DateTime.format(party.time, 'MMM D hh:mm A')} CST)** is full and ready to go.`);
    }
}

function handleKick(message, args) {

    let user = message.mentions.members.first();
    let id = Number(args[0]);

    if (!id || !user) 
        return message.channel.send('Usage: kick [id] [user]')

    if (!parties.has(id)) 
        return message.channel.send(`Couldn't find any parties with the ID: ${id}`);

    let party = parties.get(id);
    let member = client.guilds.get(message.guild.id).members.get(message.author.id);
    
    if (party.owner.id !== member.id && !member.hasPermission('ADMINISTRATOR'))
        return message.channel.send(`You are not the owner of this party...`);

    if (user.roles.has(config.roles.RIPE)) role = 'RIPE';

    if (!role) 
        return message.channel.send(`Couldn't find a team role for this user...`);

    if (role === 'RIPE') {
        if (party[role+'1'] === user) role = role + '1';
        else if (party[role+'2'] === user) role = role + '2';
        else if (party[role+'3'] === user) role = role + '3';
		else if (party[role+'4'] === user) role = role + '4';
		else if (party[role+'5'] === user) role = role + '5';
		else if (party[role+'6'] === user) role = role + '6';
        else return message.channel.send(`Party is full! Sorry!`);
    }

    if (party[role].id !== user.id)
        return message.channel.send(`Party is full! Sorry!`);
       
    party[role] = 'OPEN';

    if (party.owner.id === member.id) {
        if (party.RIPE1 !== 'OPEN') party.owner = party.RIPE1;
        else if (party.RIPE2 !== 'OPEN') party.owner = party.RIPE2;
        else if (party.RIPE3 !== 'OPEN') party.owner = party.RIPE3;
        else if (party.RIPE4 !== 'OPEN') party.owner = party.RIPE4;
        else if (party.RIPE5 !== 'OPEN') party.owner = party.RIPE5;
		else if (party.RIPE6 !== 'OPEN') party.owner = party.RIPE6;
        else {
            party.timer.cancel();
            parties.delete(id);
            return message.channel.send(`Successfully canceled the party with ID ${id} due to lack of members.`);
        }    
    }

    parties.set(id, party);
    message.channel.send(`${party.type} (ID: ${id})\n${DateTime.format(party.time, 'MMM D hh:mm A')} CST\n${party.RIPE1} (Slot 1)\n${party.RIPE2} (Slot 2)\n${party.RIPE3} (Slot 3)\n${party.RIPE4} (Slot 4)\n${party.RIPE5} (Slot 5)\n${party.RIPE6} (Slot 6)`)
    message.channel.send(`Party owner is: ${party.owner.toString()}`);
}

function partyStartCallback(id, party, message) {
    if (!parties.has(id)) return;

    let players = [];

    if (party.RIPE1 !== 'OPEN') players.push(party.RIPE1.toString());
    if (party.RIPE2 !== 'OPEN') players.push(party.RIPE2.toString());
    if (party.RIPE3 !== 'OPEN') players.push(party.RIPE3.toString());
    if (party.RIPE4 !== 'OPEN') players.push(party.RIPE4.toString());
    if (party.RIPE5 !== 'OPEN') players.push(party.RIPE5.toString());
	if (party.RIPE6 !== 'OPEN') players.push(party.RIPE6.toString());
    
    message.channel.send(`${players.join(', ')} party **${party.type} (ID: ${id}) (${DateTime.format(party.time, 'MMM D hh:mm A')} CST)** is starting now.`);

    setTimeout(() => {
        if (parties.has(id)) parties.delete(id);
    }, 60*60*1000)
}

client.on('message', handleMessage);
client.on('ready', () => console.log(`Logged in as ${client.user.tag}!`));
client.on('error', console.error);

console.log('Initiating the login process...');
client.login(config.token).catch(console.error);