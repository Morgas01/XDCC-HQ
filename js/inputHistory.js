(function(µ,SMOD,GMOD,HMOD,SC){

	var IH=function(storageKey,maxCount)
	{
		var history=[];
		var storageAvailable=true;
		try
		{
			history=JSON.parse(localStorage.getItem(storageKey))||history;
		}
		catch(e)
		{
			storageAvailable=false;
			µ.logger.info("localStorage not available");
		}
		return {
			update:function(search)
			{
				if(search)
				{
					var index=history.indexOf(search);
					if(index!=-1) history.splice(index,1);
					history.unshift(search);
					history.length=Math.min(history.length,maxCount);//max count
					if(storageAvailable)localStorage.setItem(storageKey,JSON.stringify(history));
				}
				return history;
			},
			history:history
		};
	};
	
	SMOD("inputHistory",IH);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);