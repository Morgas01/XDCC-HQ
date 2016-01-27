(function(µ,SMOD,GMOD,HMOD,SC){
	
	module("util.object.iterate");
	
	var Iterator=GMOD("Iterator");
	var iterate=GMOD("iterate");
	
	test("iterate",function(assert)
	{
		var arr=[3,1,4,1,5,9,2,6,5,3,5,8,9,7,9,3,2,3,8,4,6,2,6,4,3,3,8,3,2,7,9,5,0,2,8,8,4,1,9,7,1,6,9,3,9,9,3,7,5,1,0];
		var obj={
			"0":3,
			"1":1,
			"2":4,
			length:3,
			isArraylike:true,
			isArray:false,
			someValue:"anything"
		};
		var set=new Set(arr);
		var map=new Map();
		for(var k in obj){map.set(k,obj[k]);}

		var arrCopy=[];
		iterate(arr,function(index,val)
		{
			arrCopy.push(val);
		});
		deepEqual(arrCopy,arr,"array");

		var arrLikeCopy=[];
		iterate(obj,function(index,val)
		{
			arrLikeCopy.push(val);
		});
		propEqual(arrLikeCopy,[3,1,4],"array like");
		
		var objCopy={};
		iterate(obj,function(index,val)
		{
			objCopy[index]=val;
		});
		assert.propEqual2(obj,objCopy,"object");

		var setCopy=[];
		iterate(set,function(index,val)
		{
			setCopy.push(val);
		});
		deepEqual(setCopy,[3,1,4,5,9,2,6,8,7,0],"Set");
		
		var mapCopy={};
		iterate(map,function(index,val)
		{
			mapCopy[index]=val;
		});
		deepEqual(mapCopy,obj,"Map");
	});
	
	test("Iterator",function()
	{
		var it=Iterator([1]);
		deepEqual(it.next().value,[0,1],"array 1");
		ok(it.next().done===true,"array 2");
		
		it=Iterator({"myKey":"myValue"});
		deepEqual(it.next().value,["myKey","myValue"],"object 1");
		ok(it.next().done===true,"object 2");
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);