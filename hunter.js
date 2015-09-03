var http=require("http");

var subOffice=require("./subOffices/"+process.argv[2]);
var url=subOffice.getUrl(process.argv[3]);

console.log(url);

http.get(url,function(response)
{
	var data="";
	response.on("data",function(chunk)
	{
		data+=chunk;
	});
	response.on("end",function()
	{
		var results=subOffice.parse(data);
		process.send(JSON.stringify(results));
	})
})