var express = require("express");
var router = express.Router();
var productHelpers = require("../helper/product-helper");

/* GET users listing. */
router.get("/", function (req, res, next) {
  productHelpers.showProductsfromDb().then((products) => {
    console.log(products);
    res.render("admin/view-products", { admin: true, products });
  });
});

router.get("/add-product", function (req, res) {
  res.render("admin/add-product");
});

router.post("/add-product", (req, res) => {
  console.log(req.body);
  console.log(req.files.Image);
// so we need to store if there is any image files from the user in our server in a seperate follder,from that only we are inserting them to a database.
productHelpers.addProduct(req.body, (id) => {
    console.log("particular product id is ", id);
    let image = req.files.Image;
    image.mv("./public/product-images/" + id + ".jpg", (err, done) => {
      if (!err) {
        res.render("admin/add-product");
      }
    });
  });
});

router.get('/delete-product/',(req,res)=>{
  productHelpers.removingDatasFromDb(req.query.id).then(()=>{
    console.log("data removed successfully")
    res.redirect('/admin')
  })
})

router.get('/edit-product/', async (req,res)=>{
  let productdetails=  await productHelpers.performEditFun(req.query.id)
  res.render('admin/edit-product',{ productdetails })
})

router.post('/edit-product/',(req,res)=>{
  console.log("body of edited product seems like",req.body)
  console.log("its id seems like",req.query.id)
  productHelpers.updateProductFun(req.query.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.Image){
      let id = req.query.id
      let image = req.files.Image
      image.mv("./public/product-images/" + id + ".jpg")
}
  })
  })

module.exports = router;
