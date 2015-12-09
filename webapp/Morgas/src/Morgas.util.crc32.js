(function(µ,SMOD,GMOD,HMOD,SC){
	
	var util=µ.util=µ.util||{};
	
	// found somewhere on the internet

	var CRC32=util.crc32=function(data,crcPart)
	{
		var isString=typeof data==="string";
		var crc= crcPart!=null ? ((crcPart^-1)<<0) : 0^(-1);
		for (var i=0;i<data.length;i++)
		{
			var b=isString ? data.charCodeAt(i) : data[i];
			crc=(crc>>>8)^CRC32.get((crc^b)&0xFF);
		}
		return (crc^(-1))>>>0;
	};
	CRC32.table={};
	CRC32.get=function(n)
	{
	   if(CRC32.table.n==null)
	   {
		   var c=n;
		   for(var k=0;k<8;k++){
			   c=((c&1)?(0xEDB88320^(c>>>1)):(c>>>1));
		   }
		   CRC32.table[n]=c;
	   }
	   return CRC32.table[n];
	};

	CRC32.Builder=function(crcPart)
	{
		this.crcPart=crcPart!=null ? crcPart : 0;
	};
	CRC32.Builder.prototype.add=function(data)
	{
		this.crcPart=CRC32(data,this.crcPart);
		return this;
	};
	CRC32.Builder.prototype.get=function(){return this.crcPart;};

	SMOD("util.crc32",CRC32);
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);