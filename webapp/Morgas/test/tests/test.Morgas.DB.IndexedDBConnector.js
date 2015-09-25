(function(µ,SMOD,GMOD,HMOD,SC){
	module("DB.IndexedDBConnector");
	var ICON=GMOD("IndexedDBConnector");

	indexedDB.deleteDatabase("testDB");
	window.DBTest(new ICON("testDB"));
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);