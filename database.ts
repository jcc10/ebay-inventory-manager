import { FileDB, Document, Collection } from "https://deno.land/x/filedb/mod.ts";

export interface ebayListingShort extends Document {
    id: string,
    name: string,
    url: string,
    price: string,
    shipping: string,
    freeShip: boolean,
    image?: Blob,
}

export interface ebayListingExtended extends Document {
    id: string,
    category: string[],

}

export interface locationTreeLeaf extends Document {
    id: string,
    at: string,
}

export interface locationTree extends Document {
    location: string,
    name: string,
    under: string,
}

export class database {
    private db: FileDB;
    private short: undefined | Collection<ebayListingShort>;
    private extended: undefined | Collection<ebayListingExtended>;
    constructor(account: string){
        this.db = new FileDB({ rootDir: `./${account}-data`, isAutosave: true });    
    }

    async initialize() {
        this.short = await this.db.getCollection<ebayListingShort>("short");
        this.extended = await this.db.getCollection<ebayListingExtended>("extended");
    }

    async addSimple(listing: ebayListingShort) {
        if(!this.short){
            throw new Error("DB not initialized!");
        }
        const dupe = this.short.findMany((elm: ebayListingShort) => {
            if(
                elm.id == listing.id ){
                    return true;
                }
        }).retrieveData();
        const possibleDupe = this.short.findMany((elm: ebayListingShort) => {
            if(
                elm.name == listing.name ||
                elm.image == listing.image ){
                    return true;
                }
        }).retrieveData();
        if(dupe.length > 0){
            console.error(`Duplicate Item  ID ${listing.id}!`)
            return;
        }
        if(possibleDupe.length > 0){
            let s = "";
            for(const i of possibleDupe){
                s = s + " Item ID " + i.id;
            }
            console.error(`Possible Duplicate${s}`);
        }
        await this.short.insertOne(listing);
        console.log(`Added ${listing.name}`);
    }

    async forceSave() {
        await this.db.save();
    }
}
