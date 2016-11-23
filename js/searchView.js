(function(µ,SMOD,GMOD,HMOD,SC){
	SC=SC({
		tabs:"gui.tabs"
	});
	var tabs=SC.tabs([]);
	document.body.appendChild(tabs)
	window.addEventListener("message", function(event)
	{
		tabs.addTab(e=>e.innerHTML=String.raw
`
<span>${event.data}</span>
<botton data-action="closeTab">&#10060;</button>
`
		,JSON.stringify(event.data,null,"\t"),true);

	},false);
/*
	var searchHistory=GMOD("inputHistory")("searchHistory",20);
	
	var SC=SC({
		tc:"TabContainer",
		sr:"SearchResult",
	});
	//TODO set µ.logger.out
	
	var container=document.createElement("div");
	container.id="searchView";
	document.currentScript.parentNode.insertBefore(container,document.currentScript.nextSibling);
	var form=document.createElement("form");
	container.appendChild(form);
	var search=document.createElement("input");
	search.name=search.placeholder="search";
	search.pattern="\\S.*";
	search.required=true;
	form.appendChild(search);
	var searchBtn=document.createElement("button");
	searchBtn.textContent="\uD83D\uDD0D"
	form.appendChild(searchBtn);
	search.type="text";
	var list=document.createElement("datalist");
	form.appendChild(list);
	search.setAttribute("list",list.id="searchHistory");
	
	
	//search
	var updateList=function(history)
	{
		list.innerHTML=history.map(s=>'<option value="'+s+'"></option>').join("\n");
	};
	
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
		tabContainer.setActive(sr);
		search.value="";
		requestAnimationFrame(()=>updateList(searchHistory.update(query)));
		return false;
	});
	
	//execute
	updateList(searchHistory.history);
	
	search.select();
*/
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);