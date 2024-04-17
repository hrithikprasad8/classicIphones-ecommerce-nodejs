var db = require("../config/connection");
var collection = require("../config/collections");
const bcrypt = require("bcrypt");
const { response } = require("express");
var ObjectId = require("mongodb").ObjectId;
const Razorpay = require('razorpay');
const { resolve } = require("path");
const { rejects } = require("assert");


var instance = new Razorpay({
  key_id: 'rzp_test_u7dHfAZsRxtEe9',
  key_secret: 'W9VTRelifqdTdugDhQtelnRM',
});


module.exports = {
  doSignUp: (userdata) => {
    return new Promise(async (resolve, reject) => {
      try {
        userdata.Password = await bcrypt.hash(userdata.Password, 10);
        db.get().collection(collection.USER_COLLECTION).insertOne(userdata);
        resolve(userdata);
      } catch (error) {
        reject(error);
      }
    });
  },


  doLogin: (userdata) => {
    return new Promise(async (resolve, reject) => {
      let loginstatus = false;
      let reponse = {};
      let emailchecking = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ Email: userdata.Email });
      if (emailchecking) {
        bcrypt
          .compare(userdata.Password, emailchecking.Password)
          .then((result) => {
            if (result) {
              console.log("login successfull");
              response.user = emailchecking;
              response.status = true;
              resolve(response);
            } else {
              console.log("Incorrect Password");
              resolve({ status: false, emailError: false });
            }
          });
      } else {
        console.log("Incorrect email");
        resolve({ status: false, emailError: true });
      }
    });
  },


  addToCart: (pid, userid) => {
    let proObj = {
      item: new ObjectId(pid),
      quantity: 1,
    };
    return new Promise(async (resolve, reject) => {
      // first we are checking whether there is any datas in cart collection if that user already added products to cart then they will have cart
      let usercart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: new ObjectId(userid) });
      if (usercart) {
        let proExist = usercart.products.findIndex(
          (product) => product.item == pid
        );
        console.log("product same one already exist with index", proExist);
        if (proExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              {
                user: new ObjectId(userid),
                "products.item": new ObjectId(pid),
              },
              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then(() => {
              resolve({ status: false });
            });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: new ObjectId(userid) },
              {
                $push: { products: proObj },
              }
            )
            .then((response) => {
              resolve({ status: true });
            });
        }
} else {
        //if it is first time user is adding product to the cart so we are creating a new cart
        let newCart = {
          user: new ObjectId(userid),
          products: [proObj],
        };
        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(newCart)
          .then((response) => {
            resolve({status:true});
          });
      }
    });
  },



  showProducts: (userid) => {
    return new Promise(async (resolve, reject) => {
      //first we are going to database and take some data reallted to this particular user
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: new ObjectId(userid) },
          },
          //from where we are taking datas to show them in cart
          {
            $unwind: "$products",
          },
          //what all things we want to take so only project those things
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          // now we are comaparing products id with the product is in the product collection database to take products information like name,price,etc
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
         
        ])
        .toArray();
      console.log("whole cartitems look like", cartItems);
      if(cartItems.length === 0){
        resolve({empty:true})
      }else{
        resolve({cartItems:cartItems});
}
});
  },



  cartCountshow: (userid) => {
    return new Promise(async (resolve, reject) => {
      let cartCount = 0;
      cartCount = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: new ObjectId(userid) });
        if (cartCount && cartCount.products){
          cartCount = cartCount.products.length;
}else{
          cartCount = 0
        }
      resolve(cartCount);
    });
  },



  changeProductQuantity: (details) => {
    details.count = parseInt(details.count);
    details.quantity = parseInt(details.quantity);
    return new Promise(async (resolve, reject) => {
      if (details.count == -1 && details.quantity == 1) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: new ObjectId(details.cartid) },
            {
              $pull: { products: { item: new ObjectId(details.prodid) } },
            }
          )
          .then((response) => {
            resolve({ removeProduct: true });
          });
      } else {
        await db
          .get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              _id: new ObjectId(details.cartid),
              "products.item": new ObjectId(details.prodid),
            },
            {
              $inc: { "products.$.quantity": details.count },
            }
          )
          .then((response) => {
            console.log("count response we get through function", response);
            resolve({status:true});
          });
      }
    });
  },



  deleteParticularItem: (prodid, cartid) => {
    return new Promise(async (resolve, reject) => {
      //first we are going to match the passed cartid with the cartid in the databse and take that user  cart
      try {
        const cart = await db
          .get()
          .collection(collection.CART_COLLECTION)
          .findOne({ _id: new ObjectId(cartid) });
        if (!cart) {
          throw new Error("Cart not found");
        }
        const updatedProducstarray = cart.products.filter(
          (product) => product.item.toString() !== prodid
        );
        //now we need to make changes and set our products array as updatedProducstarray array so we need to update our database
        await db
          .get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: new ObjectId(cartid) },
            {
              $set: { products: updatedProducstarray },
            }
          );
        console.log("Item removed from cart successfully");
        if (updatedProductsArray.length === 0) {
          resolve([]);
        } else {
          resolve(updatedProducstarray);
        }
      } catch (error) {
        console.error("Error removing item from cart:", error);
        reject(error);
      }
    });
  },



  findTotalAmount: (userid) => {
    return new Promise(async (resolve, reject) => {
        try {
            let total = await db
                .get()
                .collection(collection.CART_COLLECTION)
                .aggregate([
                    {
                        $match: { user: new ObjectId(userid) },
                    },
                    {
                        $unwind: "$products",
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: "products.item",
                            foreignField: "_id",
                            as: "product",
                        },
                    },
                    {
                        $addFields: {
                            quantity: "$products.quantity",
                            price: { $arrayElemAt: ["$product.Price", 0] }
                        }
                    },
                    {
                        $addFields: {
                            totalPrice: { $multiply: ["$quantity", { $toInt: { $replaceAll: { input: "$price", find: ",", replacement: "" } } }] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: "$totalPrice" }
                        }
                    }
                ])
                .toArray();
                console.log("Total amount: ", total);
                if(total.length === 0){
                 resolve({empty:true})
                }
                 resolve(total[0].total);
                } catch (error) {
                  reject(error);
        }
    });
},



