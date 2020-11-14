

export async function getOnePage(username: string, page: number) {
    const req = await fetch(`https://www.ebay.com/sch/m.html?_nkw=&_armrs=1&_from=&_ssn=${username}&_pgn=${page}&_skc=200&rt=nc`);
    return req;
}