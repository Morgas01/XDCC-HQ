window.addEventListener("keydown",function(e)
{
	//SC=SC({});

	var domTarget=null;
	if(e.ctrlKey&&e.code=="KeyI"&&(domTarget=document.querySelector("#configView")))
	{
		e.preventDefault();
		window.location.hash="configView";
	}
	else if(e.ctrlKey&&e.code=="KeyM"&&(domTarget=document.querySelector("#downloadView [data-action=pause]")))
	{
		window.location.hash="downloadView";
		domTarget.focus();
		e.preventDefault();
	}
	else if(e.ctrlKey&&e.code=="KeyF"&&(domTarget=document.querySelector("#searchView input[name=search]")))
	{
		e.preventDefault();
		window.location.hash="searchView";
		document.querySelector("#searchView").scrollTo(0,0);
		domTarget.select();
	}
	else if(e.ctrlKey&&e.code=="KeyH"&&(domTarget=document.querySelector("#ircView input[name=cmd]")))
	{
		e.preventDefault();
		window.location.hash="ircView";
		domTarget.select();
	} 
},false);