var db = require("../config/connection");
var collection = require("../config/collections");
const { response } = require("../app");
var ObjectId = require('mongodb').ObjectId
module.exports = {
  addProduct: (product, callback) => {
    console.log(product);
    db.get()
      .collection("product")
      .insertOne(product)
      .then((data) => {
        console.log("whole data seems like ", data);
        //added product unique id is now in insertedId key
        callback(data.insertedId);
      });
  },
  showProductsfromDb: () => {
    return new Promise( async (resolve, reject) => {
      let products =  await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
      resolve(products)
    });
  },
  removingDatasFromDb: (productid) => {
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id: new ObjectId(productid)}).then(()=>{
        resolve()
      })

    })

  },
  performEditFun: (productid) =>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id: new ObjectId(productid)}).then((productdetails)=>{
        resolve(productdetails)
      })

    })
  },
  updateProductFun: (pid,productdet) => {
    return new Promise((resolve,reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:new ObjectId(pid)},{
        $set:{
          Name: productdet.Name,
          Category: productdet.Category,
          Description: productdet.Description,
          Price: productdet.Price,

          
        }
      }).then((response)=>{
        resolve()
      })
    })
  }
};
