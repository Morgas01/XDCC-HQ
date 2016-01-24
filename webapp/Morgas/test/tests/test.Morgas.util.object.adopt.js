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

	test("setDefault",function()
	{
		var default1={
			v1:1,
			v2:2,
			v3:3
		};
		var default2={
			v1:1,
			v2:2,
			v3:3
		};
		var param1={
			v1:4,
			v3:null,
			v4:40
		};
		var param2={
			v1:4,
			v3:null,
			v4:40
		};

		var result=adopt.setDefaults(default1,param1);

		deepEqual(result,{
			v1:4,
			v2:2,
			v3:null
		},"setDefault");
		deepEqual(default1,default2,"default unaltered");
		deepEqual(param1,param2,"param unaltered");

		result=adopt.setDefaults(default1,param1,true);

		deepEqual(result,{
			v1:4,
			v2:2,
			v3:null,
			v4:40
		},"setDefault extend");
		deepEqual(default1,default2,"default unaltered");
		deepEqual(param1,param2,"param unaltered");
	})
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);