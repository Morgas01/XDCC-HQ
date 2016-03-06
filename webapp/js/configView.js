(function(µ,SMOD,GMOD,HMOD,SC){
	
	var config=GMOD("config")
	
	var SC=SC({
		gIn:"getInputValues",
		sIn:"setInputValues",
	});
	
	var container=document.createElement("div");
	container.id="configView";

	config.promise.then(function(data)
	{
		container.innerHTML='\
			<fieldset>\
				<legend>General</legend>\
				<table>\
					<tr><td>server port</td><td><input name="serverPort" required min="0" type="number"></td><td>needs restart</td></tr>\
					<tr><td>search timeout</td><td><input name="searchTimeout" required min="0" type="number"></td><td>timeout to wait for suboffice\'s response</td></tr>\
					<tr><td>file expiration</td><td><input name="fileExpiration" required min="0" type="number"></td><td>expiration time in days for files used in searches</td></tr>\
					<tr><td>irc nick</td><td><input name="ircNick" required type="text"></td><td>no change to connected networks</td></tr>\
				</table>\
			</fieldset>\
			<fieldset>\
				<legend>Downloads</legend>\
				<table>\
					<tr><td>download directory</td><td><input name="downloadDir" required type="text"></td><td><input name="resolvedDownloadDir" type="text" disabled></td></tr>\
					<tr><td>autoStart downloads</td><td><input name="autoStartDownloads" type="checkbox"></td><td>initial pause state</td></tr>\
					<tr><td>maximum downloads</td><td><input name="maxDownloads" required min="1" type="number"></td></tr>\
					<tr><td>download timeout</td><td><input name="downloadTimeout" required min="0" type="number"></td><td>ms</td></tr>\
					<tr><td>resume downloads</td><td><input name="resume" type="checkbox"></td></tr>\
					<tr><td>resume timeout</td><td><input name="resumeTimeout" required min="0" type="number"></td><td>ms</td></tr>\
					<tr><td>file suffix</td><td><input name="fileSuffix" type="text"></td><td>suffix for file while downloading</td></tr>\
					<tr><td>check name</td><td><input name="checkName" type="checkbox"></td></tr>\
					<tr><td>clean name</td><td><input name="cleanName" type="checkbox"></td></tr>\
					<tr><td>append CRC32</td><td><input name="appendCRC" type="checkbox"></td></tr>\
					<tr><td>disable downloads with same name</td><td><input name="disableByName" type="checkbox"></td></tr>\
				</table>\
			</fieldset>\
			<fieldset>\
				<legend class="'+Notification.permission+'"><button name="requestNotification">Notification</button></legend>\
				<table>\
					<tr><td><button name="testNotify">test notification</button></td></tr>\
					<tr><td>download failed</td><td><input data-path="notification" name="download_failed" type="checkbox"/></td></tr>\
					<tr><td>download error</td><td><input data-path="notification" name="download_error" type="checkbox"/></td></tr>\
					<tr><td>download warning</td><td><input data-path="notification" name="download_warning" type="checkbox"/></td></tr>\
					<tr><td>download complete</td><td><input data-path="notification" name="download_complete" type="checkbox"/></td></tr>\
					<tr><td>all downloads complete</td><td><input data-path="notification" name="download_allComplete" type="checkbox"/></td></tr>\
					<tr><td>irc error</td><td><input data-path="notification" name="irc_error" type="checkbox"/></td></tr>\
					<tr><td>irc nick mentioned</td><td><input data-path="notification" name="irc_nick" type="checkbox"/></td></tr>\
				</table>\
			</fieldset>\
			<fieldset>\
				<legend>subOffices</legend>\
				<table>\
					'+Object.keys(data.subOffices).sort()
					.map(k=>'<tr><td>'+k+'</td><td><input type="checkbox" data-path="subOffices" name="'+k+'"/></td></tr>').join("\n")+'\
				</table>\
			</fieldset>\
		';
		updateDom(data);
	});
	var updateDom=function(data)
	{
		SC.sIn(container.querySelectorAll("input"),data);
		container.querySelector("input[name=resolvedDownloadDir]").title=data.resolvedDownloadDir
	};
	
	
	document.currentScript.parentNode.insertBefore(container,document.currentScript.nextSibling);
	container.addEventListener("change",function(e)
	{
		config.updateConfig(SC.gIn([e.target])).then(updateDom);
	});
	container.addEventListener("click",function(e)
	{
		if(e.target.tagName==="BUTTON")
		{
			switch (e.target.name)
			{
				case "requestNotification":
					Notification.requestPermission(p=>e.target.parentNode.setAttribute("class",p));
					break;
				case "testNotify":
					new Notification("test",{body:"test message",icon:"images/Logo.svg"})
					break;
			}
		}
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);