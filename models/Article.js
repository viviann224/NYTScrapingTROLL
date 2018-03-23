//import mongoose and Note js files
var mongoose = require("mongoose");
var Note = require("./Note");
// Create Schema for mongoose
var Schema = mongoose.Schema;

//Note schema (design of Article model)
var ArticleSchema = new Schema({
  title: 
  {
    type: String,
    required: true
  },
  summary: 
  {
    type: String,
    required: true
  },
  link: 
  {
    type: String,
    required: true
  },
  saved: 
  {
    type: Boolean,
    default: false
  },
  notes: 
  [{
     type: Schema.Types.ObjectId,
     ref: "Note"
  }]
});

//create an Article model into mongoose by passing in Article and ArticleSchema
var Article = mongoose.model("Article", ArticleSchema);

// Export the Article model
module.exports = Article;
