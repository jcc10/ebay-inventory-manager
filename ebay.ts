import { DOMParser, Element, HTMLDocument } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

export interface ebayListing {
    name: string,
    id: string,
    url: string,
    price: string,
    shipping: string,
    freeShip: boolean,
    image: Blob,
}

export async function getOnePage(username: string, page: number) {
    const req = await fetch(`https://www.ebay.com/sch/m.html?_nkw=&_armrs=1&_from=&_ssn=${username}&_pgn=${page}&_skc=200&rt=nc`);
    const html = await req.text();
    const doc: HTMLDocument | null = new DOMParser().parseFromString(html, "text/html");
    if(doc === null){
        throw new Error("Invalid HTML from ebay.com");
    } else {
        const uList = doc.getElementById("ListViewInner").children;
        const items: Array<ebayListing> = [];
        for (const uItem of uList) {
            const name: string = uItem.getElementsByClassName("lvtitle")[0].textContent;
            const id: string = uItem.getAttribute("listingid");
            //const url: string = uItem.getElementsByClassName("lvtitle")[0].children[0].href;
            // REMEMBER: THIS MAY BREAK IN THE FUTURE.
            const price: string = uItem.getElementsByClassName("lvprice")[0].textContent;
            // THIS IS FORMATTED WRONG (+{PRICE} shipping) NEED TO EXTRACT RAW SHIPPING.
            const shipping: string = uItem.getElementsByClassName("lvshipping")[0].textContent;
            const freeShip: boolean = uItem.getElementsByClassName("lvshipping")[0].textContent == "Free shipping";
            //const imageRequest = await fetch(uItem.getElementsByTagName("img")[0].src);
            //const image: Blob = await imageRequest.blob();
            const listing = { name, id, /*url,*/ price, shipping, freeShip, /*image*/ };
            return listing;
            break;
            //items.push(listing);
        }
        return items;
    }
}