const mongoose=require("mongoose");

const dataSchema=new mongoose.Schema({
  name:{
    type:String,

  },
  image:{
    type:String,
    
  },
  content:{
    type:String,
  }

})

module.exports=mongoose.model("data",dataSchema);