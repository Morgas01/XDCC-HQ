(function(µ,SMOD,GMOD,HMOD,SC){
	
	var Tab=GMOD("Tab");
	var goPath=GMOD("goPath");
	
	SC=SC({
		org:"Organizer",
		rs:"rescope",
		rq:"request",
		it:"iterate"
	});
	
	//TODO var fields=[]
	
	var guides={
		network:goPath.guide("network"),
		channel:goPath.guide("channel"),
		bot:goPath.guide("bot"),
		name:goPath.guide("name"),
		packnumber:p=>parseInt(p.packnumber,10)||p.packnumber,
		size:p=>parseFloat(p.size.replace(/K$/i,"e-3").replace(/G$/i,"e+3"))||p.size,
		subber:p=>
		{
			var m=p.name.match(/^\[([^\]]+)/);
			if(m)return m[1];
			return "no subber found";
		}
	};
	
	var SR=µ.Class(Tab,{
		init:function(header,results)
		{
			this.mega(header);
			SC.rs.all(this,["_onFilter","_onListClick","_onListMouseDown","_onAction","updateFilters"]);
			
			this.org=new SC.org(results);
			for(var g in guides) this.org.sort(g,SC.org.sortGetter(guides[g]));

			var groups=["subber","bot","network"];
			for(var g of groups) this.org.group(g,guides[g]);
			
			this.sortColumn=null;
			this.desc=false;
			this.filterExp=null;
			
			this.content.classList.add("searchResult");
			var contentHTML='\
<div class="control">\
	<form><input type="text" name="filter" placeholder="filter"><button type="submit">filter</button></form>\
	<div class="actions">\
		<button data-action="showSelected">show selected</button>\
		<button data-action="download">download</button>\
	</div>\
</div>\
<div class="resultList">\
	<header style="order:-1;">\
		<span class="col-network">network</span>\
		<span class="col-channel">channel</span>\
		<span class="col-bot">bot</span>\
		<span class="col-name">name</span>\
		<span class="col-packnumber">packnumber</span>\
		<span class="col-size">size</span>\
	</header>\n'+
	results.map((r,i)=>'<div data-index="'+i+'">'+
		'<span class="col-network" title="'+r.network+'">'+r.network+'</span>'+
		'<span class="col-channel" title="'+r.channel+'">'+r.channel+'</span>'+
		'<span class="col-bot" title="'+r.bot+'">'+r.bot+'</span>'+
		'<span class="col-name" title="'+r.name+'">'+r.name+'</span>'+
		'<span class="col-packnumber" title="'+r.packnumber+'">'+r.packnumber+'</span>'+
		'<span class="col-size" title="'+r.size+'">'+r.size+'</span>'+
	'</div>').join("\n")+'\
</div>\
<div class="filters">\n';
	for(var g of groups)
	{
		var parts=Object.keys(this.org.getGroup(g));
		contentHTML+='<fieldset><legend>'+g+'</legend><select data-group="'+g+'" multiple="true">'+
			parts.map(p=>'<option value="'+p+'">'+p+'</option>').join("\n")+
		'</select></fieldset>';
	}
+'</div>';

			this.content.innerHTML=contentHTML;
			this.content.querySelector("form").addEventListener("submit",this._onFilter);
			this.content.querySelector(".actions").addEventListener("click",this._onAction);
			this.content.querySelector(".filters").addEventListener("change",this.updateFilters);
			this.resultList=this.content.querySelector(".resultList");
			this.resultList.addEventListener("click",this._onListClick);
			this.resultList.addEventListener("mousedown",this._onListMouseDown);
			
			this.sort("name",false);
		},
		_onFilter:function(e)
		{
			e.preventDefault();
			this.filter(e.target.filter.value);
			return false;
		},
		filter:function(filter)
		{
			if(filter)
			{
				this.filterExp=filter.toUpperCase();
				if(!this.org.hasFilter(this.filterExp))
				{
					var exp=new RegExp(this.filterExp.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\s+/g,".*"),"i");
					this.org.filter(this.filterExp,a=>exp.test(a.name));
				}
			}
			else this.filterExp=null;
			this.updateFilters();
		},
		_onListClick:function(e)
		{
			var row=e.target;
			while(row.parentNode&&row.parentNode!=this.resultList)row=row.parentNode;
			if(row.parentNode)
			{
				if(row.tagName==="HEADER")
				{
					this.sort(e.target.textContent);
				}
				else
				{
					if(!e.ctrlKey)
					{
						var selected=this.resultList.querySelectorAll(".selected");
						for(var i=0;i<selected.length;i++)selected[i].classList.remove("selected");
					}
					row.classList.toggle("selected");
				}
			}
			e.preventDefault();
			return false;
		},
		_onListMouseDown:function(downEvent)
		{
			var row=downEvent.target;
			while(row.parentNode&&row.parentNode!=this.resultList)row=row.parentNode;
			if(row.parentNode)
			{
				if(row.tagName==="DIV")
				{
					var onMove=moveEvent=>
					{
						this.resultList.removeEventListener("mousemove",onMove);
						row.classList.add("selected");
						
						var onMouseOver=overEvent=>
						{
							var hoverRow=overEvent.target;
							while(hoverRow.parentNode&&hoverRow.parentNode!=this.resultList)hoverRow=hoverRow.parentNode;
							if(hoverRow.parentNode) hoverRow.classList.add("selected");
						};
						var onMouseUp=()=>
						{
							this.resultList.removeEventListener("mouseover",onMouseOver);
							this.resultList.removeEventListener("mouseup",onMouseUp);
						};
						this.resultList.addEventListener("mouseover",onMouseOver);
						this.resultList.addEventListener("mouseup",onMouseUp);
						
						moveEvent.preventDefault();
						return false;
					};
					var onClick=()=>
					{
						this.resultList.removeEventListener("mousemove",onMove);
						this.resultList.removeEventListener("click",onClick);
					}
					this.resultList.addEventListener("mousemove",onMove);
					this.resultList.addEventListener("click",onClick);
				}
				downEvent.preventDefault();
				return false;
			}
		},
		sort:function(column,desc)
		{
			if(this.sortColumn==column&&arguments.length==1) desc=!this.desc;
			this.sortColumn=column;
			this.desc=desc;
			var order=this.org.getIndexSort(this.sortColumn);
			if(this.desc)order.reverse();
			for(var i=0;i<order.length;i++)
			{
				this.resultList.children[order[i]+1].style.order=i;
			}
		},
		getSelected:function()
		{
			return Array.map(this.content.querySelectorAll(".selected"),e=>this.org.values[e.dataset.index]);
		},
		updateFilters:function()
		{
			var c=this.org.combine(false,this.sortColumn);
			if(this.filterExp)c.filter(this.filterExp);
			Array.forEach(this.content.querySelectorAll(".filters select"),s=>
			{
				var options=s.querySelectorAll(":checked");
				if(options.length>0)
				{
					var sc=this.org.combine(true);
					Array.forEach(options,e=>sc.group(s.dataset.group,e.value));
					c.combine(sc);
				}
			});
			Array.forEach(c.getIndexes(false),index=>this.resultList.children[index+1].classList.remove("hidden"));
			Array.forEach(c.getIndexes(true),index=>this.resultList.children[index+1].classList.add("hidden"));
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
			var content=document.createElement("div");
			content.classList.add("content");
			dialog.appendChild(content);
			var textArea=document.createElement("textarea");
			textArea.cols=100;
			textArea.rows=10;
			content.appendChild(textArea);
			
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
			content.appendChild(closeBtn);
			
			document.body.appendChild(dialog);
			textArea.select();
		},
		download:function()
		{
			SC.rq({
				urls:["rest/download/add"],
				contentType:"application/json",
				data:JSON.stringify(this.getSelected()),
				scope:this
			}).then(function()
			{
				var dialog=document.createElement("div");
				dialog.classList.add("dialog");
				var content=document.createElement("div");
				content.classList.add("content");
				dialog.appendChild(content);
				content.innerHTML="<div>successfully added packaged to download queue</div>";
				
				var gotoDownloads=document.createElement("a");
				gotoDownloads.href="downloadManager.html";
				gotoDownloads.target="_blank";
				gotoDownloads.textContent="go to downloads";
				gotoDownloads.addEventListener("click",function()
				{
					dialog.remove();
				});
				content.appendChild(gotoDownloads);
				
				var closeBtn=document.createElement("button");
				closeBtn.textContent="close";
				closeBtn.addEventListener("click",function()
						{
					dialog.remove();
						});
				content.appendChild(closeBtn);
				
				document.body.appendChild(dialog);
				closeBtn.focus();
			})
		}
	});
	
	SMOD("SearchResult",SR);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);