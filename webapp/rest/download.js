var path = require("path");
var logger=require("../../logger")("download");
var XDCCPackage=require("../js/XDCCPackage");
var JsonConnector=µ.getModule("DB/jsonConnector");
var fork=require("child_process").fork;
var downloader=fork(path.join(__dirname,"..","..","libs","downloader"));
var SC=µ.shortcut({
	find:"find"
});

var config=require("../../libs/configManager");
var downloads=new JsonConnector(path.join(__dirname,"..","..","temp","downloads.json"));
var pause=!config.autoStartDownloads;
var active={_count:0};
var nextOrderIndex=1;
var eventSources=[];


var cleanOrderIndexes=function(all)
{//clean orderIndexes & calculate next one
	nextOrderIndex=1;
	for(var d of all)
	{
		d.orderIndex=nextOrderIndex++;
	}
	downloads.save(all);
};
downloads.load(XDCCPackage,{},"orderIndex").then(function(all)
{
	cleanOrderIndexes(all);
	downloads.flush();
});
exports.get=function(request,queryParam,response)
{
	if(request.headers.accept==="text/event-stream")
	{
		response.writeHead(200, {"Content-Type":"text/event-stream", "Cache-Control":"no-cache", "Connection":"keep-alive"});
		response.write("retry: 5000\n");
		response.write("event: pause\ndata: "+pause+"\n\n");
		downloads.load(XDCCPackage,{},"orderIndex").then(function(all)
		{
			response.write("event: list\n");
			response.write("data: " + JSON.stringify(all) + "\n\n");
		}).then(function()
		{
			eventSources.push(response);
			request.connection.addListener("close", function () {
				var index=eventSources.indexOf(response);
				if(index===-1)logger.error("could not find response in eventSources");
				else eventSources.splice(index,1);
			}, false);
		});
	}
	else return downloads.load(XDCCPackage,{},"orderIndex").original
};
var notifyEventSources=function(eventType,data)
{
	data=JSON.stringify(data);
	for(var es of eventSources)es.write("event: "+eventType+"\ndata: "+data+"\n\n");
};

exports.add=function(request)
{
	if(request.method!=="POST")return "post packages in json array";
	else return new Promise(function(resolve,reject)
	{
		var post = '';
	    request.on('data', function (data) {post += data});
	    request.on('end', function ()
	    {
	    	try
	    	{
		    	post=JSON.parse(post);
		    	for(var i=0;i<post.length;i++)
		    	{
		    		var d=post[i]=new XDCCPackage(post[i]);
		    		d.state=XDCCPackage.states.PENDING;
		    		d.message={type:"info",text:"pending"};
		    		d.orderIndex=nextOrderIndex++;
		    	}
	    		downloads.save(post).then(function()
	    		{
	    			this.flush();
			    	for(var i=0;i<post.length;i++) notifyEventSources("add",post[i]);
	    		});
		    	resolve("ok");
		    	startDownloads();
	    	}
	    	catch(e)
	    	{
	    		reject(e);
	    	}
	    });
	});
};

//control actions
exports.pause=function(request,queryParam)
{
	if("action" in queryParam)
	{
		switch(queryParam.action.toUpperCase())
		{
			case "PAUSE":
				pause=true;
				break;
			case "CONTINUE":
				pause=false;
				startDownloads();
				break;
			default:
				return "action "+queryParam.action+" not found. action mus be either Pause or Continue.";
		}
		for(var es of eventSources)es.write("event: pause\ndata: "+pause+"\n\n");
	}
	return "ok";
};

exports.removeDone=function(request)
{
	return downloads.load(XDCCPackage,{state:XDCCPackage.states.DONE}).then(function(toDelete)
	{
		downloads.delete(XDCCPackage,toDelete);
		notifyEventSources("remove",toDelete.map(d=>d.ID));
		return "ok";
	}).original;
};

//download actions
exports.disable=function(request,queryParam)
{
	if("ID" in queryParam)
	{
		return downloads.load(XDCCPackage,{ID:parseInt(queryParam.ID,10)}).then(function(results)
		{
			if(results.length==0)
				return "no download with ID "+queryParam.ID+" found";
			else if(results[0].state!==XDCCPackage.states.PENDING)
			{
				return "download is not Pending";
			}
			else
			{
				results[0].state=XDCCPackage.states.DISABLED;
				results[0].message={type:"info",text:"disabled"};
				downloads.save(results[0]);
				notifyEventSources("update",results[0]);
				return "ok";
			}
		}).original;
	}
	return "no query parameter ID found";
};

exports.enable=function(request,queryParam)
{
	if("ID" in queryParam)
	{
		return downloads.load(XDCCPackage,{ID:parseInt(queryParam.ID,10)}).then(function(results)
		{
			if(results.length==0)
				return "no download with ID "+queryParam.ID+" found";
			else if(results[0].state!==XDCCPackage.states.DISABLED)
			{
				return "download is not Disabled";
			}
			else
			{
				results[0].state=XDCCPackage.states.PENDING;
				results[0].message={type:"info",text:"pending"};
				downloads.save(results[0]);
				notifyEventSources("update",results[0]);
				startDownloads();
	    		return "ok";
			}
		}).original;
	}
	return "no query parameter ID found";
};

