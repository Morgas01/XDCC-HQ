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
	    alert("valid:"+searchForm.isValid());
	})
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);