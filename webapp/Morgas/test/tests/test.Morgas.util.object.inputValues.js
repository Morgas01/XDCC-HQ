(function(µ,SMOD,GMOD,HMOD,SC){
	
	module("util.object.inputValues");
	
	SC=SC({
		s:"setInputValues",
		g:"getInputValues"
	});
	
	test("inputValues",function()
	{
		var domElement=document.createElement("div");
		domElement.innerHTML='<input type="text" name="field1">'+
		'<input type="number" name="field2">'+
		'<input type="checkbox" data-path="foo.bar" name="field3">'+
		'<input type="checkbox" data-path="foo2.bar" name="field4">'+
		'<select name="selection"><option value="select1"/><option value="select2"/></select>'+
		'<textarea name="default">default value</textarea>';
		
		var set={
			"field1":"value1",
			"field2":5,
			"foo":{"bar":{"field3":true}},
			"selection":"select2"
		};
		var get={
			"field1":null,
			"field2":null,
			"foo":{"bar":{"field3":null}},
			"selection":null,
			"default":null
		};
		SC.s(domElement.children,set);
		SC.g(domElement.children,get);
		
		deepEqual(get,{
			"field1":"value1",
			"field2":5,
			"foo":{"bar":{"field3":true}},
			"selection":"select2",
			"default":"default value"
		},"simple");
		
		SC.g(domElement.children,get,true);

		deepEqual(get,{
			"field1":"value1",
			"field2":5,
			"foo":{"bar":{"field3":true}},
			"foo2":{"bar":{"field4":false}},
			"selection":"select2",
			"default":"default value"
		},"create new paths");
		deepEqual(GMOD("getInputValues")(domElement.children),get,"no target");
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);