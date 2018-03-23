//import mongoose
var mongoose = require("mongoose");
// Create a schema for mongoose
var Schema = mongoose.Schema;

//Note schema (design of Note model)
var NoteSchema = new Schema({
    body: {
        type: String
    },
    article: {
        type: Schema.Types.ObjectId,
        ref: "Article"
    }
});

//create a Note model in mongoose by passing in the NoteSchema and Notes
var Note = mongoose.model("Note", NoteSchema);

// Export the Note model
module.exports = Note;
