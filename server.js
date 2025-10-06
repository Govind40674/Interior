require('dotenv').config();
function formatError(err) {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err.message) return err.message;
  try { return JSON.stringify(err); } catch (e) { return String(err); }
}

const express = require("express");
const path = require("path");
const PORT = process.env.PORT;
const mongoose = require("mongoose");
const data = require("./models/data");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const csrf = require("csurf");
const login = require("./models/login");
const upload = require("./multer/mult");
const client = require("./models/client");
const nodemailer = require("nodemailer");
const session=require("express-session");
const otpGenerator = require("otp-generator"); 
const Typed = require("typed.js");
const customer=require("./models/customer");
const cors=require("cors");
const { v2: cloudinary } = require("cloudinary");
const minifyHTML = require("express-minify-html-terser");
const compression=require("compression");
const rateLimit=require("express-rate-limit");
const helmet=require("helmet");


const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const limiter=rateLimit({
  windowMs: 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});




// ------------------ Database ------------------
main()
  .then(() => console.log("Database connected"))
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
}

// ------------------ App Setup ------------------
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(  minifyHTML({
    override: true,
   
    htmlMinifier: {
      removeComments: true,
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeEmptyAttributes: true,
    },
  }),
);
app.use(compression({
  level:9,
  threshold: 10 * 1024
}));
// app.use(limiter);
// app.use(helmet());



const csrfProtection = csrf({ cookie: true });


const transporter=nodemailer.createTransport({
  host:"smtp.gmail.com",
  port:587,
  secure:false,
  auth:{
    user:process.env.EMAIL,
    pass:process.env.EMAIL_PASS,
  }
});


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static("images"));
// app.use("/uploads", express.static("uploads"));
app.use(cors());

app.get("/", async (req, res) => {
  const data1 = await data.find({});
  const data2=await client.find({});
  const data3=await customer.find({});
  res.render("home", { data1,data2,data3 });

});

// ✅ GET form (generate token and inject in hidden input)

app.get("/about", async (req, res) => {
  let data1=await client.find({});
  let data2=await customer.find({});
  res.render("about",{data1,data2});
});
app.get("/services", async (req, res) => {
  let data1=await data.find({});
  res.render("services",{data1});
});
app.get("/contact",csrfProtection, async (req, res) => {
  const error=req.query.error || null;
  res.render("contact",{csrfToken: req.csrfToken(),error});
});
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
app.post("/sendmail",csrfProtection,async(req,res)=>{
 
  let {from,subject,message}=req.body;
  if(!from||!subject||!message){
    return res.redirect("/contact?error=All fields are required");
  }
  if(!isValidEmail(from)){
    return res.redirect("/contact?error=Invalid email address");
  }

 
try{
  let info=await transporter.sendMail({
    from: `<${from}>`,
    to: process.env.EMAIL,
    subject: subject,
    text: message,
  });
  return res.redirect("/");

}catch(error){
 
  return res.redirect("/contact");
};
});


app.post("/login-push", csrfProtection,async (req, res) => {
  const { username,email, password } = req.body;
  const user = await login.findOne({username:username,email:email });
  // console.log(user);

  if (user && user.password == password) {
    // req.session.username=username;
    res.cookie("username",username,
      {
        maxAge:24*60*60*1000
      });

    res.redirect("/admin");
  } else {
    res.render("login",{error:"Invalid username or password",csrfToken: req.csrfToken()});
  }
});
app.get("/admin", csrfProtection,async (req, res) => {
  if(!req.cookies.username){
  res.render("login",{error:null,csrfToken: req.csrfToken()});
 
  }else{
      res.render("upload", { error1: null,error2:null,error3:null,csrfToken: req.csrfToken() });

  }
 
  
});




