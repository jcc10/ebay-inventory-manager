/// <reference lib="ESNext" />

import { ebayPuppet } from "./ebay-puppeteer.ts";
import { database, ebayListingShort } from "./database.ts";


const testUser = "sunshinesstudios";
const ebp = new ebayPuppet();
await ebp.start();
const db = new database(testUser);
await db.initialize();
let page = 1;
let maxPageSeen = 1;
while(page <= maxPageSeen){
    console.log(`Loading page ${page}/${maxPageSeen}`);
    const pageContent = await ebp.cataloguePage(testUser, page, 200);
    maxPageSeen = pageContent.maxPageSeen;
    if(pageContent.skipped){
        console.error(`SKIPPED ${pageContent.skipped} ITEMS! PANIC!!!`)
    }
    console.log(`${pageContent.items.length} items found, adding to DB.`)
    for(const listing of pageContent.items){
        await db.addSimple(listing);
    }
    page++;
}

db.forceSave();
ebp.closeBrowser();
