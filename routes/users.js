var express = require('express');
var router = express.Router();
var productHelpers = require("../helper/product-helper");
var useHelpers = require("../helper/user-helpers");
const { response } = require('../app');

const verifyUserLog = (req,res,next) =>{
  if(req.session.user.loggedIn){
    next()
  }else{
    res.redirect('/login')
  }
  }

/* GET home page. */
router.get('/', async function(req, res, next) {
  let user = req.session.user
  console.log(user)
  let cartCount = null
  if(user){
    cartCount=await useHelpers.cartCountshow(req.session.user._id)
  }
  productHelpers.showProductsfromDb().then((products)=>{
    // console.log(products)
        res.render("view-products", { admin: false, products ,user,cartCount});
});
});

router.get('/login',(req,res) => {
  if(req.session.user){   
    res.redirect('/');
  }else{
    res.render('user/login',{"EmailloggedErr":req.session.EmailloggedErr,"PasswordLoggedErr":req.session.PasswordLoggedErr});
    req.session.EmailloggedErr= false;
    req.session.PasswordLoggedErr = false;
    }
})

router.get('/signup',(req,res)=>{
  res.render('user/signup')
})

router.post('/signup',(req,res)=>{
  useHelpers.doSignUp(req.body).then((response)=>{
    console.log("data seems like after encrypting",response)
    req.session.user = response
    req.session.user.loggedIn = true
    res.redirect('/')
  })
    })

router.post('/login',(req,res)=>{
  useHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.user = response.user 
      req.session.user.loggedIn =true
      res.redirect('/')
    }else{
      if(response.emailError){
        req.session.EmailloggedErr = "Invalid email"
        req.session.PasswordLoggedErr = ""
      }else{
        req.session.PasswordLoggedErr = "Incorrect password"
        req.session.EmailloggedErr = ""
}
res.redirect('/login')
    }
})
})

router.get('/logout',(req,res)=>{
  req.session.user=null
  res.redirect('/login')
})

router.get('/cart',verifyUserLog, async (req,res,next)=>{
  let products =  await useHelpers.showProducts(req.session.user._id)
  console.log("cart final amount seems as",products)
  if(products.empty){
    res.render('user/cartempty',{user:req.session.user})
  }else{
    let totalamount = await useHelpers.findTotalAmount(req.session.user._id)
    res.render('user/cart',{products,user:req.session.user,totalamount})
}
})

router.get('/add-to-cart/',(req,res)=>{
  console.log("api called")
  console.log("particular product id seems as",req.query.id)
  console.log("user id seems as ",req.session.user._id)
  useHelpers.addToCart(req.query.id,req.session.user._id).then((response)=>{
    if (response.status ) {
      res.json({ status: true, message: 'Product added to cart successfully' });
  } else {
      res.json({ status: false, message: 'product already added to cart,just checkout the cart' });
  }
   })
})

router.post('/change-product-quantity',(req,res)=>{
  console.log("count body seems like",req.body)
  useHelpers.changeProductQuantity(req.body).then(async(response)=>{
    response.total = await useHelpers.findTotalAmount(req.body.user)
    console.log("userid shows as ",req.session.user)
    res.json(response)
})
})

router.post('/remove-product',async(req,res)=>{
  console.log("deleteitem cart body seems like",req.body)
  try{
  const { productid, cartid } = req.body;
  await useHelpers.deleteParticularItem(productid,cartid)
  res.redirect('/cart')
  }
  catch(error) {
    console.error("Error:", error);
    res.status(500).send("Error removing product from cart.");
};
})

router.get('/place-order',verifyUserLog,async(req,res)=>{
  let totalamount = await useHelpers.findTotalAmount(req.session.user._id).then((totalamnt)=>{
    res.render('user/place-order',{user:req.session.user,totalamnt})
})
})

router.post('/place-order', async(req,res)=>{
  console.log("user submitted data for payment purpose",req.body)
  let products = await useHelpers.getParticularUserCart(req.body.user)
  let totalamount = await useHelpers.findTotalAmount(req.body.user)
  console.log("products array seems like",products)
  useHelpers.placeOrder(req.body,products,totalamount).then((orderId)=>{
    if(req.body['payment-method']==='COD'){
      res.json({codSuccess:true,message:'order placed successfully,check out your orders'})
}else{
      useHelpers.generateRazorpay(orderId,totalamount).then((response)=>{
        res.json(response)
})
}
})
})

router.get('/order-success',verifyUserLog,(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})

router.get('/purchased-orders',verifyUserLog,async(req,res)=>{
    console.log("userid of product placed individuals",req.query.id)
  let useridentity = req.query.id
  let pickOrderCart= await useHelpers.tookOrderCart(useridentity)
  if(pickOrderCart.notifyMe){
    res.render('user/ordersempty')
  }else{
    res.render('user/purchased-orders',{useridentity,pickOrderCart,user:req.session.user})
}
})

router.get('/ordererd-productsview',verifyUserLog,async (req,res)=>{
  console.log("order id of user recieveed here ",req.query.id)
  let getOrderedProds = await useHelpers.pickOrderProds(req.query.id)
  console.log("final result seems like",getOrderedProds)
  res.render('user/view-prodspurchase',{getOrderedProds,user:req.session.user})
})

router.post('/verify-payment',(req,res)=>{
  console.log("body after payment successfull seems like",req.body)
  useHelpers.verifyPay(req.body).then(()=>{
    useHelpers.changeStatusInDb(req.body['order[receipt]']).then((response)=>{
      console.log("response after online payment ver")
      res.json({status:true})
    })
}).catch((err)=>{
    console.log("error seems like",err)
    res.json({status:false})
  })
})

router.get('/cartempty',verifyUserLog,(req,res)=>{
  res.render('user/cartempty',{user:req.session.user})
})

router.get('/profile',verifyUserLog,(req,res)=>{
  console.log("user id we get through profile",req.query.id)
  useHelpers.showProfile(req.query.id).then((userdet)=>{
    console.log("particular user details seems like ",userdet)
    res.render('user/profile',{userdet,user:req.session.user})
  })
})

module.exports = router;
