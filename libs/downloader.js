var irc=require("irc");
var axdcc=require("axdcc");
require("../webapp/Morgas/src/NodeJs/Morgas.NodeJs");
var XDCCPackage=require("../webapp/js/XDCCPackage");
var logger=require("../logger")("downloader");
var config=require("./configManager");
//*
var clients={};

var getClient=function(network)
{
	if(clients[network])return clients[network];
	else return clients[network]=new Promise(function(resolve,reject)
	{
		logger.info("make new client for network %s with nick %s",network,config.ircNick);
		var client=new irc.Client(network, config.ircNick);
		var events=['motd','topic','part','kick','kill','message','notice','selfMessage','ping','pm', 'nick', 'action'];
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
		client.once("error",function(err)
		{
			logger.error({error:err},"unable to create client for network %s made nick %s",network,config.ircNick);
			reject(client);
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
var runningDownloads=new Map();

process.on("message",function(message)
{
	message=JSON.parse(message);
	logger.debug({message:message},"message recieved");
	switch (message.type)
	{
		case "download":
			var download=new XDCCPackage().fromJSON(message.data);
			var childLogger=logger.child({download:download});
			runningDownloads.set(download.ID,{
				abort:false,
				download:download,
				request:null
			});
			logger.info("add download with ID %d",download.ID);
			var doContinue=function(data)
			{//check if download was aborted
				if(runningDownloads.get(download.ID).abort)return Promise.reject("abort");
				return data;
			}
			getClient(download.network).then(doContinue)
			.then(joinChannel(download.channel)).then(doContinue)
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
						download.message.text="connected";
					else
						download.message={type:"warning",text:"wrong filename: "+pack.filename};
					download.startTime=new Date();
					download.location=pack.location;
					childLogger.info({pack:pack,download:download},"connect");
					process.send(JSON.stringify(download));
				}); 
				request.on('dlerror',function()
				{
					download.state=XDCCPackage.states.FAIL;			
					download.message={type:"error",text:"download error"};
					childLogger.error({args:arguments},"download error");
					process.send(JSON.stringify(download));
					runningDownloads.delete(download.ID);
				}); 
				request.on('progress',function(pack,loaded)
				{
					download.progressValue=loaded;
					download.progressMax=pack.filesize;
					download.updateTime=new Date();
					childLogger.debug({pack:pack,download:download},"progess %d%%",(loaded/pack.filesize*100));
					process.send(JSON.stringify(download));
				});
				request.once('complete',function(pack)
				{
					download.progressValue=pack.filesize;
					download.progressMax=pack.filesize;
					download.state=XDCCPackage.states.DONE;
					download.message={type:"info",text:"complete"};
					childLogger.info({pack:pack,download:download},"complete");
					process.send(JSON.stringify(download));
					runningDownloads.delete(download.ID);
					request.emit('kill');
				});
				return request;
			}).then(doContinue).then(function(request)
			{
				runningDownloads.get(download.ID).request=request;
				request.emit("start");
				childLogger.info({download:download},"start");
			},function(err)
			{
				if(err==="abort")
				{
					logger.info({download:download},"abort download");
					runningDownloads.delete(download.ID);
					download.state=XDCCPackage.states.DISABLED;
					download.progressValue=download.progressMax=0;
					download.message={type:"info",text:"aborted"};
					process.send(JSON.stringify(download));
				}
				else childLogger.error(arguments);
			});
			break;
		case "kill":
			if(runningDownloads.has(message.data))
			{
				var t=runningDownloads.get(message.data);
				t.request.emit("kill");
				var download=t.download;
				runningDownloads.delete(download.ID);
				download.state=XDCCPackage.states.DISABLED;
				download.progressValue=download.progressMax=0;
				download.message={type:"info",text:"aborted"};
				process.send(JSON.stringify(download));
				logger.info({download:download},"killed download");
			}
			else {
				logger.info("has no download with ID %d",message.data);
				process.send(JSON.stringify({
					ID:message.data,
					state:XDCCPackage.states.DISABLED,
					message:{type:"info",text:"not running"}
				}));
			}
			break;
		default:
			logger.error({message:message},"unknown message type %s",message.type);
	}
});