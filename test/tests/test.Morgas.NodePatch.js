(function(µ,SMOD,GMOD,HMOD,SC){
	module("NodePatch");
	SC=SC({
		node:"NodePatch"
	});
	
	test("connect",function()
	{
		var parent=new SC.node.Basic(),
		child1=new SC.node.Basic(),
		child2=new SC.node.Basic();
		
		parent.addChild(child1);
		child2.setParent(parent);
		
		ok(parent===child1.parent&&parent.hasChild(child1),"child1 connected");
		ok(parent===child2.parent&&parent.hasChild(child2),"child2 connected");
		
		parent.removeChild(child1);
		child2.remove();
		
		ok(parent!==child1.parent&&!parent.hasChild(child1),"child1 removed");
		ok(parent!==child2.parent&&!parent.hasChild(child2),"child2 removed");
		
	});
	
	test("alias",function()
	{
		var parent=new SC.node.Basic({addChild:"add",removeChild:"remove",remove:null}),
		child1=new SC.node(new µ.BaseClass(),{parent:"up"}).instance,
		child2=new SC.node({},{parent:"parent",setParent:"fuse",remove:"explode"}).instance;
		
		parent.add(child1);
		child2.fuse(parent);
		
		ok(parent===child1.up&&parent.hasChild(child1),"child1 connected");
		ok(parent===child2.parent&&parent.hasChild(child2),"child2 connected");
		
		parent.remove(child1);
		child2.explode();
		
		ok(parent!==child1.up&&!parent.hasChild(child1),"child1 removed");
		ok(parent!==child2.parent&&!parent.hasChild(child2),"child2 removed");
		
	});

	test("alias predefined",function()
	{
		var confirmNode= µ.Class({
            init:function()
            {
                this.nodePatch=new SC.node(this,SC.node.BasicAliases);
            },
            addChild:function(child,confirm)
            {
                if(confirm)
                {
                    return this.nodePatch.addChild(child);
                }
                return false;
            }
        });
		var confirmNode2= µ.Class({
            init:function()
            {
                this.nodePatch=new SC.node(this,SC.node.BasicAliases);
            },
            remove:function(confirm)
            {
                if(confirm)
                {
                    return this.nodePatch.remove();
                }
                return false;
            }
        });

        var parent=new confirmNode(),
            child1=new confirmNode2(),
            child2=new SC.node.Basic();

        parent.addChild(child1,true);
        child2.setParent(parent);

        ok(parent===child1.parent&&parent.hasChild(child1),"child1 connected");
        ok(parent!==child2.parent&&!parent.hasChild(child2),"child2 not connected");
        parent.addChild(child2,true);
        ok(parent==child2.parent&&parent.hasChild(child2),"child2 connected");

        parent.removeChild(child1);
        child2.remove();

        ok(parent===child1.parent&&parent.hasChild(child1),"child1 not removed");
        child1.remove(true);
        ok(parent!==child1.parent&&!parent.hasChild(child1),"child1 removed");
        ok(parent!==child2.parent&&!parent.hasChild(child2),"child2 removed");

	});
	
	test("change",function()
	{
		var parent1=new SC.node.Basic(),
		parent2=new SC.node.Basic(),
		child=new SC.node.Basic();
		
		parent1.addChild(child);

		ok(parent1===child.parent&&parent1.hasChild(child),"parent1 connected");
		ok(parent2!==child.parent&&!parent2.hasChild(child),"parent2 not connected");
		
		parent2.addChild(child);
		
		ok(parent1!==child.parent&&!parent1.hasChild(child),"parent1 not connected");
		ok(parent2===child.parent&&parent2.hasChild(child),"parent2 connected");
	});

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);