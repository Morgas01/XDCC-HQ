(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		action:"gui.actionize",
		downloadTable:"downloadTable",
		XDCCdownload:"XDCCdownload"
	});

	var actions=document.getElementById("actions");
	var stats=document.getElementById("stats");
	var downloads=document.getElementById("downloads");

	//TODO DB Errors

	SC.action({
		enable:function()
		{
			downloadTable.enable(downloadTable.getTable().getSelected());
		},
		disable:function()
		{
			downloadTable.disable(downloadTable.getTable().getSelected());
		},
		remove:function(){},
		removeDone:function(){},
		removeDisabled:function(){},
		removeError:function(){},
		addDownload:function(){},
		listFilenames:function(){},
	},actions);

	var downloadTable=SC.downloadTable(SC.downloadTable.baseColumns.concat([
		function sources(cell,data)
		{
			cell.textContent=data.sources.map(s=>s.bot+"@"+s.network).join(" ");
			cell.dataset.title=data.sources.map(s=>s.network+"/"+s.channel+" - "+s.bot+":"+s.packnumber+" ("+s.subOffices+")").join("\n");
		}
	]),{
		DBClasses:[SC.XDCCdownload]
	});
	downloads.appendChild(downloadTable.getContainer());

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);