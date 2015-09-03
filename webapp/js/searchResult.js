(function(µ,SMOD,GMOD,HMOD,SC){
	
	var goPath=GMOD("goPath");
	
	SC=SC({
		org:"Organizer",
		rs:"rescope"
	});
	
	//TODO var fields=[]
	
	var guides={
		network:goPath.guide("network"),
		channel:goPath.guide("channel"),
		bot:goPath.guide("bot"),
		name:goPath.guide("name"),
		packnumber:goPath.guide("packnumber"),
		size:goPath.guide("size")
	};
	var SR=µ.Class({
		init:function(results)
		{
			SC.rs.all(this,["_onFilter","_onSelect","_onSort"])
			this.org=new SC.org(results);
			for(var g in guides) this.org.sort(g,SC.org.sortGetter(guides[g]));
			
			this.org.group("network",guides.network);
			this.org.group("bot",guides.bot);
			
			this.sort="name";
			this.desc=false;
			this.domElement=document.createElement("div");
			this.domElement.classList.add("searchResult");
			this.domElement.innerHTML=""+
			'<form><input type="text name="filter" placeholder="filter"><button type="submit">filter</button></form>'+
			'<table>'+
				'<thead>'+
					'<tr>'+
						'<th>network</th>'+
						'<th>channel</th>'+
						'<th>bot</th>'+
						'<th>name</th>'+
						'<th>packnumber</th>'+
						'<th>size</th>'+
					'</tr>'+
				'</thead>'+
				'<tbody></tbody>'+
			'</table>';
			this.domElement.childNodes[0].addEventListener("submit",this._onFilter);
			

			var thead=this.domElement.querySelector("thead");
			thead.addEventListener("click",this._onSort)
			
			var itemsHtml=results.map((r,i)=>'<tr data-index="'+i+'">'+
				'<td>'+r.network+'</td>'+
				'<td>'+r.channel+'</td>'+
				'<td>'+r.bot+'</td>'+
				'<td>'+r.name+'</td>'+
				'<td>'+r.packnumber+'</td>'+
				'<td>'+r.size+'</td>'+
			'</tr>').join("\n");
			var tbody=this.domElement.querySelector("tbody");
			tbody.innerHTML=itemsHtml;
			tbody.addEventListener("click",this._onSelect)
		},
		_onFilter:function(e)
		{
			e.preventDefault();
			this.filter(e.filter.value);
			return false;
		},
		filter:function(filter)
		{
			//TODO
		},
		_onSelect:function(e)
		{
			var tr=e.target;
			while(tr&&tr.tagName!=="TR")tr=tr.parentNode;
			if(tr)
			{
				if(!e.ctrlKey)
				{
					var selected=this.domElement.querySelectorAll(".selected");
					for(var i=0;i<selected.length;i++)selected[i].classList.remove("selected");
				}
				tr.classList.toggle("selected");
				e.preventDefault();
			}
		},
		_onSort:function(e)
		{
			if(e.target.tagName==="TH")this.sort(e.target.textContent)
		},
		sort:function(column)
		{
			//TODO
		}
	});
	
	SMOD("SearchResult",SR);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);