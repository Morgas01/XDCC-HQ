(function(µ,SMOD,GMOD,HMOD,SC){

	var SC=SC({
	    Config:"Config",
	    form:"gui.form",
	    rq:"request"
	});

	var searchWrapper=document.getElementById("searchWrapper");

	var searchForm=SC.form({
	   type:"array",
	   model:{
		   type:"string",
		   pattern:/.+/
	   },
	   default:[""]
	}, undefined,"Search");
	searchForm.id="searchForm";
	searchWrapper.appendChild(searchForm);

	var searchSources;
	SC.rq.json("rest/config").then(function(data)
	{
		var sourcesConfig={};
		for(var sourceName in data["search sources"])
		{
			sourcesConfig[sourceName]={
				type:"boolean",
				default:data["search sources"][sourceName]
			};
		}
		searchSources=SC.form(sourcesConfig,undefined,"Sources");
		searchSources.id="searchSources";
		searchSources.classList.add("hidden");
		searchWrapper.appendChild(searchSources);
		searchSources.firstChild.addEventListener("click",function()
		{
			searchSources.classList.toggle("hidden")
		})
	})

	document.getElementById("searchBtn").addEventListener("click",function()
	{
	    if(searchForm.isValid())
	    {

	        var data={query:searchForm.getConfig().get()};
	        if(!searchSources.classList.contains("hidden"))
	        {
	        	data.sources=Array.from(searchSources.querySelectorAll("input:checked")).map(e=>e.name);
	        }
	        document.getElementById("searchFrame").contentWindow.postMessage(data,"*");
	    }
	})
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);