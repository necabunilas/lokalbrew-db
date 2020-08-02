//jshint esversion:6
require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const ejs = require('ejs');
const socket = require("socket.io");
const bcrypt = require("bcryptjs");
const saltRounds = 10;

const app = express();
const port = 5000;

app.set('view engine', 'ejs');

//For local files
app.use(express.static("public"));

//necessary to get the submitted values from index.html
app.use(bodyParser.urlencoded({extended:true}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE, OPTIONS');
  next();
});

//connect to db
mongoose.connect('mongodb://127.0.0.1:27017/lokalbrew', { useUnifiedTopology: true,  useNewUrlParser: true  });

//user schema
const orderSchema = new mongoose.Schema({
  table: String,
  date: String,
  order: String,
  qty: String,
  price: Number,
  status: String
});

const Order = new mongoose.model("Order", orderSchema);

app.get("/", function(req,res){
  res.send("Listening for messages!");
})

//localost listener
const server = app.listen(process.env.PORT || port, function(){
  console.log(`App listening at http://localhost:` + port)
});

//websocket variable
const io = socket(server);

//check for connection
io.on('connection', (socket) => {

  //new order
  socket.on('new', (data) => {
    const {table, order, qty, price} = data;
    const newOrder = new Order({
      table: table,
      date: '',
      order: order,
      qty: qty,
      price: price,
      status: 'new'
    });

    newOrder.save(function(err){
      if(!err){
        console.log(table +": Successfully added: " + newOrder);
        socket.emit("new", "ok");
      }else{
        console.log(table +": Error registering: " + newOrder);
        socket.emit("new", "er");
      }
    });
  })

  //update qty order
  socket.on('update', (data) => {

    const {table, order, qty, price} = data;
    const query = {table: table, order: order, date: ''};
    const newVal = {qty: qty};
    Order.updateOne(query, newVal, function(err){
      if(!err){
        console.log(table +": Successfully edited order: " + order);
        socket.emit("update", "ok");
      }else{
        console.log(table +": Error editing order: " + order);
        socket.emit("update", "er");
      }
    })

  })

  //update order to serve
  socket.on('serve', (data) => {

    const {table, order, status} = data;
    const query = {table: table, order: order, status: status};
    let newVal = '';
    if(status === 'new'){
      newVal = 'served';
    }else if(status === 'served'){
      newVal = 'new';
    }
    const newItem = {status: newVal};
    Order.updateOne(query, newItem, function(err){
      if(!err){
        if(newVal === 'served'){
          console.log(table +": Successfully served order: " + order);
        }else{
          console.log(table +": Successfully unserved order: " + order);
        }
        socket.emit("serve", "ok");
      }else{
        console.log(table +": Error served order: " + order);
        socket.emit("serve", "er");
      }
    })

  })

  //delete order
  socket.on('delete', (data) => {

    const {table, order, qty, price} = data;
    const query = {table: table, order: order, date: ''};
    Order.deleteOne(query, function(err){
      if(!err){
        console.log(table +": Successfully deleted order: " + order);
        socket.emit("delete", "ok");
      }else{
        console.log(table +": Error deleting order: " + order);
        socket.emit("delete", "er");
      }
    })

  })

  socket.on('get Orders', (data) => {
    const query = {table: data, date: ''};
    Order.find(query, function(err,result){
      if(!err){
        socket.emit("get Orders", result);
      }else{
        socket.emit("get Orders", "er");
      }
    })
  })

  socket.on('get Queue', (data) => {
    const query = { status: "new"};
    Order.find(query, function(err,result){
      if(!err){
        socket.emit("get Queue", result);
      }else{
        socket.emit("get Queue", "er");
      }
    })
  })

  socket.on('get Deals', (data) => {
    const query = { status: "paid"};
    Order.find(query, function(err,result){
      if(!err){
        socket.emit("get Deals", result);
      }else{
        socket.emit("get Deals", "er");
      }
    })
  })

  socket.on('pay', (data) => {
    const newStatus = 'paid';
    const newDate = new Date();
    const newVal = {
      date: newDate,
      status: newStatus
    };
    Order.updateMany({table: data}, newVal, function(err){
      if(!err){
          console.log(data +": Successfully paid orders!");
        socket.emit("pay", "ok");
      }else{
        console.log(data +": Error in paying orders!");
        socket.emit("pay", "er");
      }
    })
  })

});
