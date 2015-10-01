(function(µ,SMOD,GMOD,HMOD,SC){

	module("util.object.goPath");
	
	var goPath=GMOD("goPath");
	
	test("goPath",function()
	{
		var obj={path:{to:{
			value:"something",
			"other value":"something else",
			arr:["something1","something2"]
		}}};
		strictEqual(goPath(obj,"path.to.value"),obj.path.to.value,"valid path");
		strictEqual(goPath(obj,"path.to.no.value"),undefined,"nonvalid path");
		strictEqual(goPath(obj,["path","to","other value"]),obj.path.to["other value"],"valid path as array");
		strictEqual(goPath(obj,["path","to","new","value"],true),obj.path.to["new"].value,"create path");
		strictEqual(goPath(obj,["path","to","arr","0"],true),obj.path.to.arr[0],"array path");
		strictEqual(goPath(obj,["path","to","new","arr[]"],true),obj.path.to["new"].arr,"create array");
		ok(Array.isArray(obj.path.to["new"].arr),"create array");
		strictEqual(goPath(obj,["path","to","arr[1]"],true),obj.path.to.arr[1],"array notation");
	});

	test("goPath.guide",function()
	{
		var obj={path:{to:{
			value:"something",
			"other value":"something else",
			arr:["something1","something2"]
		}}};
		strictEqual(goPath.guide("path.to.value")(obj),obj.path.to.value,"valid path");
		strictEqual(goPath.guide("path.to.no.value")(obj),undefined,"nonvalid path");
		strictEqual(goPath.guide(["path","to","other value"])(obj),obj.path.to["other value"],"valid path as array");
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);