(function(µ,SMOD,GMOD,HMOD,SC){
	module("SortedArray");
	
	var SA=GMOD("SortedArray");
	var goPath=GMOD("goPath");
	
	test("numbers",function()
	{
		var sArr=new SA()
		.sort("ASC",SA.simple(false))
		.sort("DESC",SA.simple(true));

		sArr.add([6,2,9,3,1]);
		sArr.add({a:7,b:5,c:4,d:0,e:8});

		deepEqual(sArr.get("ASC"),[0,1,2,3,4,5,6,7,8,9],"asc");
		deepEqual(sArr.get("DESC"),[9,8,7,6,5,4,3,2,1,0],"desc");
		sArr.remove([0,2,4,6,8]);
		deepEqual(sArr.get("ASC"),[1,3,5,7,9],"asc deleted");
		deepEqual(sArr.get("DESC"),[9,7,5,3,1],"desc deleted");
		sArr.clear();
		deepEqual(sArr.get("ASC"),[],"clear");
	});
	
	test("strings",function()
	{
		var sArr=new SA()
		.sort("ASC",SA.simple(false))
		.sort("DESC",SA.simple(true));

		sArr.add(["s","o","r","t","e","d"]);
		sArr.add({
			a:"a",
			f:"r",
			h:"r",
			p:"a",
			x:"y"
		});

		deepEqual(sArr.get("ASC"),["a","a","d","e","o","r","r","r","s","t","y"],"asc");
		deepEqual(sArr.get("DESC"),["y","t","s","r","r","r","o","e","d","a","a"],"desc");
	});
	
	test("object",function()
	{
		var guide=goPath.guide(["data","value"]);
		var sArr=new SA()
		.sort("ASC",SA.simpleGetter(guide,false))
		.sort("DESC",SA.simpleGetter(guide,true));
		
		var data=[
			{
				id:0,
				group:"rabbit",
				data:{value:31},
				active:false
			},
			{
				id:1,
				group:"rabbit",
				data:{value:47},
				active:true
			},
			{
				id:2,
				group:"hedgehog",
				data:{value:11},
				active:false
			},
			{
				id:3,
				group:"hedgehog",
				data:{value:19},
				active:true
			},
			{
				id:4,
				group:"hedgehog",
				data:{value:3},
				active:true
			}
		 ];
		
		sArr.add(data);

		deepEqual(sArr.get("ASC"),[data[4],data[2],data[3],data[0],data[1]],"asc");
		deepEqual(sArr.get("DESC"),[data[1],data[0],data[3],data[2],data[4]],"desc");
		data[2].data.value=28;
		data[0].data.value=15;
		sArr.update([data[0],data[2]]);
		deepEqual(sArr.get("ASC"),[data[4],data[0],data[3],data[2],data[1]],"asc updated");
		deepEqual(sArr.get("DESC"),[data[1],data[2],data[3],data[0],data[4]],"desc updated");
	});

	test("library",function()
	{
		var library={
			first:1,
			second:2,
			third:3,
			fourth:4,
			fifth:5,
			sixth:6
		};

		var sArr=new SA(["fifth","second","third","sixth","first","nothing"],library)
			.sort("ASC",SA.simple(false))
			.sort("DESC",SA.simple(true));

		deepEqual(sArr.get("ASC"),[1,2,3,5,6,undefined],"asc");
		deepEqual(sArr.get("DESC"),[6,5,3,2,1,undefined],"desc");
		library.nothing=0;
		library.first=7;
		sArr.update(["first","nothing"]);
		deepEqual(sArr.get("ASC"),[0,2,3,5,6,7],"asc");
		deepEqual(sArr.get("DESC"),[7,6,5,3,2,0],"desc");
		sArr.remove(["nothing"]);
		deepEqual(sArr.get("ASC"),[2,3,5,6,7],"asc");
		deepEqual(sArr.get("DESC"),[7,6,5,3,2],"desc");
	});
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);