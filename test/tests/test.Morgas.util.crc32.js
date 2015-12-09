(function(µ,SMOD,GMOD,HMOD,SC){

	module("util.crc32");
	
	var crc32=GMOD("util.crc32");
	
	test("simple",function()
	{
		strictEqual(crc32("123456789"),0xCBF43926);
	});
	test("builder",function()
	{
		var builder=new crc32.Builder();
		builder.add("1234").add("56789");
		strictEqual(builder.get(),0xCBF43926);

		var data=[];
		for(var i=0;i<50+Math.random()*50;i++) data.push(Math.random()*42);

		var crc=crc32(data);
		builder=new crc32.Builder();
		while (data.length>0) builder.add(data.splice(0,7));
		strictEqual(builder.get(),crc);
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);