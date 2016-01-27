(function(µ,SMOD,GMOD,HMOD,SC){

	var util=µ.util=µ.util||{};
	var obj=util.object=util.object||{};
	
	SC=SC({
		eq:"equals",
		it:"iterate"
	});
	
	/** find
	 * Iterates over {source}.
	 * Returns an Array of {pattern} matching values 
	 */
	obj.find=function(source,pattern,onlyValues)
	{
		var rtn=[];
		SC.it(source,function(index,value)
		{
			if(SC.eq(value,pattern))
			rtn.push(onlyValues?value:{value:value,index:index});
		});
		return rtn;
	};
	SMOD("find",obj.find);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);