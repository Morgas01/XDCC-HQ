(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		action:"gui.actionize",
		TreeTableData:"gui.TreeTableData",
		selectionTable:"gui.selectionTable",
		XDCCdownload:"Download",
		OCON:"ObjectConnector"
	});

	var actions=document.getElementById("actions");
	var stats=document.getElementById("stats");
	var downloads=document.getElementById("downloads");

	//TODO DB Errors

	SC.action({
		remove:function(){},
		removeDone:function(){},
		removeDisabled:function(){},
		removeError:function(){},
		addDownload:function(){},
		listFilenames:function(){},
	},actions);

	var ocon=new SC.OCON();

	var es=new EventSource("event/downloads");
	window.addEventListener("beforeunload",function(){es.close()})
	es.addEventListener("error",µ.logger.error);
	es.addEventListener("ping",µ.logger.debug);

	es.addEventListener("init",function(event)
	{
		ocon.db.add(JSON.parse(event.data));
		ocon.load(SC.XDCCdownload,d=>d.packageID==null)
		.then(data=>
		{
			var table=SC.selectionTable(new SC.TreeTableData(data,[
				"name",
				{
					name:"filesize",
					fn:function(cell,data)
					{
						cell.textContent=SC.XDCCdownload.formatFilesize(data.filesize);
					}
				},
				{
					name:"progress",
					fn:function(cell,data)
					{
						cell.innerHTML="<progress></progress>";
					}
				},
				{
					name:"speed",
					fn:function(cell,data)
					{
						cell.textContent="? kb/s";
					}
				},
				{
					name:"sources",
					fn:function(cell,data)
					{
						cell.textContent=data.sources.map(s=>s.bot+"@"+s.network).join(" ");
						cell.dataset.title=data.sources.map(s=>s.network+"/"+s.channel+" - "+s.bot+":"+s.packnumber+" ("+s.subOffices+")").join("\n");
					}
				}
			]),null,function(row,data)
			{
				row.dataset.id=data.ID;
			});
			table.noInput=true;
			SC.selectionTable.selectionControl(table);
			downloads.appendChild(table);
		});
	});
	es.addEventListener("add",function()
	{
		var data=JSON.parse(event.data);
	});
	es.addEventListener("remove",function()
	{
		var data=JSON.parse(event.data);
	});
	es.addEventListener("update",function()
	{
		var data=JSON.parse(event.data);
	});

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);