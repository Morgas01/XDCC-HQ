(function(µ,SMOD,GMOD,HMOD,SC){

	module("util.object.iterateAsync");
	
	var itAS=GMOD("iterateAsync");
	
	asyncTest("iterateAsync",function()
	{
		ok(true,"start: "+new Date());
		itAS({length:1E6},function(value,index)
		{
			//doSomething
		}).complete(function()
		{
			ok(true,"finish: "+new Date());
			start();
		});
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);