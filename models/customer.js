const mongoose=require("mongoose");

const dataSchema=new mongoose.Schema({
image:{
  type:String,
},
name:{
  type:String,
},
review:{
  type:String,
}
})

module.exports=mongoose.model("customer",dataSchema);
  