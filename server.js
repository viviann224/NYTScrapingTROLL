// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");

//importing Notes and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");

// web scraping tools
var request = require("request");
var cheerio = require("cheerio");

// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

//Define port
var port = process.env.PORT || 8080

// Initialize Express
var app = express();

//Use morgan and body parser with our app (middleware)
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

// Make static  directory starting at public files
app.use(express.static("public"));

//broiler plate Handlebars setup
var exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
app.set("view engine", "handlebars");

// Database configuration with mongoose logic to either run on local server or mLab
var MONGODB_URI= process.env.MONGODB_URI ||"mongodb://localhost/scraper";
 mongoose.Promise = Promise;
 mongoose.connect(MONGODB_URI);

var db = mongoose.connection;
//if error in mongoose connections, display error
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

//if logged correctly tell user connnection sucessful
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

// Routes
// ======
//routing for handlebars
app.get("/", function(req, res) {
  Article.find({"saved": false}, function(error, data) {
    var hbsObject = {
      article: data
    };
    console.log(hbsObject);
    res.render("home", hbsObject);
  });
});

//method to get all saved articles to displayed on save/bookmarked page by searching for true logic on saved
app.get("/saved", function(req, res) {
  Article.find({"saved": true}).populate("notes").exec(function(error, articles) {
    var hbsObject = {
      article: articles
    };
    res.render("saved", hbsObject);
  });
});

//scrape method for the nyt
app.get("/scrape", function(req, res) {
  //get the site and we want to html info
  request("https://www.nytimes.com/", function(error, response, html) {
    //pass nyt html info into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(html);
    //so all the data is contained in the article tag so go ahead and do an each selector to grab info
    $("article").each(function(i, element) {

      //start with an empty result array to store into Article obj
      var result = {};

      //find the title, summary, and link and go ahead an store into variables to pass into array
      result.title = $(this).children("h2").text();
      result.summary = $(this).children(".summary").text();
      result.link = $(this).children("h2").children("a").attr("href");

      //create a new instance  entry of the Article model and pass in the array (title, summary, link)
      var entry = new Article(result);

      //go ahead and pass the instance of entry and save into the db
      entry.save(function(err, doc) {
        //if error go ahead and display it 
        if (err) {
          console.log(err);
        }
        //display the data
        else {
          console.log(doc);
        }
      });

    }); //tell user scrap was sucessful/complete
        res.send("Scrape Complete");

  });
});

//gets all the articles from previous  scrape method 
app.get("/articles", function(req, res) {
  //goes to the db and gets all the articles in the db
  Article.find({}, function(error, doc) {
    //display errors
    if (error) {
      console.log(error);
    }
    //else go ahead and spit back the data in json and throw into browser 
    else {
      res.json(doc);
    }
  });
});

//gets all info on the article by id
app.get("/articles/:id", function(req, res) {
  //using input (req.params.id) go ahead and find the associated id from the db 
  Article.findOne({ "_id": req.params.id })
  //and  also get the associated notes within the articles
  .populate("note")
  //and pass it
  .exec(function(error, doc) {
    //display any errors
    if (error) {
      console.log(error);
    }
    //if good to go return to json format
    else {
      res.json(doc);
    }
  });
});


//method save / bookmark an article
app.post("/articles/save/:id", function(req, res) {
      //associate the article id to update the saved bool logic
      Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true})
      //go ahead and run
      .exec(function(err, doc) {
        //display any errors
        if (err) {
          console.log(err);
        }
        else {
          //else send data to html
          res.send(doc);
        }
      });
});

//delete the article
app.post("/articles/delete/:id", function(req, res) {
      //associated the article id to update the saved bool logic
      Article.findOneAndUpdate({ "_id": req.params.id }, {"saved": false, "notes": []})
      //go ahead and run the query
      .exec(function(err, doc) {
        //display any errors
        if (err) {
          console.log(err);
        }
        else {
          // delete and update to browser
          res.send(doc);
        }
      });
});


//save a new note
app.post("/notes/save/:id", function(req, res) 
{
  //create an instance of note and pass inputs (article and note) from req
  var newNote = new Note(
  {
    body: req.body.text,
    article: req.params.id
  });
  //pass newNote obj and save the note the db
  newNote.save(function(error, note) {
    //display any errors
    if (error) {
      console.log(error);
    }
    // else go ahead and throw into db
    else {
      // associated article id to and update the notes and push the notes into an array
      Article.findOneAndUpdate({ "_id": req.params.id }, {$push: { "notes": note } })
      // Execute the above query
      .exec(function(err) {
        // display any errors
        if (err) {
          console.log(err);
          res.send(err);
        }
        else {
          // else go ahead and pass the new note to the browser
          res.send(note);
        }
      });
    }
  });
});

//delete a note by passing in the current id (req.params.note_id)
app.delete("/notes/delete/:note_id/:article_id", function(req, res) {
  //associate with note id to delete
  Note.findOneAndRemove({ "_id": req.params.note_id }, function(err) {
    //display any errors
    if (err) {
      console.log(err);
      res.send(err);
    }
    else {
      Article.findOneAndUpdate({ "_id": req.params.article_id }, {$pull: {"notes": req.params.note_id}})
       // Execute the above query
        .exec(function(err) {
          //display any errors
          if (err) {
            console.log(err);
            res.send(err);
          }
          else {
            //else go ahead and tell user note is deleted
            res.send("Note Deleted");
          }
        });
    }
  });
});

//listening to port
app.listen(port, function() {
  console.log("App running on port " + port);
});