placeOrder:(orderAddress,cartProducts,totalAmount)=>{
  return new Promise((resolve,reject)=>{
    let status = orderAddress['payment-method']==='COD'?'placed':'pending'
    let orderobj = {
      deliveryDetails:{
        Address:orderAddress.address,
        Pincode:orderAddress.pincode,
        Phoneno:orderAddress.mobile
      },
      userId:new ObjectId(orderAddress.user),
      products:cartProducts,
      paymentMethod:orderAddress['payment-method'],
      totalAmount:totalAmount,
      date:new Date(),
      status:status

    }
      db.get().collection(collection.ORDER_COLLECTION).insertOne(orderobj).then((response)=>{
      console.log("response seems like",response)
      db.get().collection(collection.CART_COLLECTION).deleteMany({user:new ObjectId(orderAddress.user)})
      resolve(response.insertedId)
    })

  })
},



getParticularUserCart:(userId)=>{
  console.log("userid we get here is ",userId)
  return new Promise(async(resolve,reject)=>{
    let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:new ObjectId(userId)})
    resolve(cart.products)
})
},



tookOrderCart:(userId)=>{
  return new Promise(async(resolve,reject)=>{
    let userOrderedCart = await db.get().collection(collection.ORDER_COLLECTION).find({userId:new ObjectId(userId)}).toArray()
    if(userOrderedCart.length > 0){
      resolve(userOrderedCart)
    }else{
      resolve({notifyMe:true})
    }
  })
},



pickOrderProds:(cartId)=>{
  return new Promise (async (resolve,reject)=>{
    let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
      {
        $match:{_id:new ObjectId(cartId)}
      },
    {
        $unwind:'$products'
      },
      {
        $project:{
          item:'$products.item',
          quantity:'$products.quantity',
        }
      },
      {
        $lookup:{
          from:collection.PRODUCT_COLLECTION,
          localField:'item',
          foreignField:'_id',
          as:'product'

        }
      },
      {
        $project:{
          item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
        }
      }
      ]).toArray()
      resolve(orders)
})
},



generateRazorpay:(orderId,totalamount)=>{
  console.log("orderisd passed here we get",orderId)
  return new Promise((resolve,reject)=>{
    var options = {
      amount:totalamount,
      currency:"INR",
      receipt:orderId
    };
    instance.orders.create(options,function(err,order){
      if(err){
        console.log(err)
      }else{
        console.log( "order seems as",order)
        resolve(order)
}
      })
  })
},



verifyPay:(detailasAfterOnlinePayment)=>{
  return new Promise((resolve,reject)=>{
    const crypto = require('crypto');
    let hmac = crypto.createHmac('sha256', 'W9VTRelifqdTdugDhQtelnRM')
    hmac.update(detailasAfterOnlinePayment['payment[razorpay_order_id]']+'|'+detailasAfterOnlinePayment['payment[razorpay_payment_id]'])
    hmac=hmac.digest('hex')
    if(hmac==detailasAfterOnlinePayment['payment[razorpay_signature]']){
      resolve()
    }else{
      reject()
    }
})
},



changeStatusInDb:(orderId)=>{
  return new Promise(async(resolve,reject)=>{
    await db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:new ObjectId(orderId)},
  {
    $set:{
      status:'placed'
    }
  }).then(()=>{
    resolve()
  })
  })
},



showProfile:(userId)=>{
  return new Promise(async(resolve,reject)=>{
    let userProfile = await db.get().collection(collection.USER_COLLECTION).findOne({_id:new ObjectId(userId)})
    resolve(userProfile)
})
}
};
