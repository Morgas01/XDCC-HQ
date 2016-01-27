window.addEventListener("keydown",function(e)
{
	var domTarget=null;
	if(e.ctrlKey&&e.code=="KeyI"&&(domTarget=document.querySelector("#config")))
	{
		window.location.hash="config";
		e.preventDefault();
	}
	else if(e.ctrlKey&&e.code=="KeyM"&&(domTarget=document.querySelector("#downloadManager")))
	{
		window.location.hash="downloadManager";
		e.preventDefault();
	}
	else if(e.ctrlKey&&e.code=="KeyF"&&(domTarget=document.querySelector("#search input[name=search]")))
	{
		window.location.hash="search";
		window.scrollTo(0,0);
		domTarget.select();
		e.preventDefault();
	}
	else if(e.ctrlKey&&e.code=="KeyH"&&(domTarget=document.querySelector("#irc input[name=cmd]")))
	{
		window.location.hash="irc";
		domTarget.select();
		e.preventDefault();
	} 
},false);