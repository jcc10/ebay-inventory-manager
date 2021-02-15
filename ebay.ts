/**
 * Ebay Scraping Code
 */

import { ebayListingShort, ebayListingExtended } from "./database.ts";

function stripTnT(str: string): string {
    return str.replaceAll("\n", "").replaceAll("\t", "")
}

import puppeteer from "https://raw.githubusercontent.com/lucacasonato/deno-puppeteer/main/mod.ts";

const browser = await puppeteer.launch();
const tab = await browser.newPage();

export async function getOnePage(username: string, page: number, size: number) {
    let pageURL: string;
    if(page == 1){
        pageURL = `https://www.ebay.com/sch/m.html?_nkw=&_armrs=1&_from=&_ssn=${username}_skc=${size}&rt=nc`
    } else {
        pageURL = `https://www.ebay.com/sch/m.html?_nkw=&_armrs=1&_from=&_ssn=${username}&_pgn=${page}&_skc=${size * (page + 1)}&rt=nc`
    }
    pageURL = "https://www.ebay.com/sch/m.html?_nkw=&_armrs=1&_from=&_ssn=sunshinesstudios&_sop=10&_ipg=200&rt=nc"
    console.log(pageURL);
    await tab.goto(pageURL, {
        waitUntil: "networkidle0",
    });

    const uList = await tab.$$("#ListViewInner > li");

    const items: Array<ebayListingShort> = [];
    if(!uList){
        throw new Error("Can not find ul from ebay.com");
    }
    let skipped = 0;
    let firstMissingName = true;
    for (const uItem of uList) {
        // @ts-expect-error
        const name: string = stripTnT((await uItem.$eval(".lvtitle", (el: any) => el.textContent)) || "");
        if(!name){
            if(firstMissingName){
                firstMissingName = false;
                continue;
            }
            console.warn("Missed getting a name!");
            skipped++
            continue;
        }

        const id: string = (await uItem.evaluate((el: any) => el.getAttribute("listingid"))) || "";
        if(id == ""){
            console.warn(`Invalid ID scraped for item ${name}`);
            skipped++
            continue;
        }
        // @ts-expect-error
        const url: string = (await uItem.$eval(".lvtitle > a", (el: any) => el.getAttribute("href"))) || "";
        if (url == "") {
            console.warn(`Invalid HREF scraped for item ${name}`);
            skipped++
            continue;
        }
        // REMEMBER: THIS MAY BREAK IN THE FUTURE.
        // @ts-expect-error
        const price: string = stripTnT((await uItem.$eval(".lvprice", (el: any) => el.textContent)));
        // // THIS IS FORMATTED WRONG (+{PRICE} shipping) NEED TO EXTRACT RAW SHIPPING.
        // @ts-expect-error
        const shipping: string = stripTnT((await uItem.$eval(".lvshipping", (el: any) => el.textContent))).replaceAll("+", "").replaceAll(" shipping", "");
        const freeShip: boolean = shipping == "Free";
        // const imageUrl = uItem.getElementsByTagName("img")[0].getAttribute("src") || "";
        // @ts-expect-error
        const imageUrl:string = (await uItem.$eval("img", (el: any) => el.getAttribute("src"))) || "";
        if (id == "") {
            console.warn(`Invalid SRC scraped for item's image ${name}`);
        } else {
            const imageRequest = await fetch(imageUrl);
            const image: Blob = await imageRequest.blob();
            const listing: ebayListingShort = { name, id, url, price, shipping, freeShip, image };
            items.push(listing);
        }
    }
    let maxPageSeen = 1;
    // {
    //     const pages = doc.getElementsByClassName("pages")[0].children;
    //     if(pages){
    //         const lastPage = stripTnT(pages[pages.length - 1].textContent || "");
    //         console.log(`Last page is ${lastPage}`)
    //         if(lastPage != ""){
    //             const lp = parseInt(lastPage);
    //             if(!isNaN(lp)){
    //                 maxPageSeen = lp;
    //             }
    //         }
    //     }
        
    // }
    tab.close();
    return { items, skipped, maxPageSeen};
}

export async function closeBrowser() {
    console.log("Closing puppeteer browser...")
    await browser.close();
}