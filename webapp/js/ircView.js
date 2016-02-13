(function(µ,SMOD,GMOD,HMOD,SC){
	
	var ircHistory=GMOD("inputHistory")("ircHistory",20);
	
	SC=SC({
		TabContainer:"TabContainer",
		Tab:"Tab",
		rq:"request",
		config:"config"
	});
	
	var container=document.createElement("div");
	container.id="ircView";
	document.currentScript.parentNode.insertBefore(container,document.currentScript.nextSibling);
	
	
	
	/**** Tabs ****/
	
	var systemTab=new SC.Tab("system");
	var tabContainer=new SC.TabContainer(systemTab);
	tabContainer.setActive(systemTab);
	var tabs=new Map();
	container.appendChild(tabContainer.domElement);
	tabContainer.onTabChange(function(event)
	{
		event.detail.newTab.header.classList.remove("unread");
	})

	
	/**** commands ****/
	
	var cmdForm=document.createElement("form");
	container.appendChild(cmdForm);
	var cmd=document.createElement("input");
	cmdForm.appendChild(cmd);
	cmd.type="text";
	cmd.name="cmd";
	var ircCommands=document.createElement("datalist");
	container.appendChild(ircCommands);
	cmd.setAttribute("list",ircCommands.id="ircCommands");
	var cmdBtn=document.createElement("button");
	cmdBtn.textContent="\u2936";
	cmdForm.appendChild(cmdBtn);
	
	var commands={
		"connect":{
			desc:"&lt;uri&gt;",
			pattern:"\\S+",
			exec:url=>({url:url}),
		},
		"join":{
			desc:"#|&amp;&lt;channel name&gt;",
			pattern:"[#&]\\w+",
			exec:channel=>({url:tabContainer.activeTab.server,channel:channel}),
		},
		"say":{
			exec:text=>({url:tabContainer.activeTab.server,target:tabContainer.activeTab.target,text:text}),
		},
		"whois":{
			desc:"&lt;username&gt;",
			exec:nick=>({url:tabContainer.activeTab.server,target:nick})
		}
	};
	var updateIrcCommands=function(history)
	{
		var html=history.map(s=>'<option value="'+s+'"></option>').join("\n");
		for(var c of Object.keys(commands))
		{
			html+='<option value="/'+c+' ">/'+c+' '+(commands[c].desc||"")+'</option>\n';
		}
		ircCommands.innerHTML=html;
	};
	
	updateIrcCommands(ircHistory.history);
	
	cmdForm.addEventListener("submit",function(event)
	{
		event.preventDefault();
		var line=cmd.value.trim();
		var command=null;
		if(line[0]=="/")
		{
			for(var c in commands)
			{
				if(line.indexOf("/"+c)==0)
				{
					line=line.slice(c.length+1).trim();
					command=c;
					break;
				}
			}
			if(command===null)return cmd.setCustomValidity("no such command");
		}
		else command="say";
		var data=commands[command].exec(line);
		SC.rq({url:"rest/irc/"+command,data:JSON.stringify(data)});
		line=cmd.value.trim();
		cmd.value="";
		updateIrcCommands(ircHistory.update(line));
	},false);
	
	var commandRegExp=new RegExp("/("+Object.keys(commands).join("|")+")","i");
	cmd.addEventListener("input",function(event)
	{
		cmd.removeAttribute("pattern");
		var match=cmd.value.match(commandRegExp);
		if(match)
		{
			var c=commands[match[1]];
			c.pattern&&cmd.setAttribute("pattern","\\"+match[0]+"\\s+"+c.pattern);
		}
	},false);
	
	
	/**** actions ****/
	
	var actions={
		"join":d=>SC.rq({url:"rest/irc/join",data:JSON.stringify({
			url:tabContainer.activeTab.server,
			channel:d.channel
		})}),
		"addDownload":d=>SC.rq({url:"rest/download/add",data:JSON.stringify([{
			network:tabContainer.activeTab.server,
			channel:tabContainer.activeTab.target,
			bot:d.bot,
			packnumber:d.packnumber
		}])}),
		"whois":d=>SC.rq({url:"rest/irc/whois",data:JSON.stringify({
			url:tabContainer.activeTab.server,
			target:d.target
		})}),
	}
	tabContainer.domElement.addEventListener("click",function(e)
	{
		if(e.target.dataset.action)
		{
			if(e.target.dataset.action in actions)
				actions[e.target.dataset.action](e.target.dataset);
			else alert("no such action :"+e.target.dataset.action);
		}
	})
	
	
	/**** Messages ****/
	
	var ircColor=/\x03(\d\d?)(?:,(\d\d?))?([^\x03]+)\x03/g;
	var ircBold=/\x02([^\x02]+)\x02/g;
	var ircItalic=/\x1D([^\x1D]+)\x1D/g;
	var ircUnderline=/\x1F([^\x1F]+)\x1F/g;
	var urlRegEx=/([a-z]{3,6}?:\/\/)?([a-z0-9\-]+\.)+[a-z]{2,6}(:\d+)?[\.\?\=\&\%\/\w\-]*\b([^@]|$)/ig;
	var downloadRegEx=/\/msg (\S+) xdcc send (\d+)/ig;
	
	var es=new EventSource("rest/irc/list");
	es.addEventListener("error",µ.logger.error);
	es.addEventListener("ping",µ.logger.debug);
	
	var onMessage=function(msg,fromList)
	{
		µ.logger.info(msg);
		var target=msg.target||msg.server;
		var tab=null;
		if(!target) tab=systemTab;
		else 
		{
			if(!tabs.has(target))
			{
				var tab=new SC.Tab(target);
				tab.server=msg.server;
				tab.target=target;
				tabContainer.add(tab);
				tabs.set(target,tab);
			}
			tab=tabs.get(target);
		}
		
		var row=document.createElement("div");
		row.classList.add("row",msg.type);
		var time=document.createElement("span");
		time.classList.add("timestamp");
		time.textContent=new Date(msg.timestamp).toLocaleTimeString();
		row.appendChild(time);
		var nick=document.createElement("span");
		nick.classList.add("nick");
		nick.dataset.action="whois";
		nick.textContent=nick.dataset.target=msg.nick;
		row.appendChild(nick);
		var text=document.createElement("span");
		text.classList.add("text");
		text.innerHTML=tranformText(msg.text);
		row.appendChild(text);
		var autoScroll=tab.content.scrollTop===tab.content.scrollTopMax;
		tab.content.appendChild(row);
		if (autoScroll)tab.content.scrollTop=tab.content.scrollTopMax;

		if(!fromList)
		{
			if(tab!=tabContainer.activeTab)tab.header.classList.add("unread");
			if(msg.type==="error")
			{
				SC.config.notify("irc_error","irc error: "+target,msg.text);
			}
			else if(msg.text.indexOf(SC.config.data.ircNick)!=-1)
			{
				row.classList.add("nickMention")
				SC.config.notify("irc_nick","irc nick: "+target,msg.text);
			}
		}
	};
	
	var tranformText=function(text)
	{
		text=text.replace(ircColor,function(match,front,back,text)
		{
			var rtn='<span class="front-';
			if(front.length!=2)front="0"+front;
			rtn+=front;
			if(back!==undefined)
			{
				if(back.length!=2)back="0"+back;
				rtn+=' back-'+back;
			}
			rtn+='">'+text+'</span>';
			return rtn;
		});
		text=text.replace(ircBold,'<b>$1</b>');
		text=text.replace(ircItalic,'<i>$1</i>');
		text=text.replace(ircUnderline,'<u>$1</u>');
		text=text.replace(downloadRegEx,'<button title="download" data-action="addDownload" data-bot="$1" data-packnumber="$2">add download</button>');
		text=text.replace(urlRegEx,t=>'<a target="_blank" href="'+t+'">'+t+'</a>');
		text=text.replace(/([#$]\w+)/g,'<button title="join" data-action="join" data-channel="$1">$1</button>');
		return text;
	}
	
	
	/**** Data ****/
	SC.config.promise.then(()=>
	{
		es.addEventListener("list",function onList (listEvent)
		{
			for(var d of JSON.parse(listEvent.data)) onMessage(d,true);
		});
		es.addEventListener("message",e=>onMessage(JSON.parse(e.data)));
		window.addEventListener("beforeunload",function(){es.close()});
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);