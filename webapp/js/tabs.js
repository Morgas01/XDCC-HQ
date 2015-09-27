(function(µ,SMOD,GMOD,HMOD,SC){
	
	//TODO package
	var TabContainer=µ.Class({
		init:function(tabs)
		{
			this.domElement=document.createElement("div");
			this.domElement.classList.add("tabContainer");
			this.domElement.addEventListener("mousedown",this._onMousedown.bind(this));
			this.domElement.addEventListener("mouseup",this._onMouseup.bind(this));
			this.tabs=[];
			this.activeTab=null;
			if(tabs)this.add(tabs);
		},
		add:function(tabs)
		{
			tabs=[].concat(tabs);
			for(var tab of tabs)
			{
				if(!(tab instanceof Tab))tab=new Tab(tab);
				this.tabs.push(tab);
				this.domElement.appendChild(tab.header);
				this.domElement.appendChild(tab.content);
				var closeBtn=document.createElement("button");
				closeBtn.textContent="x";
				tab.header.appendChild(closeBtn);
			}
			this.setActive(tabs[0]);
		},
		removeTab:function(tab)
		{
			var index=this.tabs.indexOf(tab);
			if(index!==-1)
			{
				this.tabs.splice(index,1);
				this.domElement.removeChild(tab.header);
				this.domElement.removeChild(tab.content);
				tab.destroy();
				if(this.activeTab==tab)
				{
					this.activeTab=null;
					if(this.tabs.length>0) this.setActive(this.tabs[Math.max(index-1,0)]);
				}
			}
		},
		destroy:function()
		{
			for(var tab of this.tabs.slice())this.removeTab(tab);
			this.domElement.remove();
			this.mega;
		},
		setActive:function(tab)
		{
			if(this.tabs.indexOf(tab)!==-1)
			{
				if(this.activeTab)this.activeTab.header.classList.remove("active");
				this.activeTab=tab;
				this.activeTab.header.classList.add("active");
			}
		},
		_onMousedown:function(e)
		{
			if(e.target.parentNode===this.domElement) e.preventDefault();
		},
		_onMouseup:function(e)
		{
			if ((e.target.tagName=="BUTTON"||e.which==2)&&e.target.parentNode.parentNode===this.domElement)
			{
				this.removeTab(this.tabs[Array.indexOf(this.domElement.childNodes,e.target.parentNode)/2])
			}
			else if (e.which==2&&e.target.parentNode===this.domElement)
			{
				this.removeTab(this.tabs[Array.indexOf(this.domElement.childNodes,e.target)/2])
			}
			else if(e.target.tagName==="HEADER"&&e.target.parentNode===this.domElement)
			{
				this.setActive(this.tabs[Array.indexOf(this.domElement.childNodes,e.target)/2]);
			} 
		}
	});
	SMOD("TabContainer",TabContainer);
	
	var Tab=µ.Class({
		init:function(header,content)
		{
			this.header=document.createElement("header");
			this.header.textContent=header;
			if(content&&content instanceof HTMLElement) this.content=content;
			else
			{
				this.content=document.createElement("div");
				if(content)this.content.textContent=content;
			}
		}
	});
	SMOD("Tab",Tab);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);