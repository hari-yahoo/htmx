const express = require('express')
const app = express()
const port = 3000

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get("/section1", (req, res) => {
    res.send("<p>This is Section 1 </p>")
})

app.get("/section2", (req, res) => {
    res.send("<p>SECTION 2 </p>")
})
app.get("/section3", (req, res) => {
    res.send("<p>SECTION 33333 </p>")
})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})