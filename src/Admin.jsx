import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./Admin.css";

const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Completed",
  "Cancelled",
];

const CAKE_STATUSES = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Completed",
  "Cancelled",
];

const EMPTY_PRODUCT = {
  name: "",
  category: "",
  price: "",
  image_url: "",
  description: "",
  is_available: true,
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN");
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const name = item.name || item.product_name || "Item";
          const quantity = item.quantity || 1;

          return `${name} × ${quantity}`;
        }

        return String(item);
      })
      .join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatPrice(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return `₹${amount.toLocaleString("en-IN")}`;
}

function Admin() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [orders, setOrders] = useState([]);
  const [cakeRequests, setCakeRequests] = useState([]);
  const [products, setProducts] = useState([]);

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [editingProductId, setEditingProductId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error) {
        setErrorMessage(error.message);
      }

      setSession(data?.session || null);
      setCheckingSession(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (active) {
        setSession(newSession);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      loadDashboard();
    }
  }, [session]);

  async function login(event) {
    event.preventDefault();

    setLoginLoading(true);
    setErrorMessage("");
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoginLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSession(data.session);
    setPassword("");
    setMessage("Welcome to your bakery dashboard!");
  }

  async function logout() {
    setErrorMessage("");
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSession(null);
    setOrders([]);
    setCakeRequests([]);
    setProducts([]);
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Customer orders: ${error.message}`);
    }

    setOrders(data || []);
  }

  async function loadCakeRequests() {
    const { data, error } = await supabase
      .from("custom_cake_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Custom cake requests: ${error.message}`);
    }

    setCakeRequests(data || []);
  }

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`Products: ${error.message}`);
    }

    setProducts(data || []);
  }

  async function loadDashboard() {
    setLoadingData(true);
    setErrorMessage("");

    try {
      const results = await Promise.allSettled([
        loadOrders(),
        loadCakeRequests(),
        loadProducts(),
      ]);

      const failures = results
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason.message);

      if (failures.length > 0) {
        setErrorMessage(failures.join(" | "));
      }
    } catch (error) {
      setErrorMessage(error.message || "Unable to load the dashboard.");
    } finally {
      setLoadingData(false);
    }
  }

  async function updateOrderStatus(orderId, newStatus) {
    setErrorMessage("");
    setMessage("");

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      setErrorMessage(`Could not update order: ${error.message}`);
      return;
    }

    setOrders((previous) =>
      previous.map((order) =>
        order.id === orderId
          ? { ...order, status: newStatus }
          : order
      )
    );

    setMessage("Customer order status updated successfully.");
  }

  async function updateCakeStatus(requestId, newStatus) {
    setErrorMessage("");
    setMessage("");

    const { error } = await supabase
      .from("custom_cake_requests")
      .update({ status: newStatus })
      .eq("id", requestId);

    if (error) {
      setErrorMessage(`Could not update cake request: ${error.message}`);
      return;
    }

    setCakeRequests((previous) =>
      previous.map((request) =>
        request.id === requestId
          ? { ...request, status: newStatus }
          : request
      )
    );

    setMessage("Custom cake request status updated successfully.");
  }

  function handleProductInput(event) {
    const { name, value, type, checked } = event.target;

    setProductForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetProductForm() {
    setProductForm({ ...EMPTY_PRODUCT });
    setEditingProductId(null);
  }

  function startEditingProduct(product) {
    setEditingProductId(product.id);

    setProductForm({
      name: product.name || "",
      category: product.category || "",
      price: String(product.price ?? ""),
      image_url: product.image_url || "",
      description: product.description || "",
      is_available: product.is_available !== false,
    });

    setMessage("");
    setErrorMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveProduct(event) {
    event.preventDefault();

    setSaving(true);
    setErrorMessage("");
    setMessage("");

    const price = Number(productForm.price);

    if (
      !productForm.name.trim() ||
      !productForm.category.trim() ||
      productForm.price === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setErrorMessage(
        "Please enter a product name, category, and a valid price."
      );

      setSaving(false);
      return;
    }

    const productData = {
      name: productForm.name.trim(),
      category: productForm.category.trim(),
      price,
      image_url: productForm.image_url.trim() || null,
      description: productForm.description.trim() || null,
      is_available: productForm.is_available,
    };

    let result;

    if (editingProductId !== null) {
      result = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProductId);
    } else {
      result = await supabase
        .from("products")
        .insert([productData]);
    }

    setSaving(false);

    if (result.error) {
      setErrorMessage(`Could not save product: ${result.error.message}`);
      return;
    }

    resetProductForm();

    setMessage(
      editingProductId !== null
        ? "Product updated successfully!"
        : "New product added successfully!"
    );

    await loadProducts();
  }

  async function toggleProductAvailability(product) {
    setErrorMessage("");
    setMessage("");

    const newAvailability = product.is_available === false;

    const { error } = await supabase
      .from("products")
      .update({ is_available: newAvailability })
      .eq("id", product.id);

    if (error) {
      setErrorMessage(`Could not update product: ${error.message}`);
      return;
    }

    setProducts((previous) =>
      previous.map((item) =>
        item.id === product.id
          ? { ...item, is_available: newAvailability }
          : item
      )
    );

    setMessage(
      newAvailability
        ? "Product is now available in the shop."
        : "Product is now hidden from the shop."
    );
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setErrorMessage("");
    setMessage("");

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      setErrorMessage(`Could not delete product: ${error.message}`);
      return;
    }

    setProducts((previous) =>
      previous.filter((item) => item.id !== product.id)
    );

    if (editingProductId === product.id) {
      resetProductForm();
    }

    setMessage("Product deleted successfully.");
  }

  const filteredProducts = products.filter((product) => {
    const search = searchTerm.toLowerCase();

    return (
      (product.name || "").toLowerCase().includes(search) ||
      (product.category || "").toLowerCase().includes(search) ||
      (product.description || "").toLowerCase().includes(search)
    );
  });

  const totalOrderRevenue = orders.reduce((total, order) => {
    const amount = Number(order.total ?? order.total_amount ?? 0);

    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  if (checkingSession) {
    return (
      <main className="admin-container">
        <p>Opening your bakery dashboard...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="admin-container">
        <section className="admin-login">
          <h1>The Sugar Bloom Bakery</h1>
          <p>Admin Dashboard</p>
          <p>Sign in to manage your bakery.</p>

          {errorMessage && (
            <div className="admin-error" role="alert">
              {errorMessage}
            </div>
          )}

          <form onSubmit={login}>
            <div className="product-form-field">
              <label htmlFor="admin-email">Email address</label>

              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="product-form-field">
              <label htmlFor="admin-password">Password</label>

              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" disabled={loginLoading}>
              {loginLoading ? "Signing in..." : "Login"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-container">
      <header className="admin-header">
        <div>
          <h1>The Sugar Bloom Bakery</h1>
          <p>Admin Dashboard</p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loadingData}
          >
            {loadingData ? "Refreshing..." : "Refresh"}
          </button>

          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {message && (
        <div className="admin-success" role="status">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="admin-error" role="alert">
          {errorMessage}
        </div>
      )}

      <section className="admin-stats">
        <article className="admin-stat-card">
          <h3>Total Products</h3>
          <p>{products.length}</p>
        </article>

        <article className="admin-stat-card">
          <h3>Customer Orders</h3>
          <p>{orders.length}</p>
        </article>

        <article className="admin-stat-card">
          <h3>Custom Cake Requests</h3>
          <p>{cakeRequests.length}</p>
        </article>

        <article className="admin-stat-card">
          <h3>Order Revenue</h3>
          <p>{formatPrice(totalOrderRevenue)}</p>
        </article>
      </section>

      <section className="admin-section">
        <h2>Product Management</h2>
        <p>Add new treats, update prices, and manage product availability.</p>

        <form className="product-management-form" onSubmit={saveProduct}>
          <h3>
            {editingProductId !== null ? "Edit Product" : "Add New Product"}
          </h3>

          <div className="product-form-grid">
            <div className="product-form-field">
              <label htmlFor="product-name">Product Name *</label>

              <input
                id="product-name"
                name="name"
                value={productForm.name}
                onChange={handleProductInput}
                placeholder="e.g. Chocolate Truffle Cake"
                required
              />
            </div>

            <div className="product-form-field">
              <label htmlFor="product-category">Category *</label>

              <input
                id="product-category"
                name="category"
                value={productForm.category}
                onChange={handleProductInput}
                placeholder="e.g. Cakes, Cupcakes, Cookies"
                required
              />
            </div>

            <div className="product-form-field">
              <label htmlFor="product-price">Price (₹) *</label>

              <input
                id="product-price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={productForm.price}
                onChange={handleProductInput}
                placeholder="e.g. 650"
                required
              />
            </div>

            <div className="product-form-field">
              <label htmlFor="product-image">Image URL</label>

              <input
                id="product-image"
                name="image_url"
                type="url"
                value={productForm.image_url}
                onChange={handleProductInput}
                placeholder="Paste the image URL"
              />
            </div>

            <div className="product-form-field product-form-wide">
              <label htmlFor="product-description">Description</label>

              <textarea
                id="product-description"
                name="description"
                value={productForm.description}
                onChange={handleProductInput}
                placeholder="Describe this delicious treat..."
                rows="3"
              />
            </div>

            <div className="product-form-field product-availability">
              <label>
                <input
                  type="checkbox"
                  name="is_available"
                  checked={productForm.is_available}
                  onChange={handleProductInput}
                />
                Available in the online shop
              </label>
            </div>
          </div>

          <div className="product-form-actions">
            <button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingProductId !== null
                  ? "Save Changes"
                  : "Add Product"}
            </button>

            {editingProductId !== null && (
              <button
                type="button"
                onClick={resetProductForm}
                disabled={saving}
              >
                Cancel Editing
              </button>
            )}
          </div>
        </form>

        <div className="product-list-heading">
          <h3>Your Products ({products.length})</h3>

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
          />
        </div>

        {loadingData && products.length === 0 ? (
          <p>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Availability</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      {product.image_url ? (
                        <img
                          className="admin-product-image"
                          src={product.image_url}
                          alt={product.name}
                          loading="lazy"
                        />
                      ) : (
                        <span>No image</span>
                      )}
                    </td>

                    <td>
                      <strong>{product.name}</strong>

                      {product.description && (
                        <p className="product-description-preview">
                          {product.description}
                        </p>
                      )}
                    </td>

                    <td>{product.category}</td>
                    <td>{formatPrice(product.price)}</td>

                    <td>
                      {product.is_available === false
                        ? "Unavailable"
                        : "Available"}
                    </td>

                    <td>
                      <div className="product-action-buttons">
                        <button
                          type="button"
                          onClick={() => startEditingProduct(product)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleProductAvailability(product)}
                        >
                          {product.is_available === false
                            ? "Make Available"
                            : "Hide Product"}
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteProduct(product)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>Customer Orders</h2>
        <p>View customer orders and update their status.</p>

        {orders.length === 0 ? (
          <p>No customer orders found.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer Details</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{formatValue(order.id)}</td>

                    <td>
                      <strong>
                        {formatValue(
                          order.customer_name || order.name
                        )}
                      </strong>

                      <p>{formatValue(order.phone || order.phone_number)}</p>
                      <p>{formatValue(order.email)}</p>
                      <p>{formatValue(order.address)}</p>
                    </td>

                    <td>
                      {formatValue(
                        order.items ||
                          order.order_items ||
                          order.products
                      )}
                    </td>

                    <td>
                      {formatPrice(
                        order.total ?? order.total_amount ?? order.amount
                      )}
                    </td>

                    <td>
                      {formatDate(order.created_at)}
                    </td>

                    <td>
                      <select
                        value={order.status || "Pending"}
                        onChange={(event) =>
                          updateOrderStatus(order.id, event.target.value)
                        }
                        aria-label={`Status for order ${order.id}`}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>Custom Cake Requests</h2>
        <p>Review customer requests for personalised cakes.</p>

        {cakeRequests.length === 0 ? (
          <p>No custom cake requests found.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Customer</th>
                  <th>Cake Details</th>
                  <th>Budget</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {cakeRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{formatValue(request.id)}</td>

                    <td>
                      <strong>
                        {formatValue(
                          request.customer_name || request.name
                        )}
                      </strong>

                      <p>
                        {formatValue(
                          request.phone || request.phone_number
                        )}
                      </p>

                      <p>{formatValue(request.email)}</p>
                    </td>

                    <td>
                      <p>
                        <strong>Flavour:</strong>{" "}
                        {formatValue(request.flavour || request.flavor)}
                      </p>

                      <p>
                        <strong>Size:</strong>{" "}
                        {formatValue(request.size)}
                      </p>

                      <p>
                        <strong>Message:</strong>{" "}
                        {formatValue(
                          request.message ||
                            request.description ||
                            request.details
                        )}
                      </p>

                      <p>
                        <strong>Delivery:</strong>{" "}
                        {formatValue(
                          request.delivery_date ||
                            request.required_date
                        )}
                      </p>
                    </td>

                    <td>
                      {formatPrice(
                        request.budget || request.price
                      )}
                    </td>

                    <td>{formatDate(request.created_at)}</td>

                    <td>
                      <select
                        value={request.status || "Pending"}
                        onChange={(event) =>
                          updateCakeStatus(
                            request.id,
                            event.target.value
                          )
                        }
                        aria-label={`Status for cake request ${request.id}`}
                      >
                        {CAKE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="admin-footer">
        <p>The Sugar Bloom Bakery · Admin Panel</p>
      </footer>
    </main>
  );
}

export default Admin;