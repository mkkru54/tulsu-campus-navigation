/* Optional UI checks: npm install --no-save playwright; npx playwright install chromium.
   Start python3 server.py --port 8765 first. */
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-10-07T10:00:00+03:00')});
 let mode='ok';
 await page.route('**/api/schedule?*',async route=>{
 const lesson=(time,aud)=>({DATE_Z:'07.10.2026',TIME_Z:time,DISCIP:'Проверка',AUD:aud});
 const payload=mode==='invalid'?{status:'invalid_group',message:'Группа не найдена'}:mode==='empty'?{status:'ok',lessons:[],group:'221351'}:{status:'ok',group:'221351',lessons:[lesson('09:40 - 11:15','9-714'),lesson('11:35 - 13:10',mode==='outside'?'12-209':'9-305')]};
 await route.fulfill({status:mode==='invalid'?404:200,contentType:'application/json',body:JSON.stringify(payload)});
 });
 const load=async()=>{await page.locator('#group').fill('221351');await page.locator('#schedule-load').click();await page.waitForFunction(()=>!document.getElementById('schedule-load').disabled);};
 await page.goto('http://127.0.0.1:8765');
 assert.match(await page.locator('#result').innerText(),/113.*714/);
 await load();assert.equal(await page.locator('#from').inputValue(),'714');assert.equal(await page.locator('#to').inputValue(),'305');assert.match(await page.locator('#result').innerText(),/714.*305/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('tulsu.navigation9.group')),'221351');
 await page.locator('#from').fill('113');await page.locator('#route-form button.primary').click();await page.clock.runFor(31000);assert.equal(await page.locator('#from').inputValue(),'113');
 await page.locator('#schedule-route').click();assert.equal(await page.locator('#from').inputValue(),'714');
 mode='outside';await load();assert.ok(await page.locator('#schedule-route').isDisabled());assert.match(await page.locator('#schedule-route-status').innerText(),/другой корпус/);
 mode='invalid';await load();assert.match(await page.locator('#schedule-status').innerText(),/не найдена/);assert.ok(await page.locator('#schedule-route').isDisabled());
 mode='empty';await load();assert.match(await page.locator('#schedule-status').innerText(),/занятий нет/);
 mode='ok';await load();await page.reload();await page.waitForFunction(()=>document.getElementById('from').value==='714');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#group-forget').click();assert.equal(await page.evaluate(()=>localStorage.getItem('tulsu.navigation9.group')),null);
 assert.deepEqual(errors,[]);await page.screenshot({path:process.env.SCREENSHOT_PATH||'/tmp/navigation9-preview.png',fullPage:true});
 await browser.close();console.log('UI OK: map, manual route, automatic route, preserved manual edits, other building, invalid group, no lessons, saved group, mobile width.');
})().catch(error=>{console.error(error);process.exit(1);});
