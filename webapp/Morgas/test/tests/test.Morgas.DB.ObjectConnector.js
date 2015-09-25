(function(µ,SMOD,GMOD,HMOD,SC){
	module("DB.ObjectConnector");
	var OCON=GMOD("ObjectConnector");
	
	window.DBTest(new OCON(true));
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);