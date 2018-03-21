// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");



// Requiring Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");

// Require request and cheerio for scraping
var request = require("request");
var cheerio = require("cheerio");

// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

//Define port
var port = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));



// Make public a static dir
app.use(express.static("public"));

// Set Handlebars.
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
app.set("view engine", "handlebars");



// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
//mongoose.Promise = Promise;
mongoose.connect("mongodb://localhost/scraper", 
  //depreciated remove 
/*{
  useMongoClient: true
}*/);

//mongoose connection
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

// Main route (simple Hello World Message)
app.get("/", function(req, res) {
  res.send("Hello world");
  //drop database
  db.scrapedData.drop();
});

// Retrieve data from the db
app.get("/all", function(req, res) {
  // Find all results from the scrapedData collection in the db
  Article.find({}, function(error, found) {
    // Throw any errors to the console
    if (error) {
      console.log(error);
    }
    // If there are no errors, send the data to the browser as json
    else {
      res.json(found);
    }
  });
});

// Scrape data from one site and place it into the mongodb db
app.get("/scrape", function(req, res) 
{
  // Make a request for the news section of ycombinator
    //http://austinfoodmagazine.com/category/dining/
  request("http://austinfoodmagazine.com/category/dining/", function(error, response, html) 
  {
    // Load the html body from request into cheerio
    var $ = cheerio.load(html);
    //scraping directions
    //https://data-lessons.github.io/library-webscraping/02-csssel/
    // For each element with a "title" class
    $(".cb-post-title").each(function(i, element) {
    //$(".category-dining").each(function(i, element) {
     // var main=$("cb-post-title");
      // Save the text and href of each link enclosed in the current element
      var title = $(element).children("a").text();
      var link = $(element).children("a").attr("href");
      var summary =$(element).children().children(".cb-excerpt");
      console.log(summary);

      // If this found element had both a title and a link
      if (title && link  ) {
        // Insert the data in the scrapedData db
       Article.insert(
       {
          title: title,
          summary: summary,
          link: link
        },
        function(err, inserted) {
          if (err) {
            // Log the error if one is encountered during the query
            console.log(err);
          }
          else {
            // Otherwise, log the inserted data
            console.log(inserted);
          }
        });
      }
    });
  });

  // Send a "Scrape Complete" message to the browser
  res.send("Scrape Complete");

  });



// Listen on port 3000
app.listen(port, function() {
  console.log("App running on port 3000!");
});
