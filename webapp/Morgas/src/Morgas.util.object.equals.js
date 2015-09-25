(function(µ,SMOD,GMOD,HMOD,SC){

	var util=µ.util=µ.util||{};
	var uObj=util.object=util.object||{};

	/** equals
	 * Matches {obj} against {pattern}.
	 * Returns: Boolean
	 *
	 * Matches strictly (===) and RegExp, function, Array, and Object.
	 * 
	 * RegExp: try to match strictly match and
	 * then return pattern.test(obj)
	 * 
	 * function: try to match strictly match and
	 * then if obj is not a function test it with
	 * the pattern function and return its result
	 *
	 * Array: try to match strictly match and
	 * then return pattern.indexOf(obj)!==-1
	 *
	 * Object: recurse.
	 *
	 */
	uObj.equals=function(obj,pattern)
	{
		if(obj===pattern)
			return true;
		if(obj===undefined||obj===null)
			return false;
		if(pattern instanceof RegExp)
			return pattern.test(obj);
		if(typeof pattern==="function")
		{
			if(typeof obj==="function")
				return false;
			else
				return pattern(obj);
		}
		if(typeof obj.equals==="function")
        {
            return obj.equals(pattern);
        }
		if(typeof pattern==="object")
		{
            if(typeof obj!=="object"&&Array.isArray(pattern))
            {
				return pattern.indexOf(obj)!==-1;
            }
			for(var i in pattern)
			{
				if(!uObj.equals(obj[i],pattern[i]))
					return false;
			}
			return true;
		}
		return false;
	};
	/**
	 * creates a test for equals to pattern
	 * @param pattern
	 * @returns {Function}
	 */
	uObj.equals.test=function(pattern)
	{
		return function(obj)
		{
			return uObj.equals(obj,pattern);
		}
	};
	SMOD("equals",uObj.equals);
	
})(Morgas,Morgas.setModule,Morgas.getModule);