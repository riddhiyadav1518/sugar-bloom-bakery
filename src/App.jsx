
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Admin from "./Admin";
import "./App.css";

function App() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  
const [customer, setCustomer] = useState({
  name: "",
  phone: "",
  address: "",
  paymentMethod: "upi",
});

  
const [customCake, setCustomCake] = useState({
  name: "",
  phone: "",
  address: "",
  flavour: "Chocolate",
  size: "1 kg",
  cakeMessage: "",
  deliveryDate: "",
  instructions: "",
});

const [cakeSubmitting, setCakeSubmitting] = useState(false);
const [cakeMessage, setCakeMessage] = useState("");


  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_available", true)
      .order("id", { ascending: true });

    if (error) {
      setMessage("We couldn't load our treats. Please refresh the page.");
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  function addToCart(product) {
    setCart((previous) => {
      const existing = previous.find((item) => item.id === product.id);

      if (existing) {
        return previous.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...previous, { ...product, quantity: 1 }];
    });

    setMessage(`${product.name} added to your bag.`);
    setCartOpen(true);
  }

  function changeQuantity(id, amount) {
    setCart((previous) =>
      previous
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(id) {
    setCart((previous) => previous.filter((item) => item.id !== id));
  }

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const totalPrice = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );
  
const categories = [
  "All",
  ...new Set(
    products.map((product) => product.category).filter(Boolean)
  ),
];

const filteredProducts = products.filter((product) => {
  const search = searchTerm.toLowerCase();

  const matchesSearch =
    product.name.toLowerCase().includes(search) ||
    (product.description || "").toLowerCase().includes(search) ||
    (product.category || "").toLowerCase().includes(search);

  const matchesCategory =
    selectedCategory === "All" ||
    product.category === selectedCategory;

  return matchesSearch && matchesCategory;
});


  async function placeOrder(event) {
    event.preventDefault();
    setMessage("");

    if (!cart.length) {
      setMessage("Your bag is waiting for something sweet.");
      return;
    }

    setPlacingOrder(true);

    const orderItems = cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
    }));

    const { error } = await supabase.from("orders").insert([
      {
        customer_name: customer.name.trim(),
        phone: customer.phone.trim(),
        delivery_address: customer.address.trim(),
        items: orderItems,
       total_amount: totalPrice,
       payment_method: customer.paymentMethod,
       status: "Pending",
      },
    ]);

    setPlacingOrder(false);

    if (error) {
      setMessage("Your order couldn't be placed. Please try again.");
      return;
    }

    setCart([]);
    setCustomer({ name: "", phone: "", address: "" });
    setCartOpen(false);
    setMessage("Your sweet order has been placed successfully! ♡");
  }
  
