(function(µ,SMOD,GMOD,HMOD,SC){
	
	SC=SC({
		adopt:"adopt",
		gp:"goPath",
		org:"Organizer"
	});
	
	var createDownloadDom=function(download)
	{
		download.dom={element:document.createElement("fieldset")};
		download.dom.element.classList.add("download")
		download.dom.element.title=download.dom.element.dataset.state=download.state
		download.dom.element.innerHTML=
'\
<legend>'+download.name+'</legend>\
	<div>\
		<progress value="0" max="1"></progress>\
		<span class="speed"></span>\
		<span class="remaining"></span>\
	</div>\
<span class="location"></span>\
<span class="message"></span>\
';
		download.dom.progress  = download.dom.element.querySelector("progress");
		if(download.progress)
		{
			download.dom.progress.value       = download.progress[0];
			download.dom.progress.max         = download.progress[1];
		}
		download.dom.speed     = download.dom.element.querySelector(".speed");
		download.dom.remaining = download.dom.element.querySelector(".remaining");
		download.dom.location  = download.dom.element.querySelector(".location");
		if(download.location) download.dom.location.textContent = download.location;
		download.dom.message   = download.dom.element.querySelector(".message");
		if(download.msg)
		{
			download.dom.message.dataset.type = download.msg.type;
			download.dom.message.textContent  = download.msg.text;
		}
		return download.dom.element;
	}
	var updateDownloadDom=function(download)
	{
		download.dom.element.title=download.dom.element.dataset.state=download.state;
		if(download.lastUpdateTime)
		{
			console.log(JSON.stringify(download));
			var averageSpeed=download.progress[0]/(download.updateTime-download.startTime);
			console.log("avs",averageSpeed);
			var lastSpeed=(download.progress[0]-download.dom.progress.value)/(download.updateTime-download.lastUpdateTime);
			console.log("ls",lastSpeed);
			download.dom.speed.textContent=averageSpeed.toFixed(0)+" kb/s ( "+lastSpeed.toFixed(0)+" kb/s )";
			
			var averageRemaining=(download.progress[1]-download.progress[0])/averageSpeed;
			var lastRemaining=(download.progress[1]-download.progress[0])/lastSpeed;
			console.log("avr",averageRemaining);
			console.log("lr",lastRemaining);
			download.dom.remaining.textContent=new Date(averageRemaining-3600000).toLocaleTimeString()+" ( "+new Date(lastRemaining-3600000).toLocaleTimeString()+" )"
		}
		download.dom.progress.value       = download.progress[0];
		download.dom.progress.max         = download.progress[1];
		download.dom.message.dataset.type = download.msg.type;
		download.dom.location.textContent = download.location;
		download.dom.message.dataset.type = download.msg.type;
		download.dom.message.textContent  = download.msg.text;
	}
	
	var es=new EventSource("rest/download/get");
	es.addEventListener("error",µ.logger.error);
	
	es.addEventListener("list",function onList (listEvent)
	{
		es.removeEventListener("list", onList);
		
		var org=new SC.org()
		.map("id",SC.gp.guide("id"));
		
		var onAdd=function(download)
		{
			//TODO check for data.id in org
			org.add([download]);
			document.body.appendChild(createDownloadDom(download))
		};
		
		for(var d of JSON.parse(listEvent.data)) onAdd(d);
		
		es.addEventListener("add",function(addEvent)
		{
			var data=JSON.parse(addEvent.data)
			µ.logger.info("add",data.id);
			onAdd(data);
		});
		
		es.addEventListener("update",function(updateEvent)
		{
			var data=JSON.parse(updateEvent.data);
			µ.logger.info("update",data.id);
			var original=org.getMap("id")[data.id];
			if(!original)
			{
				original=data;
				onAdd(original)
			}
			else
			{
				original.lastUpdateTime=original.updateTime;
				SC.adopt(original,data,true);
			}
			updateDownloadDom(original);
		});
		
		es.addEventListener("remove",function(removeEvent)
		{
			var data=JSON.parse(removeEvent.data);
			µ.logger.info("remove",data.id);
			var original=org.getMap("id")[data.id];
			if(!original)console.error("could not find original")
			else
			{
				org.remove([original])
				original.dom.element.remove();
			}
		});
	});

	window.addEventListener("beforeunload",function(){es.close()})
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);