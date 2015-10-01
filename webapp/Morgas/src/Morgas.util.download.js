(function(µ,SMOD,GMOD,HMOD,SC){
	
	var util=µ.util=µ.util||{};
	util.download=function(data,name,mediaType)
	{
		if(data instanceof Blob)
		{
			data=URL.createObjectURL(data)
		}
		name=name||"file";
		mediaType=mediaType||"";
		
		util.download.el.download=name;
		if(data.startsWith("data:")||data.startsWith("blob:"))
		{
			util.download.el.href=data;
		}
		else
		{
			util.download.el.href="data:"+mediaType+";base64,"+btoa(unescape(encodeURIComponent(data)));
		}
		document.body.appendChild(util.download.el);
		util.download.el.click();
		util.download.el.remove();
	};
	util.download.el=document.createElement("a");
	SMOD("download",util.download);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);