app.post(
  "/upload",
  upload.single("image"),  // ✅ first multer parses file & body
  csrfProtection,          // ✅ then CSRF protection runs
  async (req, res) => {
    try {
      // 🔴 Not logged in
      if (!req.cookies.username) {
        return res.render("login", { 
          error: "Please login first", 
          csrfToken: req.csrfToken() 
        });
      }

      // 🔴 No file uploaded
      if (!req.file) {
        return res.render("upload", { 
          error1: "No file uploaded!", 
          error2: null,
          error3: null,
          csrfToken: req.csrfToken()
        });
      }

      // 🔴 Check file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.render("upload", { 
          error1: "Only JPG, PNG, and WEBP files are allowed.", 
          error2: null,
          error3: null,
          csrfToken: req.csrfToken()
        });
      }

      // ✅ Save data
      const data1 = new data({
        name: req.body.name,
        image: req.file.path, // cloudinary/multer gives the path/url
        content: req.body.content,
      });

      await data1.save();
      res.redirect("/");

    } catch (err) {
      res.render("error", { error: "Something went wrong while saving data." });
    }
  }
);
app.post(
  "/upload-client",
  upload.single("image"),  // ✅ first multer parses file & body
  csrfProtection,          // ✅ then CSRF protection runs
  async (req, res) => {
    try {
      // 🔴 Not logged in
      if (!req.cookies.username) {
        return res.render("login", { 
          error: "Please login first", 
          csrfToken: req.csrfToken() 
        });
      }

      // 🔴 No file uploaded
      if (!req.file) {
        return res.render("upload", { 
          error1: "No file uploaded!", 
          error2: null,
          error3: null,
          csrfToken: req.csrfToken()
        });
      }

      // 🔴 Check file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.render("upload", { 
          error2: "Only JPG, PNG, and WEBP files are allowed.", 
          error1: null,
          error3: null,
          csrfToken: req.csrfToken()
        });
      }

      // ✅ Save data
      const data1 = new client({
       
        image: req.file.path, // cloudinary/multer gives the path/url
     
      });

      await data1.save();
      res.redirect("/");

    } catch (err) {
      res.render("error", { error: "Something went wrong while saving data." });
    }
  }
);
app.post(
  "/customer",
  upload.single("image"),  // ✅ first multer parses file & body
  csrfProtection,          // ✅ then CSRF protection runs
  async (req, res) => {
    try {
      // 🔴 Not logged in
      if (!req.cookies.username) {
        return res.render("login", { 
          error: "Please login first", 
          csrfToken: req.csrfToken() 
        });
      }

      // 🔴 No file uploaded
      if (!req.file) {
        return res.render("upload", { 
          error1: "No file uploaded!", 
          error2: null,
          error3: null,
          csrfToken: req.csrfToken()
        });
      }

      // 🔴 Check file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.render("upload", { 
          error3: "Only JPG, PNG, and WEBP files are allowed.", 
          error2: null,
          error1: null,
          csrfToken: req.csrfToken()
        });
      }

      // ✅ Save data
      const data1 = new customer({
        name: req.body.name,
        image: req.file.path, // cloudinary/multer gives the path/url
        review: req.body.review,
      });

      await data1.save();
      res.redirect("/");

    } catch (err) {
      res.render("error", { error: "Something went wrong while saving data." });
    }
  }
);



app.get("/forget",csrfProtection, async (req, res) => {
  
  const error=req.query.error;
  res.render("forget",{csrfToken: req.csrfToken(),error});
});
app.post("/forget-push",csrfProtection, async (req, res) => {
 
  const { email } = req.body;

  const user = await login.findOne({email:email });


  if (user) {
     const otp =await otpGenerator.generate(4, { 
    upperCaseAlphabets: false, 
    specialChars: false, 
    alphabets: false 
  });
  // req.session.otp=otp;
  res.cookie("otp",otp,
    {
      maxAge:2*60*1000
    });
 
 res.cookie("email",email,
    {
      maxAge:10*60*1000
    });
  let info=await transporter.sendMail({
    from: `<${process.env.EMAIL}>`,
    to: email,
    subject: "OTP",
    text: otp,
  });
    res.render("forget2",{csrfToken: req.csrfToken(),error:null});
  } else {
    res.render("forget",{error:"Invalid email",csrfToken: req.csrfToken()});

  
}
});
app.post("/forget2-push-check",csrfProtection, async (req, res) => {
 
  const { otp } = req.body;
  if(otp==req.cookies.otp){
    let user=await login.findOne({email:req.session.email});
    // req.session.user=user.username;
    res.cookie("user",user.username,
      {
        maxAge:10*60*1000
      });
      res.clearCookie("otp");
      
   
    res.render("setpassword",{csrfToken: req.csrfToken(),error:"please set password",username:user.username});
  }else{
    res.render("forget2",{error:"Invalid OTP",csrfToken: req.csrfToken()});
  }
});
app.post("/setpassword-push",csrfProtection, async (req, res) => {
 
  const { username,password } = req.body;
  if(!password){
    return res.render("setpassword",{csrfToken: req.csrfToken(),error:"enter password",username:user.username});
    
  }
 if(username){
  await login.deleteOne({email:req.cookies.email,username:req.cookies.user});
  const user = new login({
    username: username,
    password: password,
    email: req.cookies.email
  });
  await user.save();
  res.clearCookie("user");
  res.clearCookie("email");
res.render("login",{error:null,csrfToken: req.csrfToken()});
 }else{

await login.updateOne({email:req.session.email,username:req.session.user},{$set:{password:password}});
 res.clearCookie("user");
  res.clearCookie("email");
res.render("login",{error:null,csrfToken: req.csrfToken()});



 }
});





