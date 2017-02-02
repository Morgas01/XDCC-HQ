(function(µ,SMOD,GMOD,HMOD,SC){

	var SC=SC({
	    Config:"Config",
	    form:"gui.form",
	    rq:"request",
	    dialog:"gui.dialog",
	    checkDB:"checkDbErrors"
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
	var firstInput=searchForm.querySelector("input")
	firstInput.accessKey="f";
	firstInput.title="Accesskey F";
	firstInput.autofocus=true;
	searchWrapper.appendChild(searchForm);

	var searchSources;
	SC.rq.json("rest/config").then(function(data)
	{
		var sourcesConfig={};
		for(var sourceName in data["search sources"])
		{
			sourcesConfig[sourceName]={
				type:"boolean",
				default:false
			};
		}
		searchSources=SC.form(sourcesConfig,undefined,"Sources");
		searchSources.id="searchSources";
		searchSources.classList.add("hidden");
		searchWrapper.appendChild(searchSources);
		searchSources.firstElementChild.addEventListener("click",function()
		{
			searchSources.classList.toggle("hidden")
		})
	});

	var searchBtn=document.getElementById("searchBtn");
	searchForm.addEventListener("keydown",function(e)
	{
		if(e.code=="Enter")
		{
			searchBtn.focus();
			//searchBtn.click();
		}
	});
	searchBtn.addEventListener("click",function()
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
	});


	document.getElementById("configBtn").addEventListener("click",function()
	{
	    SC.dialog(function(element)
	    {
	    	element.id="configDialog";
	    	element.classList.add("request");
			var closeBtn=document.createElement("button");
			closeBtn.textContent="ok";
			closeBtn.dataset.action="close";
			closeBtn.autofocus=true;
			element.appendChild(closeBtn);
	    	SC.rq.json({
	    		method:"OPTIONS",
	    		url:"rest/config"
			}).then(function(data)
			{
				element.classList.remove("request");
				element.insertBefore(SC.form(data.description,data.value),closeBtn);
				element.addEventListener("formChange",function(event)
				{
					SC.rq({
						url:"rest/config",
						data:JSON.stringify({
							key:event.detail.path.concat(event.detail.key),
							value:event.detail.value
						})
					})
				});
			});
	    },{modal:true});
	});

	SC.checkDB();
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);