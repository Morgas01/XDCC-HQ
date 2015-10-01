(function(µ,SMOD,GMOD,HMOD,SC){

	module("util.function.rescope");
	
	test("rescope",function()
	{
		var scope={
			fn:function(){
				ok(this===otherScope);
			}
		};
		var otherScope={};
		
		scope.fn=GMOD("rescope")(scope.fn,otherScope);
		scope.fn();
	})
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);