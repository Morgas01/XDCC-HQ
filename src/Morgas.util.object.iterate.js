(function(µ,SMOD,GMOD){

	var util=µ.util=µ.util||{};
	var obj=util.object=util.object||{};
	
	/** createIterator
	 * Creates an iterator for {any} in {backward} order.
	 * {isObject} declares {any} as a Map or Array. 
	 */
	//TODO iterator & Set & Map
	obj.createIterator=function* (any,backward,isObject)
	{
		if(any.length>=0&&!isObject)
		{
			for(var i=(backward?any.length-1:0);i>=0&&i<any.length;i+=(backward?-1:1))
			{
				yield [any[i],i];
			}
		}
		else if (typeof any.next==="function"||typeof any.entries==="function")
		{
			if(typeof any.entries==="function")
			{
				any=any.entries();
			}
			var step=null;
			while(step=any.next(),!step.done)
			{
				yield step.value.reverse();
			}
		}
		else
		{
			var k=Object.keys(any);
			if(backward)
			{
				k.revert();
			}
			for(var i=0;i<k.length;i++)
			{
				yield [any[k[i]],k[i]];
			}
		}
		
	};
	/** iterate
	 * Iterates over {any} calling {func} with {scope} in {backward} order.
	 * {isObject} declares {any} as an Object with a length property.
	 *
	 * tip: to iterate only over defined array values use isObject
	 *
	 * @param {any} any
	 * @param {function} callback  (value,key,index,isObject)  key and index are identical in arrays
	 * @param {boolean} backward
	 * @param {boolean} isObject
	 * @param {any} scope
	 * 
	 * returns Array of {func} results
	 */
	//TODO iterator & Set & Map
	obj.iterate=function(any,func,backward,isObject,scope)
	{
		var rtn=[];
		if(any.length>=0&&!isObject)
		{//Array like
			for(var i=(backward?any.length-1:0);i>=0&&i<any.length;i+=(backward?-1:1))
			{
				rtn.push(func.call(scope,any[i],i,i,false));
			}
		}
		else if (typeof any.next==="function"||typeof any.entries==="function")
		{//iterator or iterable
			if(typeof any.entries==="function")
			{
				any=any.entries();
			}
			var step=null,index=0;
			while(step=any.next(),!step.done)
			{
                isObject=step.value[1]!==step.value[0]&&step.value[0]!==index;
				rtn.push(func.call(scope,step.value[1],step.value[0],index,isObject));
                index++;
			}
		}
		else
		{//object
			var k=Object.keys(any);
			if(backward)
			{
				k.revert();
			}
			for(var i=0;i<k.length;i++)
			{
				rtn.push(func.call(scope,any[k[i]],k[i],i,true));
			}
		}
		return rtn;
	};
	SMOD("Iterator",obj.createIterator);
	SMOD("iterate",obj.iterate);
	
})(Morgas,Morgas.setModule,Morgas.getModule);