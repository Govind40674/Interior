const mongoose=require("mongoose");

const dataSchema=new mongoose.Schema({
image:{
  type:String,
}
})

module.exports=mongoose.model("client",dataSchema);
