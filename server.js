var http=require("http");
var path=require("path");
var fs=require("fs");
var url=require("url");
var querystring=require("querystring");

require("./webapp/Morgas/src/NodeJs/Morgas.NodeJs");
var logger=require("./logger")("server");
var goPath=µ.getModule("goPath");
var config=require("./config");
logger.info("starting server",config);

var rest={};
var server=http.createServer(function(request,response)
{
	if(request.url==="/")request.url="index.html";
	else request.url=request.url.slice(1);
	var parsedUrl=url.parse(request.url);
	if (parsedUrl.pathname.slice(0,5)==="rest/")
	{
		var restPath=parsedUrl.pathname.slice(5).split("/");
		if(!(restPath[0] in rest))
		{
			try
			{
				rest[restPath[0]]=require(path.join(__dirname,"webapp","rest",restPath[0]));
			}
			catch (e)
			{
				logger.error({error:e},"could not load rest service %s",restPath[0],request.url);
				return fillResponse(response,500,e);
			}
		}
		var service=goPath(rest,restPath);
		if(!service)
		{
			logger.error("service "+restPath.join("/")+" not found",request.url);
			fillResponse(response,404,"service "+restPath.join("/")+" not found");
		}
		else
		{
			try
			{
				var result=service(request,querystring.parse(parsedUrl.query),response);
				if(result instanceof Promise) result.then(fillResponse.bind(null,response,200),fillResponse.bind(null,response,500)); 
				else if(result!=undefined) fillResponse(response,200,result);
			}
			catch(e)
			{
				logger.error("service error",e);
				fillResponse(response,500,e);
			}
		}
	}
	else
	{
		var stat,filePath=path.join(__dirname,"webapp",parsedUrl.pathname);
		if(fs.existsSync(filePath)&&(stat=fs.statSync(filePath)).isFile())
		{
			var headers={
				"Content-Type":getMimeType(filePath),
				"Content-Length":stat.size
			};
			response.writeHead(200, headers);
			fs.createReadStream(filePath).pipe(response);
		}
		else
		{
			logger.error("file %s not found",filePath);
			return fillResponse(response,404,filePath+" not found");
		}
	}
});

server.listen(config.serverPort);

logger.info("server startet",config.serverPort);

var fillResponse=function(response,status,param)
{
	var data="";
	var type="text/plain";
	if(param instanceof Error) data=param.message+"\n\n"+param.stack;
	else if (typeof param ==="string")data=param;
	else
	{
		type="application/json";
		data=JSON.stringify(param);
	}
	
	response.writeHead(status, {
		"Content-Type":type,
		"Content-Length":Buffer.byteLength(data, 'utf8')
	});
	response.end(data);
};
var getMimeType=function(fileName)
{
	switch(path.extname(fileName))
	{
		case ".html":	return "text/html";
		case ".css":	return "text/css";
		case ".js":		return "application/javascript";
		default : 		return "application/octet-stream";
	}
}