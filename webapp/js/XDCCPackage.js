(function(µ,SMOD,GMOD,HMOD,SC){

	var DBObj=µ.getModule("DBObj"),
		FIELD=µ.getModule("DBField");
	

	var getTimeString=function(ms)
	{
		var time=new Date(ms);
		return ("0"+time.getUTCHours()).slice(-2)+":"+("0"+time.getUTCMinutes()).slice(-2)+":"+("0"+time.getUTCSeconds()).slice(-2);
	}
	
	var XP=µ.Class(DBObj,{
		objectType:"XDCCPackage",
		init:function(param)
		{
			param=param||{};
		
			this.mega(param);
			
			//from searches
			this.addField("network",	FIELD.TYPES.STRING	,param.network		);
			this.addField("channel",	FIELD.TYPES.STRING	,param.channel		);
			this.addField("bot",		FIELD.TYPES.STRING	,param.bot			);
			this.addField("name",		FIELD.TYPES.STRING	,param.name			);
			this.addField("packnumber",	FIELD.TYPES.INT		,param.packnumber	);
			this.addField("size",		FIELD.TYPES.STRING	,param.size			);
			
			//for downloading
			this.addField("location",		FIELD.TYPES.STRING	,param.location			);
			this.addField("filename",		FIELD.TYPES.STRING	,param.filename			);
			this.addField("state",			FIELD.TYPES.STRING	,param.state			);
			this.addField("message",		FIELD.TYPES.JSON	,param.message			);
			this.addField("progressStart",	FIELD.TYPES.INT		,param.progressStart	);
			this.addField("progressValue",	FIELD.TYPES.INT		,param.progressValue	);
			this.addField("progressMax",	FIELD.TYPES.INT		,param.progressMax		);
			this.addField("startTime",		FIELD.TYPES.DATE	,param.startTime		);
			this.addField("updateTime",		FIELD.TYPES.DATE	,param.updateTime		);
			this.addField("orderIndex",		FIELD.TYPES.INT		,param.orderIndex		);
			this.addField("crc",			FIELD.TYPES.STRING	,param.crc				);
			
			//util
			Object.defineProperty(this,"cleanName",{
				configurable:false,
				enumerable:true,
				get:()=>XP.cleanName(this.name),
			});
			
			//for client view
			this.dom=null;
			this.progressCb=null;
		},
		getPackageHash:function()
		{
			return this.network+"|"+this.bot+"|"+this.packnumber+"|"+this.name;
		},
		getDom:function()
		{
	
			if(!this.dom)
			{
				this.dom={element:document.createElement("div")};
				this.dom.element.dataset.downloadId=this.ID;
				this.dom.element.draggable=true;
				this.dom.element.classList.add("XDCCPackage")
				this.dom.element.title=this.dom.element.dataset.state=this.state
				this.dom.element.innerHTML=
'\
<span class="name"></span>\
<progress value="0" max="1"></progress>\
<span class="network"></span>\
<span class="channel"></span>\
<span class="bot"></span>\
<span class="packnumber"></span>\
<span class="location"></span>\
<span class="filename"></span>\
<span class="message"></span>\
<span class="time"></span>\
<span class="speed"></span>\
<span class="remaining"></span>\
<div class="actions">\
	<button data-action="disable">disable</button>\
	<button data-action="enable">enable</button>\
	<button data-action="remove">remove</button>\
	<button data-action="reset">reset</button>\
</div>\
';
				this.dom.name		= this.dom.element.querySelector(".name");
				this.dom.progress	= this.dom.element.querySelector("progress");
				this.dom.network	= this.dom.element.querySelector(".network");
				this.dom.channel	= this.dom.element.querySelector(".channel");
				this.dom.bot		= this.dom.element.querySelector(".bot");
				this.dom.packnumber	= this.dom.element.querySelector(".packnumber");
				this.dom.location	= this.dom.element.querySelector(".location");
				this.dom.filename	= this.dom.element.querySelector(".filename");
				this.dom.message	= this.dom.element.querySelector(".message");
				this.dom.time		= this.dom.element.querySelector(".time");
				this.dom.speed		= this.dom.element.querySelector(".speed");
				this.dom.remaining	= this.dom.element.querySelector(".remaining");
			}
			this.update();
			return this.dom;
		},
		setProgressCallback:function(fn)
		{
			this.progressCb=fn;
		},
		getProgressCallback:function()
		{
			return this.progressCb;
		},
		update:function(param)
		{
			this.dom.name.textContent = this.name;
			
			if(param)
			{
				this.lastUpdateTime	= this.updateTime;
				this.fromJSON(param);
			}
			if(this.dom)
			{
				this.dom.element.title=this.dom.element.dataset.state=this.state;
				this.dom.element.style.order=this.orderIndex;
	
				if(this.updateTime)
				{
					var averageSpeed=(this.progressValue-this.progressStart)/(this.updateTime-this.startTime);
					this.dom.speed.textContent=averageSpeed.toFixed(0)+" kb/s";
					
					var averageRemaining=(this.progressMax-this.progressValue)/averageSpeed;
					this.dom.remaining.textContent=getTimeString(averageRemaining);
				
					this.dom.time.textContent=getTimeString(this.updateTime-this.startTime);
					
					if(this.state===XP.states.RUNNING&&this.lastUpdateTime)
					{
						var lastSpeed=(this.progressValue-this.dom.progress.value)/(this.updateTime-this.lastUpdateTime);
						this.dom.speed.textContent+=" ( "+(isFinite(lastSpeed)?lastSpeed.toFixed(0):0)+" kb/s )";
	
						var lastRemaining=(this.progressMax-this.progressValue)/lastSpeed;	
						this.dom.remaining.textContent+=" ( "+(isFinite(lastRemaining)?getTimeString(lastRemaining):"--:--:--")+" )";
					}
					
				}
				if(this.state===XP.states.PENDING||this.state===XP.states.RUNNING||this.state===XP.states.DONE)
				{
					if(this.progressMax)
					{
						this.dom.progress.value = this.progressValue||0;
						this.dom.progress.max   = this.progressMax;
						if(this.progressCb) this.progressCb(this.progressValue,this.progressMax);
					}
					else if(this.progressCb) this.progressCb(0,100);
				}
				else if(this.progressCb) this.progressCb(0,0);
				
				if(this.network) this.dom.network.textContent = this.network;
				if(this.channel) this.dom.channel.textContent = this.channel;
				if(this.bot) this.dom.bot.textContent = this.bot;
				if(this.packnumber) this.dom.packnumber.textContent = this.packnumber;
				if(this.location) this.dom.location.textContent = this.location;
				if(this.filename) this.dom.filename.textContent = this.filename;
	
				if(this.message)
				{
					this.dom.message.dataset.type = this.message.type;
					this.dom.message.textContent  = this.message.text;
				}
			}
		}
	});
	XP.states={
		DISABLED:"Disabled",
		PENDING:"Pending",
		RUNNING:"Running",
		DONE:"Done",
		FAILED:"Failed"
	};
	XP.cleanName=function(name)
    {
    	if((name.indexOf("%20")!==-1&&name.indexOf(" ")===-1)||(name.indexOf("%5B")!==-1&&name.indexOf("[")===-1))
    		name=decodeURIComponent(name);
    	name=name.replace(/_/g," ");
    	name=name.replace(/([\d\.]+)(?=[\.\d])|\.(?![^\.]+$)/g,($0,$1)=>$1||" "); //keep dots between numbers and last one
    	return name;
    };
	
	SMOD("XDCCPackage",XP);
	if(typeof module!=="undefined")module.exports=XP;

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);