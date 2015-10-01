(function(µ,SMOD,GMOD,HMOD,SC){

	module("util.object.find");
	
	var find=GMOD("find");
	
	test("find",function()
	{
		var arr=[1,"4",1,4,2,1,3,5,6,2,3,7];
		var arr2=[
			{name:"tim"},
			{name:"george"},
			{name:"john"},
			{name:"alice"},
			{name:"erin"},
			{name:"lucy"},
			{name:"louise"}
		];
		var obj={
			id:5,
			price:20,
			stock:5
		};

		deepEqual(find(arr,1),[{index:0,value:1},{index:2,value:1},{index:5,value:1}],"array 1");
		deepEqual(find(arr,"4",true),["4"],"array 2");
		deepEqual(find(arr2,{name:"lucy"}),[{index:5,value:arr2[5]}],"array 3");
		deepEqual(find(arr2,{name:/i/},true),[arr2[0],arr2[3],arr2[4],arr2[6]],"array 4");

		deepEqual(find(obj,20),[{index:"price",value:20}],"object 1");
		deepEqual(find(obj,5),[{index:"id",value:5},{index:"stock",value:5}],"object 2");
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);