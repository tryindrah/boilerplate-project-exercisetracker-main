const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require("mongoose")
const bodyParser = require("body-parser")
mongoose.connect(process.env.MONGO_URI,{ useNewUrlParser: true, useUnifiedTopology: true });
const { ObjectId } = require('mongoose').Types;
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
app.use(express.static('public'))
const userSchema = new mongoose.Schema({
  username : String,
  log: [{
    description: String,
    duration: Number,
    date: Date,
  }]
})

const User = new mongoose.model("User",userSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async function(req, res){
  try{
    const user = await User.create({
      username: req.body.username
    })
    res.json({
      _id: user._id,
      username: user.username
    })
  }catch(error){
    console.log(error);
  }
})

app.post('/api/users/:_id/exercises', async function(req, res){
  const _id = req.params._id
  const description = req.body.description
  const duration = Number(req.body.duration);
  let date = req.body.date ? new Date(req.body.date) : new Date();
  try{
    const user = await User.findOneAndUpdate(
      {_id: _id},
      { $push: 
        {
          log: {
            description: description,
            duration: duration,
            date: date
          }
        }
      },
      { new: true }
    )
    const currentLog = user.log.length - 1;
    res.json({
      _id: user._id,
      username: user.username,
      date: user.log[currentLog].date.toDateString(),
      duration: user.log[currentLog].duration,
      description: user.log[currentLog].description
    })
  }catch(error){
    console.log(error);
  }
})

app.get('/api/users', async function(req, res){
  try{
    const user = await User.find({}).select('_id username');
    res.json(user)
  }catch(error){
    console.log(error)
  }
})

app.get('/api/users/:_id/logs', async function(req, res){
  try{
    const _id = new ObjectId(req.params._id)
    const from = req.query.from;
    const to = req.query.to;
    const limit = req.query.limit
    console.log(`from : ${from}, to: ${to}, limit: ${limit}, _id: ${_id}`)
    if(from == null && to==null){
      if(limit){
        const user = await User.findOne({ _id: _id }).slice("log",-limit)
        res.json(objUserLog(user,true))
      }else{
        const user = await User.findOne({ _id: _id })
        res.json(objUserLog(user,true))
      }
      
    }else if(limit != null  && from != null && to!=null ){
      const from = new Date(req.query.from);
      const to = new Date(req.query.to);
      
      const user = await User.aggregate([
        { $match: { _id: new ObjectId(_id) } },
        { $unwind: '$log' },
        {
          $match: {
            'log.date': { $gte: from, $lte: to },
          },
        },
        { $sort: { 'log.date': -1 } },
        { $limit: parseInt(limit) },
        {
          $group: {
            _id: '$_id',
            username: { $first: '$username' },
            log: { $push: '$log' },
          },
        },
      ]);
      res.json(objUserLog(user,false,from,to))
    }else if(limit == null){
      const from = new Date(req.query.from);
      const to = new Date(req.query.to);
      const user = await User.aggregate([
        { $match: { _id: new ObjectId(_id) } },
        { $unwind: '$log' },
        {
          $match: {
            'log.date': { $gte: from, $lte: to },
          },
        },
        { $sort: { 'log.date': -1 } },
        {
          $group: {
            _id: '$_id',
            username: { $first: '$username' },
            log: { $push: '$log' },
          },
        },
      ]);
      res.json(objUserLog(user,false,from,to))
    }
    
  }catch(error){
    console.log(error)
  }
})

const objUserLog = (user,isAll,from=null,to=null) =>{
  if(user==null){
    return { error: "User Not Found"}
  }
  if(isAll){
    return {
      _id: user._id,
      username: user.username,
      count: user.log.length,
      log: user.log.map(log => ({
        description: log.description,
        duration: log.duration,
        date: log.date.toDateString()
      })),
    }
  }else{
    return {
      _id: user[0]._id,
      username: user[0].username,
      from: from.toDateString(),
      to: to.toDateString(),
      count: user[0].log.length,
      log: user[0].log.map(log => ({
        description: log.description,
        duration: log.duration,
        date: log.date.toDateString()
      })),
    }
  }
}

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
