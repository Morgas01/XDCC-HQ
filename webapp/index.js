(function(µ,SMOD,GMOD,HMOD,SC){

	var SC=SC({
		req:"request",
		gIn:"getInputValues",
		sIn:"setInputValues",
		sr:"SearchResult"
	});
	//TODO set µ.logger.out
	
	//config
	var updateConfig=function()
	{
		return SC.req.json("rest/config").then(function(config)
		{
			SC.sIn(document.querySelectorAll("#config input"),config);
			return config;
		},errorlogger);
	}
	
	
	
	//search
	document.getElementById("searchForm").addEventListener("submit",function(e)
	{
		e.preventDefault();
		if(this.checkValidity())SC.req.json({url:"rest/search",data:this.search.value}).then(function(results)
		{
			document.getElementById("search").appendChild(new SC.sr(results).domElement);
		},errorlogger);
		return false;
	});
	
	//utils
	var errorlogger=function(e)
	{
		µ.logger.error(e);
		throw e;
	}
	
	//execute
	updateConfig();
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);