app.get("/previous-services", async (req, res) => {
    if(!req.cookies.username){
  return res.render("login",{error:"please login first",csrfToken: req.csrfToken()});
 
  }
  const data1 = await data.find();
  res.render("prvservices", { data1 });
});
app.get("/previous-clients", async (req, res) => {
    if(!req.cookies.username){
  return res.render("login",{error:"please login first",csrfToken: req.csrfToken()});
 
  }
  const data1 = await client.find();
  res.render("prvclients", { data1 });
});
app.get("/previous-reviews", async (req, res) => {
    if(!req.cookies.username){
  return res.render("login",{error:"please login first",csrfToken: req.csrfToken()});
 
  }
  const data1 = await customer.find();
  res.render("prvcustomer", { data1 });
})
app.get("/services-delete/:id", async (req, res) => {
    if(!req.cookies.username){
  return res.render("login",{error:"please login first",csrfToken: req.csrfToken()});
 
  }
 const {id}=req.params;
  await data.deleteOne({ _id: id });
  res.redirect("/previous-services");
})
app.get("/clients-delete/:id", async (req, res) => {
    if(!req.cookies.username){
  return res.render("login",{error:"please login first",csrfToken: req.csrfToken()});
 
  }
   const {id}=req.params;
  await client.deleteOne({ _id: id });
  res.redirect("/previous-clients");
})
app.get("/reviews-delete/:id", async (req, res) => {
    if(!req.cookies.username){
  return res.render("login",{error:"please login first",csrfToken: req.csrfToken()});
 
  }
  const {id}=req.params;
  await customer.deleteOne({ _id: id });
  res.redirect("/previous-reviews");
  
});
app.get("/logout",async (req,res)=>{
  res.clearCookie("username");
 
  res.redirect("/");

})
// app.use((err, req, res, next) => {

app.use((err, req, res, next) => {
  const msg = formatError(err);

  if (req.path.startsWith("/upload-client")) {
    return res.render("upload", { 
      error2:"only jpg,png,webp files are allowed", 
      error1: null, 
      error3: null, 
      csrfToken: req.csrfToken ? req.csrfToken() : "" 
    });
  }

  if (req.path.startsWith("/customer")) {
    return res.render("upload", { 
      error3:"only jpg,png,webp files are allowed", 
      error1: null, 
      error2: null, 
      csrfToken: req.csrfToken ? req.csrfToken() : "" 
    });
  }

  if (req.path.startsWith("/upload")) {
    return res.render("upload", { 
      error1:"only jpg,png,webp files are allowed" ,
      error2: null, 
      error3: null, 
      csrfToken: req.csrfToken ? req.csrfToken() : "" 
    });
  }

  res.status(500).render("error", { error: msg });
});




app.get("/:id", async (req, res) => {
  res.render("error",{error:"page not found"});
})
app.get("/:id/:id", async (req, res) => {
  res.render("error",{error:"page not found"});
})
app.get("/:id/:id/:id", async (req, res) => {
  res.render("error",{error:"page not found"});
})
app.get("/:id/:id/:id/:id", async (req, res) => {
  res.render("error",{error:"page not found"});
})
app.get("/:id/:id/:id/:id/:id", async (req, res) => {
  res.render("error",{error:"page not found"});
})
app.get("/:id/:id/:id/:id/:id/:id/:id/:id", async (req, res) => {
  res.render("error",{error:"page not found"});
})



// ------------------ Server ------------------
app.listen(PORT, () => console.log(`Server started on ${PORT}`));