exports.remove=function(request,queryParam)
{
	if("ID" in queryParam)
	{
		return downloads.load(XDCCPackage,{ID:parseInt(queryParam.ID,10)}).then(function(results)
		{
			if(results.length==0)
				return "no download with ID "+queryParam.ID+" found";
			else if(results[0].state===XDCCPackage.states.RUNNING)
			{
				return "download is Running";
			}
			else
			{
				downloads.delete(XDCCPackage,results);
				notifyEventSources("remove",[results[0].ID]);
	    		return "ok";
			}
		}).original;
	}
	return "no query parameter ID found";
};

exports.reset=function(request,queryParam)
{
	if("ID" in queryParam)
	{
		return downloads.load(XDCCPackage,{ID:parseInt(queryParam.ID,10)}).then(function(results)
		{
			if(results.length==0)
				return "no download with ID "+queryParam.ID+" found";
			else if(results[0].state===XDCCPackage.states.RUNNING)
			{
				sendKillDownload(results[0].ID);
				return "ok";
			}
			else
			{
				results[0].state=XDCCPackage.states.DISABLED;
				results[0].message={type:"info",text:"reset"};
				downloads.save(results[0]);
	    		notifyEventSources("update",results[0]);
	    		return "ok";
			}
		}).original;
	}
	return "no query parameter ID found";
};
exports.setOrder=function(request)
{
	if(request.method!=="POST")return "post json like {ID:number,beforeID:number}";
	else return new Promise(function(resolve,reject)
	{
		var post = '';
	    request.on('data', function (data) {post += data});
	    request.on('end', function ()
	    {
	    	try
	    	{
		    	post=JSON.parse(post);
		    	downloads.load(XDCCPackage,{},"orderIndex").then(function(all)
		    	{
		    		var toOrder=SC.find(all,{ID:post.ID});
		    		if(toOrder.length>0)
		    		{
		    			toOrder=toOrder[0];
			    		if(post.beforeID==null)
			    		{
			    			if(all[all.length-1]!=toOrder.value)
			    			{
			    				all.splice(toOrder.index,1);
			    				all.push(toOrder.value);
			    				toOrder.value.orderIndex=nextOrderIndex++;
			    				downloads.save(toOrder.value);
						    	notifyEventSources("update",toOrder.value);
			    			}
			    			//else is already last one
		    				resolve("ok");
			    		}
			    		else
			    		{
			    			var before=SC.find(all,{ID:post.beforeID});
			    			if(before.length>0)
			    			{
			    				before=before[0];
			    				all.splice(toOrder.index,1);
			    				all.splice(before.index,0,toOrder.value);
			    				cleanOrderIndexes(all);
						    	for(var i=0;i<all.length;i++) notifyEventSources("update",all[i]);
			    				resolve("ok");
			    			}
			    			else resolve("no download found with ID "+post.beforeID);
			    		}
		    		}
		    		else resolve("no download found with ID "+post.ID);
		    	},reject);
	    	}
	    	catch(e)
	    	{
	    		reject(e);
	    	}
	    });
	});
};

var startDownloads=function()
{
	if(!pause)
	{
		if(active._count<config.maxDownloads)
		{
			downloads.load(XDCCPackage,{state:XDCCPackage.states.PENDING},"orderIndex").then(function(all)
			{
				for(var d of all)
				{
					if(active._count<config.maxDownloads)
					{
						if(!active[d.network])active[d.network]={_count:0};
						var net=active[d.network];
						if(net._count<config.maxNetworkDownloads)
						{
							if(!net[d.bot])net[d.bot]=0;
							if(net[d.bot]<config.maxBotDownloads)
							{
								d.progress=[0,1];
								d.state=XDCCPackage.states.RUNNING;
								d.message={type:"info",text:"starting"};
								d.startTime=0;
								d.updateTime=0;
								d.location="";
								
								net[d.bot]++;
								net._count++;
								active._count++;
								
								logger.info({download:d},"run");
								logger.debug("active %d, networt %s %d, bot %s %d",active._count,d.network,net._count,d.bot,net[d.bot]);
								
					    		sendDownload(d);
							}
							else d.message.text="bot cap reached";
						}
						else d.message.text="network download cap reached";
					}
					else d.message.text="overall download cap reached";
					downloads.save(d);
		    		notifyEventSources("update",d);
				}
			});
		}
	}
};

downloader.on("message",function(d)
{
	d=JSON.parse(d);
	downloads.load(XDCCPackage,{ID:d.ID}).then(function(results)
	{
		if(results.length>0)
		{
			d=results[0].fromJSON(d);
			notifyEventSources("update",d);
			downloads.save(d);
			if(d.state!==XDCCPackage.states.RUNNING)
			{
				active._count--;
				active[d.network]._count--;
				active[d.network][d.bot]--;
				logger.info({download:d},"end");
				logger.debug("active %d, networt %s %d, bot %s %d",active._count,d.network,active[d.network]._count,d.bot,active[d.network][d.bot]);
				startDownloads();
			}
		}
	});
});
var sendDownload=function(d)
{
	var msg={type:"download",data:d}
	downloader.send(JSON.stringify(msg));
};
var sendKillDownload=function(d)
{
	var msg={type:"kill",data:d}
	downloader.send(JSON.stringify(msg));
};

startDownloads();
config.on("change",startDownloads);

setInterval(function ()
{
	notifyEventSources("ping",process.uptime());
},60000).unref();