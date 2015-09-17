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
			
			// for downloading
			this.addField("state",			FIELD.TYPES.STRING	,param.state			);
			this.addField("message",		FIELD.TYPES.JSON	,param.message			);
			this.addField("progressValue",	FIELD.TYPES.INT		,param.progressValue	);
			this.addField("progressMax",	FIELD.TYPES.INT		,param.progressMax		);
			this.addField("location",		FIELD.TYPES.STRING	,param.location			);
			this.addField("startTime",		FIELD.TYPES.DATE	,param.startTime		);
			this.addField("updateTime",		FIELD.TYPES.DATE	,param.updateTime		);
			
			this.dom=null;
		},
		getDom:function()
		{
	
			if(!this.dom)
			{
				this.dom={element:document.createElement("fieldset")};
				this.dom.element.classList.add("XDCCPackage")
				this.dom.element.title=this.dom.element.dataset.state=this.state
				this.dom.element.innerHTML=
	'\
	<legend>'+this.name+'</legend>\
	<div>\
		<progress value="0" max="1"></progress>\
		<span class="location"></span>\
		<span class="message"></span>\
		<span class="time"></span>\
		<span class="speed"></span>\
		<span class="remaining"></span>\
	</div>\
	';
				this.dom.progress  = this.dom.element.querySelector("progress");
				this.dom.speed     = this.dom.element.querySelector(".speed");
				this.dom.remaining = this.dom.element.querySelector(".remaining");
				this.dom.location  = this.dom.element.querySelector(".location");
				this.dom.message   = this.dom.element.querySelector(".message");
				this.dom.time      = this.dom.element.querySelector(".time");
			}
			this.update();
			return this.dom;
		},
		update:function(param)
		{
			if(param)
			{
				this.lastUpdateTime	= this.updateTime;
				this.fromJSON(param);;
			}
			if(this.dom)
			{
				this.dom.element.title=this.dom.element.dataset.state=this.state;
	
				if(this.updateTime)
				{
					var averageSpeed=this.progressValue/(this.updateTime-this.startTime);
					this.dom.speed.textContent=averageSpeed.toFixed(0)+" kb/s";
					
					var averageRemaining=(this.progressMax-this.progressValue)/averageSpeed;
					this.dom.remaining.textContent=getTimeString(averageRemaining);
				
					this.dom.time.textContent=getTimeString(this.updateTime-this.startTime);
					
					if(this.state!=="done"&&this.lastUpdateTime)
					{
						var lastSpeed=(this.progressValue-this.dom.progress.value)/(this.updateTime-this.lastUpdateTime);
						this.dom.speed.textContent+=" ( "+(isFinite(lastSpeed)?lastSpeed.toFixed(0):0)+" kb/s )";
	
						var lastRemaining=(this.progressMax-this.progressValue)/lastSpeed;	
						this.dom.remaining.textContent+=" ( "+(isFinite(lastSpeed)?getTimeString(lastRemaining):"--:--:--")+" )";
					}
					
				}
				
				if(this.progressMax)
				{
					this.dom.progress.value       = this.progressValue;
					this.dom.progress.max         = this.progressMax;
				}
				
				if(this.location) this.dom.location.textContent = this.location;
	
				if(this.message)
				{
					this.dom.message.dataset.type = this.message.type;
					this.dom.message.textContent  = this.message.text;
				}
			}
		}
	});
	
	SMOD("XDCCPackage",XP);
	if(typeof module!=="undefined")module.exports=XP;

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);