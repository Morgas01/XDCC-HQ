(function(µ,SMOD,GMOD,HMOD,SC){

	var SC=SC({
		req:"request"
	});
	//TODO set µ.logger.out
	
	var updateConfig=function()
	{
		var dom=document.getElementById("config");
		return SC.req.json("rest/config").then(function(config)
		{
			var html='<table>';
			for(var i in config)
			{
				html+='<tr><td>'+i+'</td><td>';

				switch(typeof config[i])
				{
					case "number":
						html+='<input type="number" min="0" value="'+config[i]+'">';
						break;
					case "boolean":
						html+='<input type="checkbox" checked="'+config[i]+'">';
						break;
					default:
						html+='<input type="text" value="'+config[i]+'">';
				}
				html+='</td></tr>'
			}
			html+='</table>';
			dom.innerHTML=html;
			
			return config;
		},errorlogger);
	}
	
	var errorlogger=function(e)
	{
		µ.logger.error(e);
		throw e;
	}
	
	
	
	
	updateConfig()
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);