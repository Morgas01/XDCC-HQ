var util=require("util");
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
		var cLogger=logger.child({network:network,nick:config.ircNick});
		cLogger.info("make new client for network %s with nick %s",network,config.ircNick);
		var client=new irc.Client(network, config.ircNick);
		client.logger=cLogger;
		client.on("error",function(err){cLogger.error({error:err})}); //general error logging
		var events=['motd','topic','part','kick','kill','message','notice','selfMessage','ping','pm', 'nick', 'action'];
		events.forEach(function(type)
		{
			client.on(type,function(msg)
			{
				cLogger.debug({args:arguments},network,type);
			})
		});
		var onError=function(err)
		{
			cLogger.error({error:err},"unable to create client for network %s made nick %s",network,config.ircNick);
			reject(err);
		};
		client.once("error",onError);
		client.once("registered",function()
		{
			client.removeListener("error",onError);
			cLogger.info("new client for network %s made nick %s",network,config.ircNick);
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
			client.logger.info("joining channel %s",channel);
			return new Promise(function(resolve,reject)
			{
				var onError=function(err)
				{
					client.logger.error({error:err},"unable to join Channel %s",channel);
					reject(err);
				};
				client.once("error",onError);
				client.join(channel,function(){
					client.removeListener("error",onError);
					client.logger.info("joined channel %s",channel);
					resolve(client)
				});
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
			var activeDownload={
				abort:false,
				download:download,
				request:null
			};
			runningDownloads.set(download.ID,activeDownload);
			logger.info("add download with ID %d",download.ID);
			var doContinue=function(data)
			{//check if download was aborted
				if(activeDownload.abort)return Promise.reject("abort");
				return data;
			}
			getClient(download.network).then(doContinue)
			.then(joinChannel(download.channel)).then(doContinue)
			.then(function(client)
			{
				return new Promise(function(resolve,reject){
					var request = new axdcc.Request(client, {
					    "pack"              : download.packnumber,
					    "nick"              : download.bot,
					    "path"              : config.downloadDir,
					    "resume"            : false, //TODO restart download when resume is not supported
					    "progressInterval"  : 1
					});
					activeDownload.request=request;
					
					request.on('connect',function(pack)
					{
						
						if(!download.name) download.name=pack.filename;
						if(pack.filename==download.name||pack.filename.trim()==download.name||pack.filename.replace(/_/g," ").trim()==download.name)
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
						childLogger.error({args:arguments},"download error");
						reject(["download error",arguments]);
					});
					request.on('progress',function(pack,loaded)
					{
						download.progressValue=loaded;
						download.progressMax=pack.filesize;
						download.updateTime=new Date();
						childLogger.debug({pack:pack,download:download},"progess %d%%",(loaded/pack.filesize*100));
						process.send(JSON.stringify(download));
					});
					client.once("error",reject);
					request.once('complete',function(pack)
					{
						client.removeListener("error",reject);
						resolve(pack);
					});
					request.emit("start");
					childLogger.info({download:download},"start");
				});
			}).then(function(pack)
			{
				download.progressValue=pack.filesize;
				download.progressMax=pack.filesize;
				download.state=XDCCPackage.states.DONE;
				download.message={type:"info",text:"complete"};
				childLogger.info({pack:pack,download:download},"complete");
				process.send(JSON.stringify(download));
				runningDownloads.delete(download.ID);
				request.emit('kill');//cleanup
			},
			function(err)
			{
				runningDownloads.delete(download.ID);
				download.progressValue=download.progressMax=0;
				if(err==="abort")
				{
					childLogger.info({download:download},"abort download");
					download.state=XDCCPackage.states.DISABLED;
					download.message={type:"info",text:"aborted"};
				}
				else
				{
					download.state=XDCCPackage.states.FAILED;
					download.message={type:"error",text:util.inspect(err)};
					childLogger.error({error:err},"download failed");
				}
				process.send(JSON.stringify(download));
			});
			break;
		case "kill":
			if(runningDownloads.has(message.data))
			{
				var t=runningDownloads.get(message.data);
				t.request.emit("cancel");
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