const handleCustomCakeSubmit = async (event) => {
  event.preventDefault();
  setCakeSubmitting(true);
  setCakeMessage("");

  try {
    const { error } = await supabase
      .from("custom_cake_requests")
      .insert([
        {
          customer_name: customCake.name.trim(),
          phone: customCake.phone.trim(),
          delivery_address: customCake.address.trim(),
          cake_flavour: customCake.flavour,
          cake_size: customCake.size,
          cake_message: customCake.cakeMessage.trim(),
          delivery_date: customCake.deliveryDate,
          special_instructions: customCake.instructions.trim(),
        },
      ]);

    if (error) {
      throw error;
    }

    setCakeMessage(
      "Your custom cake request has been submitted successfully!"
    );

    setCustomCake({
      name: "",
      phone: "",
      address: "",
      flavour: "Chocolate",
      size: "1 kg",
      cakeMessage: "",
      deliveryDate: "",
      instructions: "",
    });
  } catch (error) {
    console.error("Custom cake request error:", error);
    setCakeMessage(
      "We couldn't submit your request. Please try again."
    );
  } finally {
    setCakeSubmitting(false);
  }
};

  if (showAdmin) {
    return (
      <main className="admin-page">
        <button
          className="back-to-shop"
          onClick={() => setShowAdmin(false)}
        >
          ← Back to the bakery
        </button>
        <Admin />
      </main>
    );
  }

  return (
    <div className="bakery-site">
      <div className="announcement-bar">
        BAKED WITH LOVE, SERVED WITH A LITTLE MAGIC ✧
      </div>

      <header className="site-header">
        <a className="brand" href="#home" aria-label="Sugar Bloom home">
          <span className="brand-mark">✿</span>
          <span className="brand-name">sugar bloom</span>
          <span className="brand-subtitle">ARTISAN BAKERY & PATISSERIE</span>
        </a>

        <nav className="main-nav">
          <a href="#home">Home</a>
          <a href="#story">Our Story</a>
          <a href="#collection">The Collection</a>
        </nav>

        <div className="header-actions">
          <button
            className="text-button admin-link"
            onClick={() => setShowAdmin(true)}
          >
            Admin
          </button>
          <button
            className="bag-button"
            onClick={() => setCartOpen(!cartOpen)}
            aria-label="Open shopping bag"
          >
            Bag <span className="bag-count">{totalItems}</span>
          </button>
        </div>
      </header>

      {message && (
        <div className="status-message" role="status">
          <span>{message}</span>
          <button onClick={() => setMessage("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <p className="eyebrow">
              <span>✧</span> A LITTLE SLICE OF HEAVEN <span>✧</span>
            </p>

            <h1>
              Made with love.
              <br />
              <em>Meant to be</em>
              <br />
              savoured.
            </h1>

            <p className="hero-description">
              Delicate little indulgences, handcrafted with the finest
              ingredients and a whole lot of heart.
            </p>

            <a className="primary-button" href="#collection">
              Explore our collection <span>↗</span>
            </a>

            <div className="hero-note">
              <span className="note-star">✳</span>
              <span>Freshly baked, always from the heart.</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-frame">
              <img
                src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1100&q=85"
                alt="Elegant celebration cake"
              />
            </div>
            <div className="hero-stamp">
              <span>BAKED</span>
              <span>WITH ♡</span>
              <span>LOVE</span>
            </div>
            <div className="hero-caption">
              <span>01 / OUR SIGNATURE</span>
              <span>Little moments, sweeter.</span>
            </div>
          </div>
        </section>

        <section className="values-strip" id="story">
          <div><span>✳</span> Made fresh with love</div>
          <div><span>✳</span> Beautifully handcrafted</div>
          <div><span>✳</span> A treat for every occasion</div>
        </section>

        <section className="collection-section" id="collection">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A TASTE OF SOMETHING SPECIAL</p>
              <h2>The sweet <em>collection.</em></h2>
              <p className="section-description">
                Little luxuries for your everyday celebrations.
              </p>
            </div>
            <span className="collection-flower">✿</span>
          </div>
          
<div className="product-toolbar">
  <div className="product-search">
    <span>⌕</span>
    <input
      type="search"
      value={searchTerm}
      onChange={(event) => setSearchTerm(event.target.value)}
      placeholder="Find your favourite treat..."
      aria-label="Search products"
    />
    {searchTerm && (
      <button
        type="button"
        onClick={() => setSearchTerm("")}
        aria-label="Clear search"
      >
        ×
      </button>
    )}
  </div>

  <div className="category-filters" aria-label="Filter products by category">
    {categories.map((category) => (
      <button
        type="button"
        key={category}
        className={`category-chip ${
          selectedCategory === category ? "active" : ""
        }`}
        onClick={() => setSelectedCategory(category)}
      >
        {category}
      </button>
    ))}
  </div>
</div>


          {loading ? (
            <div className="empty-state">
              <span className="loading-flower">✿</span>
              <p>Preparing something sweet for you...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <span className="loading-flower">♡</span>
             
<p>
  {products.length === 0
    ? "Our collection is getting ready. Please visit us again soon."
    : "No treats found. Try another search or category."}
</p>

            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product, index) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image-wrap">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="product-image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="product-image-placeholder">✿</div>
                    )}

                    <span className="product-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <button
                      className="quick-add"
                      onClick={() => addToCart(product)}
                    >
                      Add to bag <span>+</span>
                    </button>
                  </div>

                  <div className="product-details">
                    <div>
                      <p className="product-category">{product.category}</p>
                      <h3>{product.name}</h3>
                    </div>
                    <span className="product-price">
                      ₹{Number(product.price).toFixed(2)}
                    </span>
                  </div>

                  {product.description && (
                    <p className="product-description">{product.description}</p>
                  )}

                  <button
                    className="mobile-add-button"
                    onClick={() => addToCart(product)}
                  >
                    Add to bag +
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
        
<section className="custom-cake-section" id="custom-cake">
  <div className="custom-cake-heading">
    <p className="eyebrow">MADE JUST FOR YOU</p>
    <h2>A cake as <em>unique</em> as your celebration.</h2>
    <p>
      Tell us your dream cake, and we'll help make your special
      occasion a little sweeter.
    </p>
  </div>

  <form className="custom-cake-form" onSubmit={handleCustomCakeSubmit}>
    <div className="custom-cake-fields">
      <label>
        Your name *
        <input
          type="text"
          required
          maxLength={100}
          value={customCake.name}
          onChange={(e) =>
            setCustomCake({ ...customCake, name: e.target.value })
          }
          placeholder="Enter your full name"
        />
      </label>

      <label>
        Phone number *
        <input
          type="tel"
          required
          maxLength={20}
          value={customCake.phone}
          onChange={(e) =>
            setCustomCake({ ...customCake, phone: e.target.value })
          }
          placeholder="Your contact number"
        />
      </label>

      <label className="custom-cake-full">
        Delivery address *
        <textarea
          required
          maxLength={500}
          value={customCake.address}
          onChange={(e) =>
            setCustomCake({ ...customCake, address: e.target.value })
          }
          placeholder="Where should we deliver your cake?"
          rows={3}
        />
      </label>

      <label>
        Cake flavour *
        <select
          value={customCake.flavour}
          onChange={(e) =>
            setCustomCake({ ...customCake, flavour: e.target.value })
          }
          required
        >
          <option value="Chocolate">Chocolate</option>
          <option value="Vanilla">Vanilla</option>
          <option value="Red Velvet">Red Velvet</option>
          <option value="Butterscotch">Butterscotch</option>
          <option value="Black Forest">Black Forest</option>
          <option value="Strawberry">Strawberry</option>
          <option value="Other">Other</option>
        </select>
      </label>

      <label>
        Cake size *
        <select
          value={customCake.size}
          onChange={(e) =>
            setCustomCake({ ...customCake, size: e.target.value })
          }
          required
        >
          <option value="0.5 kg">0.5 kg</option>
          <option value="1 kg">1 kg</option>
          <option value="1.5 kg">1.5 kg</option>
          <option value="2 kg">2 kg</option>
          <option value="3 kg">3 kg</option>
        </select>
      </label>

      <label>
        Preferred delivery date *
        <input
          type="date"
          required
          min={new Date().toLocaleDateString("en-CA")}
          value={customCake.deliveryDate}
          onChange={(e) =>
            setCustomCake({ ...customCake, deliveryDate: e.target.value })
          }
        />
      </label>

      <label className="custom-cake-full">
        Message on the cake
        <input
          type="text"
          maxLength={100}
          value={customCake.cakeMessage}
          onChange={(e) =>
            setCustomCake({ ...customCake, cakeMessage: e.target.value })
          }
          placeholder="e.g. Happy Birthday!"
        />
      </label>

      <label className="custom-cake-full">
        Special instructions
        <textarea
          rows={3}
          maxLength={1000}
          value={customCake.instructions}
          onChange={(e) =>
            setCustomCake({ ...customCake, instructions: e.target.value })
          }
          placeholder="Describe the design, colours, or decoration you want..."
        />
      </label>
    </div>

    {cakeMessage && (
      <p className="custom-cake-feedback" role="status">
        {cakeMessage}
      </p>
    )}

    <button
      className="custom-cake-submit"
      type="submit"
      disabled={cakeSubmitting}
    >
      {cakeSubmitting ? "Sending your request..." : "Request My Custom Cake ♡"}
    </button>

    <p className="custom-cake-note">
      We'll review your request and confirm the details with you.
    </p>
  </form>
</section>

        <section className="love-note-section">
          <span className="love-note-flower">✿</span>
          <p className="eyebrow">A NOTE FROM OUR KITCHEN</p>
          <h2>Life is short.<br /><em>Make it a little sweeter.</em></h2>
          <p>
            For birthdays, little victories, slow Sundays, and all the moments
            in between — there is always room for something lovely.
          </p>
          <a href="#collection" className="outline-button">
            Find your favourite <span>↗</span>
          </a>
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="#home">✿ sugar bloom</a>
        <p>Thoughtfully baked. Beautifully shared.</p>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} The Sugar Bloom Bakery</span>
          <a href="#home">Back to top ↑</a>
        </div>
      </footer>

      {cartOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setCartOpen(false)}
          role="presentation"
        >
          <aside
            className="cart-drawer"
            onClick={(event) => event.stopPropagation()}
            aria-label="Shopping bag"
          >
            <div className="cart-heading">
              <div>
                <p className="eyebrow">YOUR LITTLE INDULGENCES</p>
                <h2>Your bag <em>♡</em></h2>
              </div>
              <button
                className="close-drawer"
                onClick={() => setCartOpen(false)}
                aria-label="Close shopping bag"
              >
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <span>✿</span>
                <h3>A little sweetness belongs here.</h3>
                <p>Your bag is empty for now.</p>
                <button
                  className="primary-button"
                  onClick={() => {
                    setCartOpen(false);
                    document.getElementById("collection")?.scrollIntoView({
                      behavior: "smooth",
                    });
                  }}
                >
                  Explore the collection
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.id}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} />
                      ) : (
                        <div className="cart-item-placeholder">✿</div>
                      )}

                      <div className="cart-item-info">
                        <h3>{item.name}</h3>
                        <p>₹{Number(item.price).toFixed(2)}</p>
                        <div className="quantity-control">
                          <button
                            onClick={() => changeQuantity(item.id, -1)}
                            aria-label={`Decrease ${item.name} quantity`}
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() => changeQuantity(item.id, 1)}
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        className="remove-item"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${item.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="cart-total">
                  <span>Subtotal</span>
                  <strong>₹{totalPrice.toFixed(2)}</strong>
                </div>
                <p className="checkout-note">
                  Your lovely treats will be confirmed after your order is
                  submitted.
                </p>

                <form className="checkout-form" onSubmit={placeOrder}>
                  <h3>Delivery details</h3>

                  <label htmlFor="customer-name">Your name</label>
                  <input
                    id="customer-name"
                    type="text"
                    autoComplete="name"
                    value={customer.name}
                    onChange={(event) =>
                      setCustomer({ ...customer, name: event.target.value })
                    }
                    required
                    maxLength={100}
                    placeholder="Enter your full name"
                  />

                  <label htmlFor="customer-phone">Phone number</label>
                  <input
                    id="customer-phone"
                    type="tel"
                    autoComplete="tel"
                    value={customer.phone}
                    onChange={(event) =>
                      setCustomer({ ...customer, phone: event.target.value })
                    }
                    required
                    maxLength={20}
                    placeholder="Enter your phone number"
                  />

                  <label htmlFor="customer-address">Delivery address</label>
                  <textarea
                    id="customer-address"
                    autoComplete="street-address"
                    value={customer.address}
                    onChange={(event) =>
                      setCustomer({ ...customer, address: event.target.value })
                    }
                    required
                    maxLength={500}
                    rows={3}
                    placeholder="Where should we deliver your treats?"
                  />
                 
<label htmlFor="payment-method">Choose payment method</label>
<select
  id="payment-method"
  value={customer.paymentMethod || "upi"}
  onChange={(event) =>
    setCustomer({
      ...customer,
      paymentMethod: event.target.value,
    })
  }
  required
>
  <option value="upi">UPI (Demo payment)</option>
  <option value="cod">Cash on Delivery</option>
</select>

<div className="payment-note" role="status">
  {customer.paymentMethod === "upi" ? (
    <p>💗 Demo UPI selected — no real payment will be made.</p>
  ) : (
    <p>🍰 Cash on Delivery selected — pay when your order arrives.</p>
  )}
</div>


                  <button
                    className="primary-button checkout-button"
                    type="submit"
                    disabled={placingOrder}
                  >
                    {placingOrder ? "Placing your order..." : "Place my order ♡"}
                  </button>
                </form>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;
