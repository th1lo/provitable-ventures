query MyQuery {
  task(id: "67af4c1405c58dc6f7056667") {
    name
    wikiLink
    objectives {
      id
      ... on TaskObjectiveItem {
        id
        count
        description
      }
    }
  }
}

{
  "data": {
    "task": {
      "name": "Profitable Venture",
      "wikiLink": "https://escapefromtarkov.fandom.com/wiki/Profitable_Venture",
      "objectives": [
        {
          "id": "67af6dd0f5685508d9050158",
          "count": 15,
          "description": "Hand over the item: Trijicon REAP-IR thermal scope"
        }
      ]
    }
  }
}

now we just need the ids of all the quests related to all on red 

we have the names of the quests:

Profitable Venture - 67af4c1405c58dc6f7056667
Safety Guarantee - 67af4c169d95ad16e004fd86
Never Too Late To Learn - 67af4c17f4f1fb58a907f8f6
Get a Foothold - 67af4c1991ee75c6d7060a16
Profit Retention - 67af4c1a6c3ebfd8e6034916
A Life Lesson - 67af4c1cc0e59d55e2010b97
Consolation Prize - 67af4c1d8c9482eca103e477

we want to have the barter / craft search logic based on this 

lets create a small test to build this logic first before we integrate it into the app also consider the current codebase when creating the logic therefore check the codebase 