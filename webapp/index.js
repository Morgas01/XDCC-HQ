(function(µ,SMOD,GMOD,HMOD,SC){

	var SC=SC({
		req:"request",
		gIn:"getInputValues",
		sIn:"setInputValues",
		tc:"TabContainer",
		sr:"SearchResult",
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
	var tabContainer=null;
	document.getElementById("searchForm").addEventListener("submit",function(e)
	{
		e.preventDefault();
		var search=this.search.value;
		if(this.checkValidity())SC.req.json({urls:["rest/search"],data:search}).then(function(results)
		{
			if(!tabContainer)
			{
				tabContainer=new SC.tc();
				document.getElementById("search").appendChild(tabContainer.domElement);
			}
			tabContainer.add(new SC.sr(search,results));
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