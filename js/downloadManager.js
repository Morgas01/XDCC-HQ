(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		action:"gui.actionize",
		downloadTable:"downloadTable",
		XDCCdownload:"XDCCdownload",
		rq:"request",
		checkDB:"checkDbErrors"
	});

	var actions=document.getElementById("actions");
	var stats=document.getElementById("stats");
	var downloads=document.getElementById("downloads");

	//TODO DB Errors
	SC.checkDB()
	.then(function()
	{

		SC.action({
			enable:function()
			{
				downloadTable.enable(downloadTable.getTable().getSelected());
			},
			disable:function()
			{
				downloadTable.disable(downloadTable.getTable().getSelected());
			},
			remove:function()
			{
				downloadTable.delete(downloadTable.getTable().getSelected());
			},
			removeDone:function()
			{
				SC.rq({
					url:"rest/downloads/deleteByState",
					data:JSON.stringify("DONE"),
					method:"DELETE"
				});
			},
			removeDisabled:function()
			{
				SC.rq({
					url:"rest/downloads/deleteByState",
					data:JSON.stringify("DISABLED"),
					method:"DELETE"
				});
			},
			removeError:function()
			{
				SC.rq({
					url:"rest/downloads/deleteByState",
					data:JSON.stringify("ERROR"),
					method:"DELETE"
				});
			},
			listFilenames:function()
			{
				var items=downloadTable.getTable().getSelected();

			},
			addDownload:function(){},
		},actions);
	});

	var downloadTable=SC.downloadTable(SC.downloadTable.baseColumns.concat([
		function sources(cell,data)
		{
			cell.textContent=data.sources.map(s=>s.bot+"@"+s.network).join(" ");
			cell.dataset.title=data.sources.map(s=>s.network+"/"+s.channel+" - "+s.bot+":"+s.packnumber+" ("+s.subOffices+")").join("\n");
		}
	]),{
		apiPath:"rest/downloads/manager",
		DBClasses:[SC.XDCCdownload]
	});
	downloads.appendChild(downloadTable.getContainer());

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);