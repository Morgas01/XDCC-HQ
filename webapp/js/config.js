(function(µ,SMOD,GMOD,HMOD,SC){
	
	var SC=SC({
		req:"request",
	});
	
	var config={
		data:null,
		promise:null,
		updateConfig:function(data)
		{
			config.promise=SC.req.json({
				url:"rest/config",
				contentType:"application/json",
				data:JSON.stringify(data)
			});
			config.promise.then(d=>config.data=d);
			return config.promise;
		},
		notify:function(type,title,text)
		{
			if(config.data&&config.data.notification&&config.data.notification[type])
			{
				return new Notification(title,{tag:type,icon:"images/Logo.svg",body:text});
			}
		}
	};
	config.updateConfig();
	
	SMOD("config",config);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);