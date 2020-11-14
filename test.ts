import { getItemListingsPage } from "./ebay.ts";

const testUser = "sunshinesstudios";

let testA = await getItemListingsPage(testUser, 1);

console.log({testA});