import express from "express" 
const app = express()
const port = 3000

app.get('/', (req, res) => {
    const books = [
        {
          title: "The Awakening",
          author: "Kate Chopin",
          year: "2020",
          month: "10",
          publisher: "Ariel",
        },
        {
          title: "City of Glass",
          author: "Paul Auster",
          year: "2022",
          month: "10",
          publisher: "Marvel",
        },
      ];
    res.json(books)
})


app.listen(port, () => {
    console.log(`Example app listening  on port ${port}`)
})