(function(µ,SMOD,GMOD,HMOD,SC){
	
	SC=SC({
		adopt:"adopt",
		gp:"goPath",
		org:"Organizer",
		rq:"request",
		xp:"XDCCPackage"
	});
	
	var pauseBtn=document.getElementById("pause");
	var updatePuseBtn=function(pause)
	{
		if(pause) pauseBtn.textContent=pauseBtn.dataset.action="continue";
		else pauseBtn.textContent=pauseBtn.dataset.action="pause";
	};
	pauseBtn.addEventListener("click",function()
	{
		SC.rq.json("rest/download/pause?action="+pauseBtn.dataset.action);
	});
	
	
	document.getElementById("removeDone").addEventListener("click",function()
	{
		SC.rq("rest/download/removeDone");
	});
	
	
	
	var es=new EventSource("rest/download/get");
	es.addEventListener("error",µ.logger.error);
	
	es.addEventListener("list",function onList (listEvent)
	{
		es.removeEventListener("list", onList);
		
		var org=new SC.org()
		.map("ID","ID");
		
		var onAdd=function(download)
		{
			//TODO check for data.id in org
			download=new SC.xp().fromJSON(download);
			org.add([download]);
			document.body.appendChild(download.getDom().element);
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