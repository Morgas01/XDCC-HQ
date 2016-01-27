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
	obj.iterateAsync=function(any,func,isObject,scope,stepTime)
	{
		var time=Date.now();
		if(!stepTime)
		{
			stepTime=obj.iterateAsync.stepTime;
		}
		return new SC.PROM(function(signal)
		{
			var it=SC.It(any,isObject);
			var goStep=function iterateStep()
			{
				if(it!=null)
				{
					try
					{
						var step=it.next();
						for(var i=0;time+stepTime>Date.now()&&!step.done;i++,step=it.next())
						{
							func.call(scope,step.value[0],step.value[1]);
						}
						if(step.done)
						{
							signal.resolve();
							return;
						}
						time=Date.now();
						requestAnimationFrame(goStep);
					}
					catch (e)
					{
						signal.reject(e);
					}
				}
			};
			signal.onAbort(function(){it=null});
			requestAnimationFrame(goStep);
		},{scope:scope});
	};
	obj.iterateAsync.stepTime=50;
	
	SMOD("iterateAsync",obj.iterateAsync);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);