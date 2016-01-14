(function(µ,SMOD,GMOD,HMOD,SC){
	
	var path = require("path");
	var fs = require("fs");
	var net = require("net");
	//var XDCCPackage=require("../webapp/js/XDCCPackage");
	var logger=require("../logger")("xdccRequest");
	
	SC=SC({
		Promise:"Promise",
		adopt:"adopt",
		es:"enshureFolder",
		crc:"util.crc32"
	});
	
	var DEFAULTS={
		path:"downloads",
		fileSuffix:".part",
		deleteOldFile:true, //TODO
		timeout:15000,
		resume:true,
		resumeTimeout:5000,
		checkName:false,
		cleanName:true,
		appendCRC:true,
		progressInterval:500,
		update:µ.constantFunctions.ndef()
	};
	var extractChecksum=/[\[\(]([0-9A-Z]{8})[\)\]]\./;
    var cleanName=function(name)
    {
    	if((name.indexOf("%20")!==-1&&name.indexOf(" ")===-1)||(name.indexOf("%5B")!==-1&&name.indexOf("[")===-1))
    		name=decodeURIComponent(name);
    	name=name.replace(/_/g," ");
    	name=name.replace(/\.(?![^\.]+$)/g," ");
    	return name;
    };

    // DCC {command} ("|'){filename}("|') {ip} {port}( {filesize})
    var offerParser = /DCC (\w+) "?'?(.+?)'?"? (\d+) (\d+) ?(\d+)?/;
	var int_to_IP=function (n) {
        var octets = [];

        octets.unshift(n & 255);
        octets.unshift((n >> 8) & 255);
        octets.unshift((n >> 16) & 255);
        octets.unshift((n >> 24) & 255);

        return octets.join(".");
    };
	
	module.exports=function(ircClient,xdccPackage,options)
	{
		options=SC.adopt(SC.adopt({},DEFAULTS,true),options);
		xdccPackage.message={type:"info",text:"starting"};
		xdccPackage.state="Running";
		options.update(xdccPackage);
		var log=logger.child({filename:xdccPackage.name,packID:xdccPackage.ID});
		log.info({xdccPackage:xdccPackage,options:options},"start");
		
		return new SC.Promise(function XdccRequest(signal)
		{
			var offer={
				requestTimer:null,
				resumeTimer:null,
				updateInterval:null,
				finished:false
			};
			signal.onAbort(function()
			{
				log.info("download aborted");
				offer.finished=true;
			});
			
			var onPrivmsg=function(sender, target, message)
			{
				if(sender === xdccPackage.bot && target === ircClient.nick && message.substr(0, 4) == "DCC ")
				{
		            // Split the string into an array
		            var params = message.match(offerParser);
	
		            if(params != null)
		            {
		                switch (params[1])
		                {
		                    //Got DCC SEND message
		                    case "SEND":
								//clear request timeout
								clearTimeout(offer.requestTimer);
	
		                        offer.filename = params[2];
		                        offer.ip = int_to_IP(parseInt(params[3], 10));
		                        offer.port = parseInt(params[4], 10);
		                        offer.filesize = parseInt(params[5], 10);
		                        offer.resumepos = 0;
	
		                        //guard against additional sends while waiting for resume support
		                        if(!offer.resumeTimer)
		                        {
		                        	if(!xdccPackage.name||cleanName(offer.filename)===cleanName(xdccPackage.name))
		                        	{//manually added

			                        	if(options.cleanName) xdccPackage.name=offer.filename=cleanName(offer.filename);
			                        	else xdccPackage.name=offer.filename;
		                        	}
		                        	else
		                        	{
	                        			log.warn("wrong Name: %s",offer.filename);
	                        			xdccPackage.message.type="warning";
	                        			xdccPackage.message.text="wrong name: "+offer.filename;
		                        		if(options.checkName)
		                        		{
		                    				ircClient.removeListener("ctcp-privmsg", onPrivmsg);
		                    				log.info("end download");
		                    				xdccPackage.state="Failed";
		                        			options.update(xdccPackage);
		                    				signal.reject("wrong name");
		                        			return;
		                        		}
	                        			options.update(xdccPackage);
		                        	}
	
			                        // Get the download location
			                        offer.location = path.resolve(options.path,offer.filename);
		    						
			                        // Check for file existence
		    						fs.stat(offer.location + options.fileSuffix, function (err, stats)
		    						{
			                            // File exists
			                            if (!err && stats.isFile())
			                            {
		                        			log.info("file exists");
			                                if (options.resume)
			                                {
			                                    // Resume download
			                                	log.info("try to resume");
			                                    ircClient.ctcp(xdccPackage.bot, 'privmsg', 'DCC RESUME "' + offer.filename + '" '+ offer.port + ' ' + stats.size);
			                                    offer.resumepos = stats.size;
			                                    //set timeout for resume acceptance
			                                    offer.resumeTimer=setTimeout(function()
			                                    {
			                                        // resume timeout. Delete file and start download
			                                    	log.info("resume timed out");
			                                        startDownload(false);
			                                    },options.resumeTimeout);
			                                } else {
			                                    // Dont resume download delete file and start download
			                                	log.info("don't resume");
		                                        startDownload(false);
			                                }
			                            } else {
			                                // File dont exists start download
			                                startDownload(null);
			                            }
			                        });
		                        }
		                        break;
		                    // Got DCC ACCEPT message (bot accepts the resume command)
		                    case "ACCEPT":
		                        // Check accept command params
		                        if (offer.filename == params[2] &&
		                            offer.port == parseInt(params[3], 10) &&
		                            offer.resumepos == parseInt(params[4], 10)) {
	
									//clear timeout for resume acceptance
									clearTimeout(offer.resumeTimer);
	
		                            // Download the file
		                            log.info("resume accepted");
		                            startDownload(true);
	
		                        }
		                        break;
		                }
		            }
	
				}
			};
			var startDownload = function(resumed)
			{
				ircClient.removeListener("ctcp-privmsg", onPrivmsg);
				signal.onAbort(function()
				{
					ircClient.say(xdccPackage.bot, "XDCC CANCEL");
				});
				log.info({resumed:resumed},"connect")
				if(resumed===false)
				{
					xdccPackage.crc=null;
					offer.resumepos=0;
					try
					{
						fs.unlinkSync(offer.location + options.fileSuffix);
					}
					catch (err){}//TODO handle error
				}
				
				xdccPackage.location=offer.location + options.fileSuffix;
				xdccPackage.progressMax=offer.filesize;
				xdccPackage.progressValue=xdccPackage.progressStart=offer.resumepos;
				xdccPackage.startTime=new Date();
				xdccPackage.updateTime=null;
				options.update(xdccPackage);
				
				var stream = fs.createWriteStream(xdccPackage.location, {flags: 'a'});
				stream.on("open", function ()
				{
	
		            var send_buffer = new Buffer(4);
		            var received = offer.resumepos;
		            var ack = offer.resumepos;
		            var crcBuilder=new SC.crc.Builder(xdccPackage.crc);
	
		            // Open connection to the bot
		            var conn = net.connect(offer.port, offer.ip, function ()
		            {
		                offer.updateInterval = setInterval(function()
		                {
		                	xdccPackage.progressValue=received;
		                	xdccPackage.updateTime=new Date();
		                    options.update(xdccPackage);
		                },options.progressInterval)
		                log.info("connected")
		            });
	
		            // Callback for data
		            conn.on("data", function (data)
		            {
		                received += data.length;
	
		                //support for large files
		                ack += data.length;
		                while (ack > 0xFFFFFFFF)
		                {
		                    ack -= 0xFFFFFFFF;
		                }
	
		                send_buffer.writeUInt32BE(ack, 0);
		                conn.write(send_buffer);
	
		                stream.write(data);

		                xdccPackage.crc=crcBuilder.add(data).get();
		            });
	
		            // Callback for completion
		            conn.on("end", function ()
		            {
		                // End the transfer
	
		                // Close writestream
		                stream.end();
		                clearInterval(offer.updateInterval);
		                xdccPackage.crc=crcBuilder.get();
	
		                var text="";
		                
		                // Connection closed
		                if (received == offer.filesize)
		                {// Download complete
		                	log.info("complete");
	                		text="CRC: ";
		                	var match=offer.filename.match(extractChecksum);
		                	if(match)
		                	{
		                		if(match[1].toUpperCase()===crcBuilder.getFormatted()) text+="OK";
		                		else text+="DIFFERENT -> "+crcBuilder.getFormatted();
		                	}
		                	else
		                	{
		                		text+=crcBuilder.getFormatted();
		                		if (options.appendCRC)
			                	{
			                		var t=path.parse(offer.location);
			                		xdccPackage.name=offer.filename=t.name+" ["+crcBuilder.getFormatted()+"]"+t.ext;
			                	}
		                	}
	                		if(xdccPackage.message.type!=="info") text=xdccPackage.message.text+"\n"+text;
	                		xdccPackage.message.text=text;
            				xdccPackage.state="Done";
		                    fs.rename(xdccPackage.location, xdccPackage.location=path.resolve(options.path,offer.filename));
                			options.update(xdccPackage);
                			options.update=µ.constantFunctions.ndef();
		                    signal.resolve();
		                }
		                else
		                {
		                	if (received != offer.filesize && !offer.finished)
			                {// Download incomplete
			                	text="Server unexpected closed connection";
			                }
			                else if (received != offer.filesize && offer.finished)
			                {// Download aborted
			                	text="Server closed connection, download canceled";
			                }
		                	log.error(text);
	                		if(xdccPackage.message.type!=="info") text=xdccPackage.message.text+"\n"+text;
	                		xdccPackage.message.text=text;
	                		xdccPackage.message.type="error";
            				xdccPackage.state="Failed";
                			options.update(xdccPackage);
                			options.update=µ.constantFunctions.ndef();
	                		signal.reject(text);
		                }
	
		                conn.destroy();
		            });
	
		            // Add error handler
		            conn.on("error", function (error)
		            {
		                // Close writestream
		                stream.end();
		                clearInterval(offer.updateInterval);
	
		                // Send error message
		                log.error({error:error},"download failed");
                		if(xdccPackage.message.type!=="info") xdccPackage.message.text+="\n"+error.message;
                		else xdccPackage.message.text=error.message;
                		xdccPackage.message.type="error";
        				xdccPackage.state="Failed";
            			options.update(xdccPackage);
            			options.update=µ.constantFunctions.ndef();
		                signal.reject(error.message);
		                // Destroy the connection
		                conn.destroy();
	
		            });
		        });
		        stream.on("error", function (error)
		        {
		            // Close writestream
		            stream.end();
	                clearInterval(offer.updateInterval);

	                log.error({error:error},"download failed");
            		if(xdccPackage.message.type!=="info") xdccPackage.message.text+="\n"+error.message;
            		else xdccPackage.message.text=error.message;
            		xdccPackage.message.type="error";
    				xdccPackage.state="Failed";
        			options.update(xdccPackage);
        			options.update=µ.constantFunctions.ndef();
	                signal.reject(error.message);
		        });
			};
			ircClient.on("ctcp-privmsg", onPrivmsg);
			signal.onAbort(function()
			{
				ircClient.removeListener("ctcp-privmsg", onPrivmsg);
				console.log("abort");
			});
			ircClient.say(xdccPackage.bot, "XDCC SEND " + xdccPackage.packnumber);
			offer.requestTimer=setTimeout(function()
			{
				ircClient.removeListener("ctcp-privmsg", onPrivmsg);
				log.warn("request timed out. end download.");
        		
				xdccPackage.message.text="request timeout";
        		xdccPackage.message.type="error";
    			options.update(xdccPackage);
    			options.update=µ.constantFunctions.ndef();
				signal.reject("request timeout");
				
			},options.timeout);
		});
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);