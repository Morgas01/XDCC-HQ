var irc=require("irc");
var axdcc=require("axdcc");
require("./webapp/Morgas/src/NodeJs/Morgas.NodeJs");
var logger=require("./logger")("downloader");
var config=require("./config");
//*
var clients={};

var getClient=function(network)
{
	if(clients[network])return clients[network];
	else return clients[network]=new Promise(function(resolve)
	{
		logger.info("make new client for network %s with nick %s",network,config.ircNick);
		var client=new irc.Client(network, config.ircNick);
		var events=['registered','motd','topic','part','kick','kill','message','notice','selfMessage','ping','pm', 'nick','error', 'action'];
		events.forEach(function(type)
		{
			client.on(type,function(msg)
			{
				logger.debug({args:arguments},network,type);
			})
		});
		client.once("registered",function()
		{
			logger.info("new client for network %s made nick %s",network,config.ircNick);
			resolve(client);
		});
	});
}
var joinChannel=function(channel)
{
	return function(client)
	{
		if(client.opt.channels.indexOf(channel) == -1)
		{
			return new Promise(function(resolve)
			{
				client.join(channel,function(){resolve(client)});
			});
		}
		else return client;
	};
}

process.on("message",function(download)
{
	download=JSON.parse(download);
	var childLogger=logger.child({download:download});
	getClient(download.network)
	.then(joinChannel(download.channel))
	.then(function(client)
	{
		var request = new axdcc.Request(client, {
		    "pack"              : download.packnumber,
		    "nick"              : download.bot,
		    "path"              : config.downloadDir,
		    "resume"            : false, //TODO restart download when resume is not supported
		    "progressInterval"  : 1
		});
		request.on('connect',function(pack)
		{
			//TODO check filename
			if(pack.filename==download.name||pack.filename.replace(/_/g," ")==download.name)
				download.msg.text="connected";
			else
				download.msg={type:"warning",text:"wrong filename: "+pack.filename};
			download.startTime=Date.now();
			download.location=pack.location;
			childLogger.debug({pack:pack,download:download},"connect");
			process.send(JSON.stringify(download));
		}); 
		request.on('dlerror',function()
		{
			download.state="fail";			
			download.msg={type:"error",text:"download error"};
			childLogger.error({args:arguments},"download error");
			process.send(JSON.stringify(download));
		}); 
		request.on('progress',function(pack,loaded)
		{
			download.progress=[loaded,pack.filesize];
			download.updateTime=Date.now();
			childLogger.info({pack:pack,download:download},"progess %d%%",(loaded/pack.filesize*100));
			process.send(JSON.stringify(download));
		});
		request.once('complete',function(pack)
		{
			download.progress=[pack.filesize,pack.filesize];
			download.state="done";
			download.msg={type:"info",text:"complete "+pack.location+"/"+pack.filename};
			childLogger.info({pack:pack,download:download},"complete");
			process.send(JSON.stringify(download));
			request.emit('kill');
		});
		request.emit("start");
		childLogger.info({download:download},"start");
	},childLogger.error);
});