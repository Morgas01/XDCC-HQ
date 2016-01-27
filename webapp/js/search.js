(function(µ,SMOD,GMOD,HMOD,SC){

	var SC=SC({
		req:"request",
		tc:"TabContainer",
		sr:"SearchResult",
	});
	//TODO set µ.logger.out
	
	var container=document.createElement("div");
	container.id="search";
	document.currentScript.parentNode.insertBefore(container,document.currentScript.nextSibling);
	var form=document.createElement("form");
	container.appendChild(form);
	var search=document.createElement("input");
	form.appendChild(search);
	search.name=search.placeholder="search";
	search.type="text";
	var list=document.createElement("datalist");
	form.appendChild(list);
	search.setAttribute("list",list.id="searchHistory");
	
	
	//search
	var searchHistory=null;
	var updateSearchHistory=(function()
	{
		try
		{
			searchHistory=JSON.parse(localStorage.getItem("searchHistory"))||[];
		}
		catch(e)
		{
			µ.logger.info(list.innerHTML="localStorage not available");
		}
		return function(search)
		{
			if(searchHistory!=null)
			{
				if(search)
				{
					var index=searchHistory.indexOf(search);
					if(index!=-1) searchHistory.splice(index,1);
					searchHistory.unshift(search);
					searchHistory.length=Math.min(searchHistory.length,20);//max count
					localStorage.setItem("searchHistory",JSON.stringify(searchHistory));
				}
				list.innerHTML=searchHistory.map(s=>'<option value="'+s+'"></option>').join("\n");
			}
		}
	})();
	
	var tabContainer=null;
	form.addEventListener("submit",function(e)
	{
		e.preventDefault();
		var query=search.value;
		if(!tabContainer)
		{
			tabContainer=new SC.tc();
			container.appendChild(tabContainer.domElement);
		}
		var sr=new SC.sr(query);
		tabContainer.add(sr);
		if(this.checkValidity())SC.req.json({urls:["rest/search"],data:query}).then(function(data)
		{
			return sr.setData(data);
		},errorlogger);
		search.value="";
		updateSearchHistory(query);
		return false;
	});
	
	//utils
	var errorlogger=function(e)
	{
		µ.logger.error(e);
		throw e;
	}
	
	//execute
	updateSearchHistory();
	
	search.select();
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);