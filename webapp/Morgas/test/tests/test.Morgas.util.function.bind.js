(function(µ,SMOD,GMOD,HMOD,SC){

	module("util.function.bind");
	
	test("bind",function()
	{
		var scope={
			fn:function(value){
				ok(this===otherScope,"scope");
				ok(value===3,"param")
			}
		};
		var otherScope={};
		
		scope.fn=GMOD("bind")(scope.fn,otherScope,3);
		scope.fn(1);
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);