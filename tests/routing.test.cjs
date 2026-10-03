const assert=require('node:assert/strict');
const {shortestPath}=require('../routing.js');
const data=require('../data/building.json');
const ns=['a','b','c','d'].map(id=>({id}));
const es=[{a:'a',b:'b',weight:10},{a:'a',b:'c',weight:2},{a:'c',b:'b',weight:1}];
assert.deepEqual(shortestPath(ns,es,'a','b'),{path:['a','c','b'],cost:3});
assert.equal(shortestPath(ns,es,'a','d'),null);
assert.equal(shortestPath(ns,es,'unknown','b'),null);
assert.deepEqual(shortestPath(ns,es,'a','a'),{path:['a'],cost:0});
assert.deepEqual(shortestPath(ns,es,'b','a').path,['b','c','a']);
assert.equal(shortestPath(ns,es.map(e=>({...e,closed:true})),'a','b'),null);
assert.throws(()=>shortestPath(ns,[{a:'a',b:'b',weight:-1}],'a','b'));
assert.equal(new Set(data.nodes.map(n=>n.id)).size,data.nodes.length);
for(const start of data.nodes)for(const end of data.nodes){const r=shortestPath(data.nodes,data.edges,start.id,end.id);assert.ok(r);for(let i=1;i<r.path.length;i++)assert.ok(data.edges.some(e=>(e.a===r.path[i-1]&&e.b===r.path[i])||(e.b===r.path[i-1]&&e.a===r.path[i])));}
const r=shortestPath(data.nodes,data.edges,'113','714');
assert.ok(r.path.some(id=>id.startsWith('s')));
console.log('OK: weighted shortest path, reversal, identical endpoints, unreachable and unknown endpoints, closed edges, invalid weights, all building pairs and cross-floor route.');
