(function(µ,SMOD,GMOD,HMOD,SC){

	var SC=SC({
	    Config:"Config",
	    form:"gui.form"
	});

    var searchConfig=SC.Config.parse({
        type:"array",
        model:{
            type:"string",
            pattern:/.+/
        },
        default:[""]
    });
	var searchForm=SC.form(searchConfig, undefined,"Search");
	searchForm.id="searchForm"
	document.body.appendChild(searchForm);

	document.getElementById("searchBtn").addEventListener("click",function()
	{
	    if(searchForm.isValid())
	    {
	        var terms=searchForm.getConfig().get();
	        document.getElementById("searchFrame").contentWindow.postMessage(terms,"*");
	    }
	})
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);