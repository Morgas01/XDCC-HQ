(function(µ,SMOD,GMOD,HMOD,SC){

	module("util.object.equals");
	
	var EQ=GMOD("equals");

	test("equals",function()
	{
		var pattern={
			string:"string",
			regExp:/[gerx]{4}p/i,
			num:4,
			func:function(){},
			value:function(value){return value>4},
			obj:{
				recrusive:true
			},
			arr:[1,"4",1,4,2,1,3,5,6,2,3,7]
		};
		var complex={
			equals:pattern.value
		};
		ok(EQ("string",pattern.string),"string 1");
		ok(!EQ("stirgn",pattern.string),"string 2");
		ok(EQ(4,pattern.num),"number 1");
		ok(!EQ(5,pattern.num),"number 2");
		ok(EQ(pattern.regExp,pattern.regExp),"regExp 1");
		ok(!EQ(/[gerx]{4}p/,pattern.regExp),"regExp 2");
		ok(EQ("regExp",pattern.regExp),"regExp 3");
		ok(EQ("rexEgp",pattern.regExp),"regExp 4");
		ok(EQ(pattern.func,pattern.func),"function 1");
		ok(!EQ(function(){},pattern.func),"function 2");
		ok(EQ(5,pattern.value),"function 3");
		ok(!EQ(3,pattern.value),"function 4");
		ok(EQ(pattern.arr,pattern.arr),"array 1");
		ok(!EQ([1,4,1,4,2,1,3,5,6,2,3,7],pattern.arr),"array 2");
		ok(EQ(7,pattern.arr),"array 3");
		ok(!EQ(8,pattern.arr),"array 4");
		ok(EQ({
			string:"string",
			regExp:"regExp",
			num:4,
			func:pattern.func,
			value:5,
			obj:{recrusive:true},
			arr:3,
			anything:"more will be ignored"
		},pattern),"obj");
		ok(EQ(complex,5),"obj.equals 1");
		ok(!EQ(complex,3),"obj.equals 2");
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);