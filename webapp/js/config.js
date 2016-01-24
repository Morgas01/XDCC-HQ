(function(µ,SMOD,GMOD,HMOD,SC){
	
	var container=document.createElement("div");
	container.id="config";
	container.innerHTML='\
		<table>\
			<tr><td>server port</td><td><input name="serverPort" required min="0" type="number"></td><td>needs restart</td></tr>\
			<tr><td>file expiration</td><td><input name="fileExpiration" required min="0" type="number"></td><td>expiration time in days for files used in searches</td></tr>\
			<tr><td>irc nick</td><td><input name="ircNick" required type="text"></td><td>no change to connected networks</td></tr>\
			<tr><td>download directory</td><td><input name="downloadDir" required type="text"></td><td><input name="resolvedDownloadDir" type="text" disabled></td></tr>\
			<tr><td>autoStart downloads</td><td><input name="autoStartDownloads" type="checkbox"></td><td>initial pause state</td></tr>\
			<tr><td>maximum downloads</td><td><input name="maxDownloads" required min="1" type="number"></td></tr>\
			<tr><td>download timeout</td><td><input name="downloadTimeout" required min="0" type="number"></td></tr>\
			<tr><td>resume downloads</td><td><input name="resume" type="checkbox"></td></tr>\
			<tr><td>resume timeout</td><td><input name="resumeTimeout" required min="0" type="number"></td></tr>\
			<tr><td>file suffix</td><td><input name="fileSuffix" type="text"></td><td>suffix for file while downloading</td></tr>\
			<tr><td>check name</td><td><input name="checkName" type="checkbox"></td></tr>\
			<tr><td>clean name</td><td><input name="cleanName" type="checkbox"></td></tr>\
			<tr><td>append CRC32</td><td><input name="appendCRC" type="checkbox"></td></tr>\
		</table>\
	';
	
	var SC=SC({
		req:"request",
		gIn:"getInputValues",
		sIn:"setInputValues",
	});
	
	var updateConfig=function(data)
	{
		return SC.req.json({
			url:"rest/config",
			contentType:"application/json",
			data:JSON.stringify(data)
		}).then(function(config)
		{
			SC.sIn(container.querySelectorAll("input"),config);
			return config;
		},µ.logger.error);
	}
	
	
	document.currentScript.parentNode.insertBefore(container,document.currentScript.nextSibling);
	container.addEventListener("change",function(e)
	{
		updateConfig(SC.gIn([e.target]));
	});
	
	updateConfig();
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);