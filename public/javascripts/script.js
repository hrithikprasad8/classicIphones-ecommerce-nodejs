const notyf = new Notyf({
  duration: 3000, 
    ripple: true, 
    dismissible: true, 
    position: {
        x: 'right', 
        y: 'top', 
    }
});

function addToCart(prodid) {
  $.ajax({
    url: "/add-to-cart?id=" + prodid,
    method: "get",
    success: (response) => {
      if (response.status) {
        let count = $("#cart-count").html();
        count = parseInt(count) + 1;
        $("#cart-count").html(count);
        notyf.success(response.message);
        window.location.href = "/cart";
      }else {
        notyf.error(response.message);
      }
   },
  });
}
