(function(µ,SMOD,GMOD,HMOD,SC){
	
	var util=µ.util=µ.util||{};
	
	// found somewhere on the internet
	
	var that=util.crc32=function(data)
	{
		var isString=typeof data==="string";
		var crc=0^(-1);
		for (var i=0;i<data.length;i++)
		{
			var b=isString ? data.charCodeAt(i) : data[i];
			crc=(crc>>>8)^that.get((crc^b)&0xFF);
		}
		return (crc^(-1))>>>0;
	};
	that.table={};
	that.get=function(n)
	{
	   if(that.table.n==null)
	   {
		   var c=n;
		   for(var k=0;k<8;k++){
			   c=((c&1)?(0xEDB88320^(c>>>1)):(c>>>1));
		   }
		   that.table[n]=c;
	   }
	   return that.table[n];
	};
	SMOD("util.crc32",util.crc32);
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);