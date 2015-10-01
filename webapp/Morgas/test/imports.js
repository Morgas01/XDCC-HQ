(function(){
	var WR=function(path){
		document.write('<script type="application/javascript" charset="utf-8" src="'+path+'"></script>');
	};
	
	var srcDir="../src/",
	testDir="tests/";

	
	WR(srcDir+"Morgas.js");
	WR(testDir+"test.Morgas.js");

	WR(srcDir+"Morgas.DependencyResolver.js");
	WR(testDir+"test.Morgas.DependencyResolver.js");
	
	WR(srcDir+"Morgas.Listeners.js");
	WR(testDir+"test.Morgas.Listeners.js");
	
	WR(srcDir+"Morgas.Patch.js");
	WR(testDir+"test.Morgas.Patch.js");
	
	WR(srcDir+"Morgas.Promise.js");
	WR(testDir+"test.Morgas.Promise.js");

	WR(srcDir+"Morgas.util.crc32.js");
	WR(testDir+"test.Morgas.util.crc32.js");
	
	WR(srcDir+"Morgas.util.function.rescope.js");
	WR(testDir+"test.Morgas.util.function.rescope.js");
	
	WR(srcDir+"Morgas.util.function.bind.js");
	WR(testDir+"test.Morgas.util.function.bind.js");
	
	WR(srcDir+"Morgas.util.function.proxy.js");
	WR(testDir+"test.Morgas.util.function.proxy.js");
	
	WR(srcDir+"Morgas.util.object.goPath.js");
	WR(testDir+"test.Morgas.util.object.goPath.js");
	
	WR(srcDir+"Morgas.util.object.adopt.js");
	WR(testDir+"test.Morgas.util.object.adopt.js");
	
	WR(srcDir+"Morgas.util.object.equals.js");
	WR(testDir+"test.Morgas.util.object.equals.js");
	
	WR(srcDir+"Morgas.util.object.find.js");
	WR(testDir+"test.Morgas.util.object.find.js");
	
	WR(srcDir+"Morgas.util.object.inputValues.js");
	WR(testDir+"test.Morgas.util.object.inputValues.js");
	
	WR(srcDir+"Morgas.util.object.iterate.js");
	WR(testDir+"test.Morgas.util.object.iterate.js");
	
	WR(srcDir+"Morgas.util.object.iterateAsync.js");
	WR(testDir+"test.Morgas.util.object.iterateAsync.js");
	
	WR(srcDir+"Morgas.util.Request.js");
	WR(testDir+"test.Morgas.util.request.js");
	
	WR(srcDir+"Morgas.util.object.uniquify.js");
	WR(testDir+"test.Morgas.util.object.uniquify.js");
	
	WR(srcDir+"Morgas.util.converter.csv.js");
	WR(testDir+"test.Morgas.util.converter.csv.js");

	WR(srcDir+"Morgas.SortedArray.js");
	WR(testDir+"test.Morgas.SortedArray.js");

	WR(srcDir+"Morgas.Organizer.js");
	WR(testDir+"test.Morgas.Organizer.js");

	WR(srcDir+"Morgas.NodePatch.js");
	WR(testDir+"test.Morgas.NodePatch.js");
	
	WR(srcDir+"Morgas.Worker.js");
	WR(testDir+"test.Morgas.Worker.js");
	
	//TODO

	WR(srcDir+"DB/Morgas.DB.js");
	WR(testDir+"test.Morgas.DB.js");

	WR(srcDir+"DB/Morgas.DB.ObjectConnector.js");
	WR(testDir+"test.Morgas.DB.ObjectConnector.js");

	WR(srcDir+"DB/Morgas.DB.IndexedDBConnector.js");
	WR(testDir+"test.Morgas.DB.IndexedDBConnector.js");
	

})();