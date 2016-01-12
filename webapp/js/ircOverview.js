(function(µ,SMOD,GMOD,HMOD,SC){
	
	SC=SC({
		TabContainer:"TabContainer",
		Tab:"Tab",
		rq:"request"
	});
	
	/**** Tabs ****/
	
	var systemTab=new SC.Tab("system");
	var tabContainer=new SC.TabContainer([systemTab]);
	var tabs=new Map();
	document.body.insertBefore(tabContainer.domElement,document.body.firstElementChild);

	
	/**** commands ****/
	var commands={
		"connect":url=>({path:"connect",url:url}),
		"join":channel=>({path:"join",url:tabContainer.activeTab.server,channel:channel}),
		"msg":text=>({path:"say",url:tabContainer.activeTab.server,target:tabContainer.activeTab.target,text:text}),
	};
	var dataList=document.getElementById("commands");
	for(var c in commands)
	{
		var option=document.createElement("option");
		option.value="/"+c;
		dataList.appendChild(option);
	}
	document.getElementById("cmd").addEventListener("change",function(event)
	{
		var line=event.target.value.trim();
		var command="msg";
		for(var c in commands)
		{
			if(line.indexOf("/"+c)==0)
			{
				line=line.slice(c.length+1).trim();
				command=c;
				break;
			}
		}
		var data=commands[command](line);
		SC.rq({url:"rest/irc/"+data.path,data:JSON.stringify(data)});
	},false);
	
	
	/**** Messages ****/
	
	var urlRegEx=/([a-z]{3,6}?:\/\/)?([a-z0-9\-]+\.)+[a-z]{2,6}(:\d+)?[\.\?\=\&\%\/\w\-]*\b([^@]|$)/ig;
	
	var es=new EventSource("rest/irc/list");
	es.addEventListener("error",µ.logger.error);
	es.addEventListener("ping",µ.logger.debug);
	
	var onMessage=function(msg)
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
		var time=document.createElement("span");
		time.classList.add("timestamp");
		time.textContent=msg.timestamp;
		row.appendChild(time);
		var nick=document.createElement("span");
		nick.classList.add("nick");
		nick.textContent=msg.nick;
		row.appendChild(nick);
		var text=document.createElement("span");
		text.classList.add("text");
		text.classList.add(msg.type);
		text.innerHTML=tranformText(msg.text);
		row.appendChild(text);
		tab.content.appendChild(row);
	};
	var tranformText=function(text)
	{
		text=text.replace(/\n/g,"<br>");
		text=text.replace(urlRegEx,t=>'<a target="_blank" href="'+t+'">'+t+'</a>');
		text=text.replace(/([#$]\w+)/g,'<button data-channel="$1">$1</button>');
		return text;
	}
	
	es.addEventListener("list",function onList (listEvent)
	{
		for(var d of JSON.parse(listEvent.data)) onMessage(d);
	});
	es.addEventListener("message",e=>onMessage(JSON.parse(e.data)));
	window.addEventListener("beforeunload",function(){es.close()})
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);