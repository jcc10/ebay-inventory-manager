/// <reference lib="ESNext" />

import { getOnePage } from "./ebay.ts";

const testUser = "sunshinesstudios";

let testA = await getOnePage(testUser, 1);

console.log({testA});