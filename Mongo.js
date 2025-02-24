const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config(); 

// importing env variables to use

const connectDB = async () => {

    // Async Function to run without affecting the execution of main

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit with failure
  }
};

const voteSchema=new mongoose.Schema({
  voterID:{
    type:String,
    required:true,
    unique:true
  },
  candidate:{
    type:String,
    required:true,
  },
  timestamp :{
    type:Date,
    default:Date.now()
  },
});

const publicKeySchema=new mongoose.Schema({
  voterID:{
    type:String,
    required:true,
    unique:true
  },
  publickey:{
    type:String,
    required:true,
    unique:true
  }
});


const Vote = mongoose.model('Vote', voteSchema);  
const Key=mongoose.model('Key',publicKeySchema);  
module.exports={connectDB,Vote,Key};