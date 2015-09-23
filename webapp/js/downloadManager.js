(function(µ,SMOD,GMOD,HMOD,SC){
	
	var ORG=GMOD("Organizer");
	SC=SC({
		adopt:"adopt",
		gp:"goPath",
		rq:"request",
		xp:"XDCCPackage"
	});
	
	var org=new ORG()
	.map("ID","ID");

	var pauseBtn=document.querySelector("[data-action=pause]");
	var updatePuseBtn=function(pause)
	{
		if(pause) pauseBtn.textContent=pauseBtn.dataset.value="continue";
		else pauseBtn.textContent=pauseBtn.dataset.value="pause";
	};
	var controlActions={
		pause:function(e)
		{
			SC.rq.json("rest/download/pause?action="+pauseBtn.dataset.value);
		},
		removeDone:function()
		{
			SC.rq("rest/download/removeDone");
		},
		listFilenames:function()
		{
			openDialog('<textArea rows="26" cols="100">'+org.getValues().map(p=>p.name).join("\n")+'</textArea>')
		}
	};
	document.getElementById("control").addEventListener("click",function(e)
	{
		if(e.target.dataset.action in controlActions)
		{
			controlActions[e.target.dataset.action](e);
		}
	});

	var downloadsContainer=document.getElementById("downloads");
	downloadsContainer.addEventListener("click",function(e)
	{
		var action=e.target.dataset.action;
		if(action)
		{
			var downloadID=e.target.parentNode.parentNode.parentNode.dataset.downloadId;
			SC.rq.json("rest/download/"+action+"?ID="+downloadID).then(µ.logger.info,µ.logger.error);
		}
	});
	
	
	var es=new EventSource("rest/download/get");
	es.addEventListener("error",µ.logger.error);
	
	es.addEventListener("list",function onList (listEvent)
	{
		es.removeEventListener("list", onList);
		
		var onAdd=function(download)
		{
			//TODO check for data.id in org
			download=new SC.xp().fromJSON(download);
			org.add([download]);
			downloadsContainer.appendChild(download.getDom().element);
		};
		
		for(var d of JSON.parse(listEvent.data)) onAdd(d);
		
		es.addEventListener("add",function(addEvent)
		{
			var data=JSON.parse(addEvent.data)
			µ.logger.info("add",data.ID);
			onAdd(data);
		});
		
		es.addEventListener("update",function(updateEvent)
		{
			var data=JSON.parse(updateEvent.data);
			µ.logger.info("update",data.ID);
			var original=org.getMap("ID")[data.ID];
			if(!original) onAdd(data)
			else
			{
				original.update(data);
				org.update([original]);
			}
		});
		
		es.addEventListener("remove",function(removeEvent)
		{
			var data=JSON.parse(removeEvent.data);
			µ.logger.info("remove",data);
			var idMap=org.getMap("ID");
			for(var id of data)
			{
				var original=idMap[id];
				if(!original)µ.logger.error("could not find original")
				else
				{
					org.remove([original])
					original.dom.element.remove();
				}
			}
		});
	});
	es.addEventListener("pause",function(pauseEvent)
	{
		updatePuseBtn(JSON.parse(pauseEvent.data));
	});
	window.addEventListener("beforeunload",function(){es.close()})
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);