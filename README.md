# All On Red

Live cost of Skier's "All on Red" task line in Escape from Tarkov (Profitable Venture, Safety Guarantee,
Never Too Late To Learn, Get a Foothold, Profit Retention, A Life Lesson, Consolation Prize), for the three
game modes PvP, PvE and the current PvP season.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Where the data comes from

All data comes from the tarkov.dev JSON API. The old GraphQL endpoint (`api.tarkov.dev/graphql`) no longer
answers.

- Endpoint list: https://json.tarkov.dev/endpoints
- Files used per game mode: `/{mode}/items`, `/tasks`, `/barters`, `/crafts`, `/traders`, `/hideout`, plus the
  matching `_en` files for the English names. `{mode}` is `regular` (PvP), `pve` or `pvp-season`.
- The season name and end date come from `/pvp-season/season`.

## How a price is calculated

Each quest item is priced at the cheapest way to get one:

| Way | Cost of one item |
| --- | --- |
| Flea market | 24h average price (last low price if there is no average) |
| Trader, for money | the trader's price in roubles |
| Barter | cost of the items handed over, divided by how many you get |
| Hideout craft | cost of the items used up, divided by how many you get. Tools are not counted |
| Preset or pack | price of the whole thing, minus what the other parts sell for, divided by how many quest items are inside |

Details:

- Barter and craft ingredients are priced at the cheaper of flea market and trader.
- GP coins are priced at tarkov.dev's GP coin value.
- An ingredient that cannot be bought anywhere is counted at what a trader pays for it. That way is marked
  "Rough price" and is only used when there is no exact one.
- Parts of a preset are sold where they bring more: to the best trader, or on the flea market after the fee.
- Consolation Prize has no item to hand over. It needs Labs raids, so one Labs keycard per required
  extraction is added.
- Trader levels, task unlocks and restock limits are shown, not filtered.

## Code

```
app/
├── api/tarkov-data/route.ts   GET /api/tarkov-data?gameMode=regular|pve|pvp-season
├── lib/tarkov-api.ts          downloads the JSON files, keeps the result for 2 minutes
├── lib/quest-costs.ts         all price calculation (pure functions)
├── hooks/useTarkovData.ts     loads one game mode in the browser, reloads every 5 minutes
├── components/                QuestTable, TarkovSummary, CacheStatus, shared/ItemTable
├── constants/tarkov-data.ts   task ids, game modes
└── types/tarkov.ts            shape of the API response
```

The server asks tarkov.dev for the item file with `If-None-Match`. If prices have not changed, the last
result is reused without downloading anything.

Data provided by [tarkov.dev](https://tarkov.dev).
