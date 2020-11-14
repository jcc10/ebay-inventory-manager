import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

export interface ebayListing {
    name: string,
    id: string,
    url: string,
    price: string,
    shipping: string,
    freeShip: boolean,
    image: Blob,
}

function stripTnT(str: string): string {
    return str.replaceAll("\n", "").replaceAll("\t", "")
}

export async function getOnePage(username: string, page: number) {
    const req = await fetch(`https://www.ebay.com/sch/m.html?_nkw=&_armrs=1&_from=&_ssn=${username}&_pgn=${page}&_skc=200&rt=nc`);
    const html = await req.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc){
        throw new Error("Invalid HTML from ebay.com");
    }
    const uList = doc.getElementById("ListViewInner")?.children;
    const items: Array<ebayListing> = [];
    if(!uList){
        throw new Error("Can not find ul from ebay.com");
    }
    let skipped = 0;
    for (const uItem of uList) {
        const name: string = stripTnT(uItem.getElementsByClassName("lvtitle")[0]?.textContent || "");
        if(!name){
            console.warn("Missed getting a name!");
            skipped++
            continue;
        }
        const id: string = uItem.getAttribute("listingid") || "";
        if(id == ""){
            console.warn(`Invalid ID scraped for item ${name}`);
            skipped++
            continue;
        }
        const url: string = uItem.getElementsByClassName("lvtitle")[0].children[0].getAttribute("href") || "";
        if (url == "") {
            console.warn(`Invalid HREF scraped for item ${name}`);
            skipped++
            continue;
        }
        // REMEMBER: THIS MAY BREAK IN THE FUTURE.
        const price: string = stripTnT(uItem.getElementsByClassName("lvprice")[0].textContent);
        // THIS IS FORMATTED WRONG (+{PRICE} shipping) NEED TO EXTRACT RAW SHIPPING.
        const shipping: string = stripTnT(uItem.getElementsByClassName("lvshipping")[0].textContent).replaceAll("+", "").replaceAll(" shipping", "");
        const freeShip: boolean = shipping == "Free";
        const imageUrl = uItem.getElementsByTagName("img")[0].getAttribute("src") || "";
        if (id == "") {
            console.warn(`Invalid SRC scraped for item's image ${name}`);
            skipped++
            continue;
        }
        const imageRequest = await fetch(imageUrl);
        const image: Blob = await imageRequest.blob();
        const listing = { name, id, url, price, shipping, freeShip, image };
        items.push(listing);
    }
    let maxPageSeen: number = 1;
    {
        const pages = doc.getElementsByClassName("pages")[0].children;
        if(pages){
            const lastPage = stripTnT(pages[pages.length - 1].textContent || "");
            if(lastPage != ""){
                const lp = parseInt(lastPage);
                if(!isNaN(lp)){
                    maxPage = lp;
                }
            }
        }
        
    }
    
    return { items, skipped, maxPageSeen};
}