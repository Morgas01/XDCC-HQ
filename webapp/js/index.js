(function(µ,SMOD,GMOD,HMOD,SC){

	var SC=SC({
		req:"request",
		tc:"TabContainer",
		sr:"SearchResult",
	});
	//TODO set µ.logger.out
	
	
	
	//search
	var searchHistory=null;
	var updateSearchHistory=(function()
	{
		var dom=document.getElementById("searchHistory");
		try
		{
			searchHistory=JSON.parse(localStorage.getItem("searchHistory"))||[];
		}
		catch(e)
		{
			µ.logger.info(dom.innerHTML="localStorage not available");
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
				dom.innerHTML=searchHistory.map(s=>'<option value="'+s+'"></option>').join("\n");
			}
		}
	})();
	
	var tabContainer=null;
	document.getElementById("searchForm").addEventListener("submit",function(e)
	{
		e.preventDefault();
		var search=this.search.value;
		if(!tabContainer)
		{
			tabContainer=new SC.tc();
			document.getElementById("search").appendChild(tabContainer.domElement);
		}
		var sr=new SC.sr(search);
		tabContainer.add(sr);
		if(this.checkValidity())SC.req.json({urls:["rest/search"],data:search}).then(function(data)
		{
			sr.setData(data);
		},errorlogger);
		updateSearchHistory(search);
		this.search.value="";
		this.search.focus();
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
		if(e.code=="Escape")
		{
			window.scrollTo(0,0);
			document.querySelector("#searchForm input").select();
		}
	},false);
	
	//execute
	updateSearchHistory();
	
	document.querySelector("#searchForm [name=search]").select();
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);