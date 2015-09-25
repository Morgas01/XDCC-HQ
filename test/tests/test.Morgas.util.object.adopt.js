(function(µ,SMOD,GMOD,HMOD,SC){

	module("util.object.adopt");
	
	var adopt=GMOD("adopt");
	
	test("adopt",function()
	{
		var target={
			v1:1,
			v2:2,
			v3:3
		};
		
		deepEqual(adopt(target,{v1:-1,v2:0.2}),{v1:-1,v2:0.2,v3:3},"adopt");
		deepEqual(adopt(target,{v3:30,v4:4},true),{v1:-1,v2:0.2,v3:30,v4:4},"extend");
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);