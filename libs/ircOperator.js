(function(µ,SMOD,GMOD,HMOD,SC){
	
	var irc=require("irc");
	var xdccRequest=require("./xdccRequest");
	var EventEmitter = require("events").EventEmitter;

	SC=SC({
		Promise:"Promise"
	});
	
	var Operator = exports = module.exports = Object.create(EventEmitter.prototype);
	
	var messages=new Map();
	var MESSAGES_LIMIT=100;
	var addMessage=function(msg)
	{
		msg.timestamp=Date.now();
		var arr=null;
		var s=null;
		if(!messages.has(msg.server))
		{
			s=new Map();
			s.set("_messages",[]);
			messages.set(msg.server,s);
		}
		else s=messages.get(msg.server);
		
		if(msg.target)
		{
			if(!s.has(msg.target))
			{
				arr=[];
				s.set(msg.target,arr);
			}
			else arr=s.get(msg.target);
		}
		else arr=s.get("_messages");
		
		arr.push(msg);
		arr.splice(MESSAGES_LIMIT);
		Operator.emit("message",msg);
	}
	
	var clients=new Map();
	
	Operator.connectToNetwork=SC.Promise.pledge(function(signal,networkUri,nick)
	{
		if(!clients.has(networkUri))
		{
			var c=new irc.Client(networkUri, nick,{autoConnect: false});
			/*
			c.on("raw",function(msg)
			{
				addMessage({
					server:networkUri,
					nick:msg.nick||"Global",
					text:"RAW: "+	msg.args.join("\t"),
					message:msg
				});
			});
			*/
			c.on("registered",function(msg)
			{
				addMessage({
					server:networkUri,
					nick:msg.nick||"Global",
					text:msg.args.join("\t"),
					message:msg
				});
				signal.resolve(c);
			});
			c.on("motd",function(text)
			{
				addMessage({
					server:networkUri,
					nick:"Global",
					text:text
				});
			});
			c.on("topic",function(target, topic, nick, message)
			{
				addMessage({
					server:networkUri,
					nick:nick||"Global",
					text:topic,
					target:target,
					message:message
				});
			});
			c.on("message",function(nick, target, text, message)
			{
				addMessage({
					server:networkUri,
					nick:nick||"Global",
					text:text,
					target:target!==c.nick?target:nick||networkUri,
					message:message
				});
			});
			c.on("selfMessage",function(target, text)
			{
				addMessage({
					server:networkUri,
					nick:c.nick||"Global",
					text:text,
					target:target
				});
			});
			c.on("notice",function(nick, target, text, message)
			{
				addMessage({
					server:networkUri,
					nick:nick||"Global",
					text:text,
					target:nick&&target!==c.nick?target:networkUri,
					type:"notice",
					message:message
				});
			});
			c.on("ctcp",function(nick, target, text, type, message)
			{
				addMessage({
					server:networkUri,
					nick:nick||"Global",
					text:text,
					target:target!==c.nick?target:nick||networkUri,
					type:type,
					message:message
				});
			});
			c.on("error",function(msg)
			{
				addMessage({
					server:networkUri,
					nick:msg.nick||"Global",
					text:msg.args.join("\t"),
					message:msg
				});
			});
			c.on("abort",function(retryCount)
			{
				addMessage({
					server:networkUri,
					nick:"Global",
					text:"failed to connect after "+retryCount+" attempts"
				});
			});
			c.on("netError",function(error)
			{
				addMessage({
					server:networkUri,
					nick:"Global",
					text:error.name+": "+error.message,
	
					name:error.name,
					message:error.message,
					stack:error.stack
				});
			});
			clients.set(networkUri,c);
			c.connect();
		}
		else signal.resolve(clients.get(networkUri));
	});
	Operator.joinChannel=SC.Promise.pledge(function(signal,networkUri,channel)
	{
		if(!clients.has(networkUri))signal.reject("no such client: "+networkUri);
		else
		{
			var c=clients.get(networkUri);
			if(channel in clients.get(networkUri).chans) signal.resolve(c);
			else c.join(channel,function(){signal.resolve(c)});
		}
	});
	Operator.sendMessage=function(networkUri,target,message)
	{
		if(clients.has(networkUri))
		{
			clients.get(networkUri).say(target,message);
		}
	};
	Operator.sendPrivateMessage=function(networkUri,target,message)
	{
		if(clients.has(networkUri))
		{
			clients.get(networkUri).ctcp(target,"privmsg",message);
		}
	};
	
	Operator.getMessages=function()
	{
		var rtn=[];
		var todo=[messages];
		while(todo.length>0)
		{
			var m=todo.shift();
			for( var msg of m.values() )
			{
				if(msg instanceof Map)
				{
					todo.push(msg);
				}
				else rtn=rtn.concat(msg);
			}
		}
		return rtn;
	};
	Operator.downloadPackage=function(nick,xdccPackage,options)
	{
		return Operator.connectToNetwork(xdccPackage.network,nick)
		.then(()=>Operator.joinChannel(xdccPackage.network,xdccPackage.channel))
		.then(function(client)
		{
			return xdccRequest(client,xdccPackage,options);
		});
	}
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);