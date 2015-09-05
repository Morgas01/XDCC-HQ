(function(µ,SMOD,GMOD,HMOD,SC){
	
	var Tab=GMOD("Tab");
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
	var SR=µ.Class(Tab,{
		init:function(header,results)
		{
			this.mega(header);
			SC.rs.all(this,["_onFilter","_onSelect","_onSort","_onAction"]);
			
			this.org=new SC.org(results);
			for(var g in guides) this.org.sort(g,SC.org.sortGetter(guides[g]));
			
			this.org.group("network",guides.network);
			this.org.group("bot",guides.bot);
			
			this.sort="name";
			this.desc=false;
			this.content.classList.add("searchResult");
			var contentHTML='\
<div>\
	<form><input type="text name="filter" placeholder="filter"><button type="submit">filter</button></form>\
	<div class="actions">\
		<button data-action="showSelected">show selected</button>\
	</div>\
</div>\
<table class="resultList">\
	<thead>\
		<tr>\
			<th>network</th>\
			<th>channel</th>\
			<th>bot</th>\
			<th>name</th>\
			<th>packnumber</th>\
			<th>size</th>\
		</tr>\
	</thead>\
	<tbody></tbody>\
</table>\
<div class="filters"></div>';
			this.content.innerHTML=contentHTML;
			this.content.querySelector("form").addEventListener("submit",this._onFilter);
			this.content.querySelector(".actions").addEventListener("click",this._onAction);
			

			var thead=this.content.querySelector("thead");
			thead.addEventListener("click",this._onSort)
			
			var itemsHtml=results.map((r,i)=>'<tr data-index="'+i+'">'+
				'<td>'+r.network+'</td>'+
				'<td>'+r.channel+'</td>'+
				'<td>'+r.bot+'</td>'+
				'<td>'+r.name+'</td>'+
				'<td>'+r.packnumber+'</td>'+
				'<td>'+r.size+'</td>'+
			'</tr>').join("\n");
			var tbody=this.content.querySelector("tbody");
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
					var selected=this.content.querySelectorAll(".selected");
					for(var i=0;i<selected.length;i++)selected[i].classList.remove("selected");
				}
				tr.classList.toggle("selected");
				e.preventDefault();
				return false;
			}
		},
		_onSort:function(e)
		{
			if(e.target.tagName==="TH")this.sort(e.target.textContent)
		},
		sort:function(column)
		{
			//TODO
		},
		getSelected:function()
		{
			return Array.map(this.content.querySelectorAll(".selected"),e=>this.org.values[e.dataset.index]);
		},
		_onAction:function(e)
		{
			if(e.target.dataset.action)
			{
				var action=e.target.dataset.action;
				if(action in this)this[action]();
				else µ.logger.warn(new µ.Warning("unknown Action "+action,e));
			}
		},
		showSelected:function()
		{
			var dialog=document.createElement("div");
			dialog.classList.add("dialog");
			var textArea=document.createElement("textarea");
			textArea.cols=100;
			textArea.rows=10;
			dialog.appendChild(textArea);
			
			var o=new SC.org(this.getSelected()).group("network",guides.network,function(child){child.group("bot",guides.bot)});
			var networks=o.getGroup("network");
			for(var n in networks)
			{
				var bots=networks[n].getGroupValues("bot");
				for(var b in bots)
				{
					var bot=bots[b];
					var chan=n+"/"+bot[0].channel+"\n";
					if(textArea.value.indexOf(chan)===-1)textArea.value+=chan;
					textArea.value+="/msg "+b+" XDCC BATCH "+bot.map(p=>p.packnumber).join(",")+"\n";
				}
			}
			var closeBtn=document.createElement("button");
			closeBtn.textContent="close";
			closeBtn.addEventListener("click",function()
			{
				dialog.remove();
			});
			dialog.appendChild(closeBtn);
			
			document.body.appendChild(dialog);
		}
	});
	
	SMOD("SearchResult",SR);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);