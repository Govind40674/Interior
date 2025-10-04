const mongoose=require("mongoose");

const dataSchema=new mongoose.Schema({
 username:{
    type:String,
    required:true
 },
 password:{
    type:String,
    required:true
 },
 email:{
   type:String,
  
 }
})

module.exports=mongoose.model("login",dataSchema);