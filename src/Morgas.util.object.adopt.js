(function(µ,SMOD,GMOD,HMOD,SC){

	var util=µ.util=µ.util||{};
	var obj=util.object=util.object||{};
	
	/**
	 * adopt attributes defined in [target] from [provider].
	 * when [extend] is set to true all attributes from [provider] are adopted
	 * @param {object} target
	 * @param {object} [provider=undefined]
	 * @param {boolean} [extend=false]
	 */
	obj.adopt=function(target,provider,extend)
	{
		if(provider)
		{
			var keys=Object.keys(extend ? provider : target);
			var k=0;
			for(var i=keys[k];k<keys.length;i=keys[++k])
			{
				if(extend||i in provider)
				{
					target[i]=provider[i];
				}
			}
		}
		return target;
	};
	obj.adopt.setDefaults=function(defaults,param,extend)
	{
		return obj.adopt(obj.adopt({},defaults,true),param,extend);
	};
	SMOD("adopt",obj.adopt);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);