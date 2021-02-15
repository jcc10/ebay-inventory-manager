/// <reference lib="ESNext" />

import { getOnePage, closeBrowser } from "./ebay.ts";
import { database, ebayListingShort } from "./database.ts";


const testUser = "sunshinesstudios";
const p1 = await getOnePage(testUser, 1, 200);
console.log(p1.items.length);
console.log((await getOnePage(testUser, 2, 200)).items.length)
console.log((await getOnePage(testUser, 3, 200)).items.length)
console.log((await getOnePage(testUser, 4, 200)).items.length)
closeBrowser();
// const db = new database(testUser);
// await db.initialize();
// let page = 1;
// let maxPageSeen = 1;
// while(page <= maxPageSeen){
//     console.log(`Loading page ${page}/${maxPageSeen}`);
//     const pageContent = await getOnePage(testUser, page, 200);
//     maxPageSeen = pageContent.maxPageSeen;
//     if(pageContent.skipped >= 2){
//         console.error(`SKIPPED ${pageContent.skipped} ITEMS! PANIC!!!`)
//     }
//     console.log(`${pageContent.items.length} items found, adding to DB.`)
//     for(const listing of pageContent.items){
//         await db.addSimple(listing);
//     }
//     page++;
// }

// db.forceSave();
