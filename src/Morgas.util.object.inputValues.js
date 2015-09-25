(function(µ,SMOD,GMOD,HMOD,SC){

	var util=µ.util=µ.util||{};
	var obj=util.object=util.object||{};
	
	SC=SC({
		goPath:"goPath"
	});
	
	/**
	 * set input values from object
	 * path in object is defined by data-path attribute
	 * key in object is defined by data-field attribute
	 * @param inputs[] input Nodes
	 * @param {object} source
	 */
	obj.setInputValues=function(inputs,source)
	{
		for(var i=0;i<inputs.length;i++)
		{
			var path=(inputs[i].dataset.path ? inputs[i].dataset.path+"." : "")+inputs[i].name;
			var value=SC.goPath(source, path);
			if(value!==undefined)
			{
				if(inputs[i].type==="checkbox")
				{
					inputs[i].checked=!!value;
				}
				else
				{
					inputs[i].value=value;
				}
			}
		}
	};

	/**
	 * collect input values into object
	 * path in object is defined by data-path attribute
	 * key in object is defined by data-field attribute
	 * @param inputs[] input Nodes
	 * @param {object} target
	 */
	obj.getInputValues=function(inputs,target,create)
	{
		var rtn=target||{};
		for(var i=0;i<inputs.length;i++)
		{
			var t=rtn;
			if(inputs[i].dataset.path)
			{
				t=SC.goPath(t, inputs[i].dataset.path,!target||create);
			}
			if(t!==undefined&&(inputs[i].name in t||!target||create))
			{
				if(inputs[i].type==="checkbox")
				{
					t[inputs[i].name]=inputs[i].checked;
				}
				else
				{
					t[inputs[i].name]=inputs[i].valueAsDate||inputs[i].valueAsNumber||inputs[i].value;
				}
			}
		}
		return rtn;
	};
	
	SMOD("setInputValues",obj.setInputValues);
	SMOD("getInputValues",obj.getInputValues);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);