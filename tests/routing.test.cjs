const test=require('node:test'),assert=require('node:assert/strict');
const {shortestPath}=require('../routing.js');
const nodes=['714','stairs7','stairs3','312'].map(id=>({id}));
const edges=[{a:'714',b:'stairs7',weight:1},{a:'stairs7',b:'stairs3',weight:4},{a:'stairs3',b:'312',weight:1},{a:'714',b:'312',weight:20}];
test('existing routing chooses cheaper path in both directions',()=>{assert.equal(shortestPath(nodes,edges,'714','312').cost,6);assert.equal(shortestPath(nodes,edges,'312','714').cost,6);});
test('same, unknown, closed nodes and invalid weights',()=>{assert.equal(shortestPath(nodes,edges,'714','714').cost,0);assert.equal(shortestPath(nodes,edges,'x','312'),null);assert.equal(shortestPath(nodes,edges.map(e=>({...e,closed:true})),'714','312'),null);assert.throws(()=>shortestPath(nodes,[{a:'714',b:'312',weight:-1}],'714','312'));});
