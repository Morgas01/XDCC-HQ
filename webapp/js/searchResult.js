(function(µ,SMOD,GMOD,HMOD,SC){
	
	var Tab=GMOD("Tab");
	var goPath=GMOD("goPath");
	
	SC=SC({
		org:"Organizer",
		rs:"rescope",
		rq:"request",
		it:"iterate",
		itAs:"iterateAsync"
	});
	
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
	var groups=["subber","bot","network"];
	var uniqueNames=function(item)
	{
		return this.values.map(i=>this.getValue(i).name).indexOf(item.name)==-1;
	};
	
	var SR=µ.Class(Tab,{
		init:function(header)
		{
			this.mega(header);
			SC.rs.all(this,["_onFilter","_onListClick","_onListMouseDown","_onAction","updateFilters"]);
			
			this.org=new SC.org();
			for(var g in guides) this.org.sort(g,SC.org.sortGetter(guides[g]));
			for(var g of groups) this.org.group(g,guides[g]);
			this.org.filter("uniqueNames",uniqueNames);
			this.errors=[];
			
			this.sortColumn=null;
			this.desc=false;
			this.filterExp=null;
			
			this.content.classList.add("searchResult","pending");
		},
		setData:function(data)
		{
			this.errors=data.errors;
			this.errors.sort(SC.org.sortGetter(goPath.guide("subOffice")));
			
			var contentHTML='\
<div class="errors">\n'+
	this.errors.map(e=>'\
	<div>\
		<span>'+e.subOffice+'</span>\
		<span>'+e.error.message+'</span>\
	</div>\
	<pre>'+e.error.stack+'</pre>').join("\n")+'\
</div>\
<div class="control">\
	<form><input type="text" name="filter" placeholder="filter"><button type="submit">filter</button></form>\
	<div class="actions">\
		<button data-action="showSelected">show selected</button>\
		<button data-action="selectBots">change bot for selected</button>\
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
	</header>\
</div>\
<div class="filters">\
	<label><input type="checkbox" name="uniqueNames">unique names</label>\n'+
	groups.map(g=>'\
	<fieldset>\
		<legend>'+g+'</legend>\
		<select data-group="'+g+'" multiple="true"></select>\
	</fieldset>\
	').join("\n")+
'</div>';
			this.content.innerHTML=contentHTML;
			this.resultList=this.content.querySelector(".resultList");
			SC.itAs(data.results,function(r,i)
			{
				this.org.add([r]);
				var row=document.createElement("div");
				row.dataset.index=i;
				
				["network","channel","bot","name","packnumber","size"].forEach(k=>{
					var col=document.createElement("span");
					col.classList.add("col-"+k);
					col.title=col.textContent=r[k];
					row.appendChild(col);
				});
				this.resultList.appendChild(row);
				
			},false,this).complete(()=>
			{
				for(var g of groups)
				{
					var container=this.content.querySelector(".filters [data-group="+g+"]");
					var parts=Object.keys(this.org.getGroup(g)).sort((a,b)=>a.toLowerCase()>b.toLowerCase());

					for(var p of parts)
					{
						var option=document.createElement("option");
						option.value=option.textContent=p;
						container.appendChild(option);
					}
				}
			}).complete(()=>{

				this.content.classList.remove("pending");
				this.content.querySelector("form").addEventListener("submit",this._onFilter);
				this.content.querySelector(".actions").addEventListener("click",this._onAction);
				this.content.querySelector(".filters").addEventListener("change",this.updateFilters);
				this.resultList.addEventListener("click",this._onListClick);
				this.resultList.addEventListener("mousedown",this._onListMouseDown);
				
				this.sort("name",false);
				
			});
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
						var selected=this.resultList.querySelectorAll(".selected");
						for(var i=0;i<selected.length;i++)selected[i].classList.remove("selected");
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
			return Array.from(this.content.querySelectorAll(".selected"))
			.sort((a,b)=>parseInt(a.style.order,10)>parseInt(b.style.order,10))
			.map(e=>this.org.values[e.dataset.index]);
		},
		updateFilters:function()
		{
			var c=this.org.combine(false,this.sortColumn);
			if(this.filterExp) c.filter(this.filterExp);
			if(this.content.querySelector('.filters [name="uniqueNames"]:checked')) c.filter("uniqueNames")	;			
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
			var html='<textarea cols="100" rows="10">';
			var o=new SC.org(this.getSelected()).group("network",guides.network,function(child){child.group("bot",guides.bot)});
			var networks=o.getGroup("network");
			for(var n in networks)
			{
				var bots=networks[n].getGroupValues("bot");
				for(var b in bots)
				{
					var bot=bots[b];
					var chan=n+"/"+bot[0].channel+"\n";
					if(html.indexOf(chan)===-1)html+=chan;
					html+="/msg "+b+" XDCC BATCH "+bot.map(p=>p.packnumber).join(",")+"\n";
				}
			}
			html+="</textarea>";
			openDialog(html);
		},
		selectBots:function()
		{
			if(!this.org.hasGroup("uniqueNames"))this.org.group("uniqueNames",guides.name);
			var uniqueNames=this.org.getGroup("uniqueNames");
			var html='<table>';
			var selected=this.getSelected();
			for(var s of selected)
			{
				html+='<tr><td>'+s.name+'<td><td><select>'+this.org.getGroupPart("uniqueNames",s.name).getValues().sort()
				.map(i=>'<option value="'+this.org.values.indexOf(i)+'" '+(selected.indexOf(i)!=-1?'selected >':'>')+i.bot+'</option>')+
				'</select></td></tr>';
				
			}
			html+='</table>';
			var dialog=openDialog(html);

			var okBtn=document.createElement("button");
			dialog.firstElementChild.insertBefore(okBtn,dialog.firstElementChild.lastElementChild);
			okBtn.textContent="ok";
			okBtn.addEventListener("click",()=>
			{
				Array.prototype.forEach.call(this.content.querySelectorAll(".selected"),e=>e.classList.remove("selected"));
				Array.prototype.map.call(dialog.querySelectorAll(":checked"),e=>e.value)
				.forEach(i=>this.content.querySelector('[data-index="'+i+'"]').classList.add("selected"));
				
				dialog.remove();
			});
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
				openDialog('<div>successfully added packaged to download queue</div><a href="#downloadManager">go to downloads</a>');
			})
		}
	});
	
	SMOD("SearchResult",SR);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);