// deno-lint-ignore-file no-explicit-any

import {default as puppeteer, Browser, ElementHandle, Page} from "https://raw.githubusercontent.com/lucacasonato/deno-puppeteer/main/mod.ts";
import { ebayListingShort, ebayListingExtended } from "./database.ts";

export class ebayPuppet {
    private browser: Browser | null = null;
    private inProgress: Array<Promise<void>> = [];
    private mayStart = false;
    
    public async start() {
        if(this.browser){
            throw new Error("Browser is already started!");
        }
        this.browser = await puppeteer.launch();
        this.mayStart = true;
        this.inProgress = [];
    }

    public async cataloguePage(username: string, page: number, size: number) {
        const lockFunc = this.lfGen();

        // Ensure browser tab
        if(!this.browser){
            lockFunc();
            throw new Error("Puppeteer Browser isn't running!");
        }
        if(!this.mayStart){
            lockFunc();
            throw new Error("Puppeteer is shutting down!");
        }
        const tabPromise = this.browser.newPage();

        // Generate page URL
        let pageURL: string;
        if(page == 1){
            pageURL = `https://www.ebay.com/sch/m.html?_nkw=&_armrs=1&_from=&_ssn=${username}_skc=${size}&rt=nc`
        } else {
            pageURL = `https://www.ebay.com/sch/m.html?_nkw=&_armrs=1&_from=&_ssn=${username}&_pgn=${page}&_skc=${size * (page + 1)}&rt=nc`
        }
        pageURL = "https://www.ebay.com/sch/m.html?_nkw=&_armrs=1&_from=&_ssn=sunshinesstudios&_sop=10&_ipg=200&rt=nc"

        // Load Page
        // TODO: Replace this (and the browser bit) with a function for rate-limiting to stop us from getting banned.
        const tab = await tabPromise as Page;
        await tab.setViewport({
            width: 2600,
            height: 480,
        });
        await tab.goto(pageURL, {
            waitUntil: "networkidle0",
        });

        // Search for the list
        const uList = await tab.$$("#ListViewInner > li") as Array<ElementHandle>;
        if(!uList){
            throw new Error("Can not find ul from ebay.com");
        }

        // Through everything load the data
        const inProcessing: Array<Promise<ebayListingShort>> = [];
        for (const uItem of uList) {
            inProcessing.push(this.catalogueItem(uItem));
        }

        // Check for warnings
        const processed = await Promise.all(inProcessing);
        let skipped = 0;
        let firstMissingName = true;
        const items: Array<ebayListingShort> = [];
        for (const item of processed){
            const {name, id, url} = item;
            if(!name){
                if(firstMissingName){
                    firstMissingName = false;
                    continue;
                }
                console.warn("Missed getting a name!");
                skipped++
                continue;
            }
            if(id == ""){
                console.warn(`Invalid ID scraped for item ${name}`);
                skipped++
                continue;
            }
            if (url == "") {
                console.warn(`Invalid HREF scraped for item ${name}`);
                skipped++
                continue;
            }
            items.push(item);
        }

        // Update max-page counter
        const pagesElem = await tab.$(".pages") as ElementHandle;
        const maxPageSeen = await this.findMaxPage(pagesElem);

        // Close the tab.
        await tab.close();
        lockFunc();
        return { items, skipped, maxPageSeen};
    }

    protected async catalogueItem(uItem: ElementHandle): Promise<ebayListingShort> {

        // First request the data from the browser.
        const asyncQueue: Array<Promise<string | null>> = [];

        // @ts-ignore: eval function type error.
        asyncQueue.push( uItem.$eval(".lvtitle", (el: any) => el.textContent) ) // name
        asyncQueue.push( uItem.evaluate((el: any) => el.getAttribute("listingid")) ) // id
        // @ts-ignore: eval function type error.
        asyncQueue.push( uItem.$eval(".lvtitle > a", (el: any) => el.getAttribute("href")) ) // url
        // REMEMBER: THIS MAY BREAK IN THE FUTURE.
        // @ts-ignore: eval function type error.
        asyncQueue.push( uItem.$eval(".lvprice", (el: any) => el.textContent) ) // price
        // @ts-ignore: eval function type error.
        asyncQueue.push( uItem.$eval(".lvshipping", (el: any) => el.textContent) ); // shipping
        // @ts-ignore: eval function type error.
        asyncQueue.push( uItem.$eval("img", (el: any) => el.getAttribute("src")) ); // shipping

        // Then do all that nice juicy local processing.
        const asyncDone = await Promise.allSettled(asyncQueue);
        const name = stripTnT(rejectedOrEmpty(asyncDone[0]));
        const id: string = rejectedOrEmpty(asyncDone[1]);
        const url: string = rejectedOrEmpty(asyncDone[2]);
        // REMEMBER: THIS MAY BREAK IN THE FUTURE.
        const price: string = stripTnT(rejectedOrEmpty(asyncDone[3]));
        // // THIS IS FORMATTED WRONG (+{PRICE} shipping) NEED TO EXTRACT RAW SHIPPING.
        const shipping: string = stripTnT(rejectedOrEmpty(asyncDone[4]).replaceAll("+", "").replaceAll(" shipping", ""));
        const freeShip: boolean = shipping == "Free";
        // const imageUrl = uItem.getElementsByTagName("img")[0].getAttribute("src") || "";
        const imageUrl:string = rejectedOrEmpty(asyncDone[5]);
        uItem.dispose();
        if (id == "") {
            // EVERY E-Bay item is supposed to have a image, if it doesn't, we have a problem (probably multiple)
            console.warn(`Invalid SRC scraped for item's image ${name}`);
            const listing: ebayListingShort = { name, id, url, price, shipping, freeShip };
            return listing;
        } else {
            const imageRequest = await fetch(imageUrl);
            const image: Blob = await imageRequest.blob();
            const listing: ebayListingShort = { name, id, url, price, shipping, freeShip, image };
            return listing;
        }
    }

    protected async findMaxPage(element: ElementHandle): Promise<number>{
        const middleMan = await element.$$eval(".pg", (nodes: any) => nodes.map((n: any) => n.innerText)) as unknown;
        const pages = middleMan as Array<string>;
        element.dispose();
        if(pages){
            const lastPage = stripTnT(pages[pages.length - 1] || "");
            if(lastPage != ""){
                const lp = parseInt(lastPage);
                if(!isNaN(lp)){
                    return lp;
                }
            }
        }
        return 1;
    }

    public async closeBrowser() {
        this.mayStart = false;
        if(!this.browser){
            throw new Error("Browser is already closed!")
        }
        // Ensure all current scrapes are finished and prevent new scrapes from starting.
        await Promise.all(this.inProgress);
        await this.browser.close();
        this.browser = null;
    }

    protected lfGen(): ()=>void {
        // This is stupid, I feel stupid, but it should stop the race failures.
        let rezHolder = () => {};
        const rez = () => rezHolder();
        const promFunc = function (res: ()=>void) {
            rezHolder = res;
        }
        const p = new Promise(promFunc) as Promise<void>;
        this.inProgress.push(p);
        return rez;
    }
}




/*
 * SHORTHAND MACROS FOLLOW
 */

// Strips Tabs (\t) and New Lines (\n) from text.
function stripTnT(str: string): string {
    return str.replaceAll("\n", "").replaceAll("\t", "")
}

// For promises that may fail, ensures that the text is what you expect.
function rejectedOrEmpty(result: PromiseSettledResult<string | null>): string {
    return (result.status == "rejected") ? "" : (result.value) ? result.value : "";
}