/* Undirected non-negative weighted graph; usable in browser and Node tests. */
(function(root){
function shortestPath(nodes,edges,start,end){
 const adj=new Map(nodes.map(n=>[n.id,[]]));
 for(const e of edges){if(!adj.has(e.a)||!adj.has(e.b)||!Number.isFinite(e.weight)||e.weight<0)throw Error('Некорректное ребро');if(e.closed)continue;adj.get(e.a).push([e.b,e.weight]);adj.get(e.b).push([e.a,e.weight]);}
 if(!adj.has(start)||!adj.has(end))return null;
 const dist=new Map([[start,0]]),prev=new Map(),remaining=new Set(adj.keys());
 while(remaining.size){let u=null,best=Infinity;for(const id of remaining)if((dist.get(id)??Infinity)<best){best=dist.get(id);u=id;}if(u===null)break;remaining.delete(u);if(u===end){const path=[u];while(prev.has(u)){u=prev.get(u);path.unshift(u);}return {path,cost:best};}for(const [v,w]of adj.get(u)){if(remaining.has(v)&&best+w<(dist.get(v)??Infinity)){dist.set(v,best+w);prev.set(v,u);}}}
 return null;
}
root.shortestPath=shortestPath;if(typeof module!=='undefined')module.exports={shortestPath};
})(typeof window==='undefined'?globalThis:window);
