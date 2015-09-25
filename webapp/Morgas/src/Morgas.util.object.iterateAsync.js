(function(µ,SMOD,GMOD,HMOD,SC){

	var util=µ.util=µ.util||{};
	var obj=util.object=util.object||{};
	
	SC=SC({
		PROM:"Promise",
		It:"Iterator"
	});
	/** iterateAsync
	 * As iterate but puts a timeout between the iteration steps
	 * 
	 * returns: µ.Detached
	 */
	obj.iterateAsync=function(any,func,backward,isObject,scope,chunk)
	{
		if(!chunk)
		{
			chunk=obj.iterateAsync.chunk;
		}
		return new SC.PROM(function(signal)
		{
			var it=SC.It(any,backward,isObject);
			var interval=setInterval(function iterateStep()
			{
				try
				{
					var step=it.next();
					for(var i=0;i<chunk&&!step.done;i++,step=it.next())
					{
						func.call(scope,step.value,step.key);
					}
					if(step.done)
					{
						signal.resolve();
						clearInterval(interval);
					}
				}
				catch (e)
				{
					signal.reject(e);
				}
			},0);
			signal.onAbort(function(){chunk=0;clearInterval(interval);});
		});
	};
	obj.iterateAsync.chunk=1E4;
	
	SMOD("iterateAsync",obj.iterateAsync);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);