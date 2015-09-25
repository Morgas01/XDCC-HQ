(function(µ,SMOD,GMOD,HMOD,SC){

	module("util.converter.csv");
	
	var CSV=GMOD("CSV");
	
	SC=SC({
		prom:"Promise",
		rq:"request"
	});
	
	asyncTest("csv",function()
	{
		new SC.prom([SC.rq("resources/csv.csv"),SC.rq("resources/tsv.tsv")]).then(function(csvData,tsvData)
		{
			var expected={
				columns:["field1","field2","field3"],
				data:[
					{
						_line:"1,2,3",
						_overflowCells:[],
						field1:"1",
						field2:"2",
						field3:"3"
					},
					{
						_line:"4,5,6,7,8",
						_overflowCells:["7","8"],
						field1:"4",
						field2:"5",
						field3:"6"
					},
					{
						_line:'9,"""special"", \ncharacters",10',
						_overflowCells:[],
						field1:"9",
						field2:'"special", \ncharacters',
						field3:"10"
					},
				]
			};
			deepEqual(CSV.from(csvData),expected,"csv");
			
			expected={
					columns:["field1","field2","field3"],
					data:[
						{
							_line:"1\t2\t3",
							_overflowCells:[],
							field1:"1",
							field2:"2",
							field3:"3"
						},
						{
							_line:"4\t5\t6\t7\t8",
							_overflowCells:["7","8"],
							field1:"4",
							field2:"5",
							field3:"6"
						},
						{
							_line:'9\t"""special""\t\ncharacters"\t10',
							_overflowCells:[],
							field1:"9",
							field2:'"special"\t\ncharacters',
							field3:"10"
						},
					]
				};
			deepEqual(CSV.from(tsvData,expected.columns,"\t"),expected,"tsv");
			start();
		});
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);