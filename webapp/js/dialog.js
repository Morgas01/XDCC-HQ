function openDialog (contentHTML)
{
	var dialog=document.createElement("div");
	dialog.classList.add("dialog");
	
	var content=document.createElement("div");
	content.classList.add("content");
	content.innerHTML=contentHTML;
	
	var closeBtn=document.createElement("button");
	closeBtn.textContent="close";
	closeBtn.addEventListener("click",function()
	{
		dialog.remove();
	});
	content.appendChild(closeBtn);
	dialog.appendChild(content);
	
	document.body.appendChild(dialog);
	
	var tA=content.querySelector("textArea");
	if(tA) tA.select();
	else closeBtn.focus();
	return dialog;
}