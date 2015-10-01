(function(µ,SMOD,GMOD,HMOD,SC){
	module("DependencyResolver");
	var dr=new (µ.getModule("DepRes"))({
		a:true,
		aa:"a",
		ab:["a","b"],
		ba:{deps:["b","a"]}
	});
	test("simple",function()
	{
		deepEqual(dr.resolve("aa"),["a","aa"],"single");
		deepEqual(dr.resolve(["aa","ab","ba"]),["a","aa","b","ab","ba"],"multiple");
	});

	test("added",function()
	{
		dr.addConfig({
			b:true,
			cc:["ab","c"],
			abcc:["a","b","cc"]
		});
		deepEqual(dr.resolve("abcc"),["a","b","ab","c","cc","abcc"]);
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);