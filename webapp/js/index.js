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
	var updateConfig=function(data)
	{
		return SC.req.json({
			url:"rest/config",
			contentType:"application/json",
			data:JSON.stringify(data)
		}).then(function(config)
		{
			SC.sIn(document.querySelectorAll("#config table input"),config);
			return config;
		},errorlogger);
	}
	document.getElementById("config").addEventListener("change",function(e)
	{
		updateConfig(SC.gIn(this.querySelectorAll("table input")));
	});
	
	
	
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
	window.addEventListener("keyup",function(e)
	{
		if(e.ctrlKey&&e.code=="Space")
		{
			if(e.shiftKey)
			{
				window.scrollTo(0,0);
				document.querySelector("#searchForm input").select();
			}
			else
			{
				var filter=document.querySelector("#search .tabContainer > header.active + * input[name=filter]");
				filter&&filter.select();
			}
		}
	});
	
	//execute
	updateConfig();
	
	document.querySelector("#searchForm [name=search]").select();
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);