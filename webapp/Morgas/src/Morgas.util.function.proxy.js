(function(µ,SMOD,GMOD,HMOD,SC){
	
	var util=µ.util=µ.util||{};
	var uFn=util["function"]=util["function"]||{};
	
	SC=SC({
		it:"iterate"
	});
	
	/**
	 * proxy methods from source to target.
	 * called methods have scope of its source
	 */
	uFn.proxy=function(source,listOrMapping,target)
	{
		var isKey=false,
		isGetter=false;
		switch(typeof source)
		{
			case "string":
				isKey=true;
				break;
			case "function":
				isGetter=true;
				break;
		}
		SC.it(listOrMapping,function(key,value,index,isObject)
		{
			var sKey=(isObject?key:value),
			tKey=value,
			fn=null;
			if(isKey)
			{
				fn=function(){return this[source][sKey].apply(this[source],arguments)};
			}
			else if (isGetter)
			{
				fn=function(){var scope=source.call(this,sKey);return scope[sKey].apply(scope,arguments);};
			}
			else
			{
				fn=function(){return source[sKey].apply(source,arguments)};
			}
			target[tKey]=fn;
		});
	};
	SMOD("proxy",uFn.proxy);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);