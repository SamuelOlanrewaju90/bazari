import React, { useState, useEffect, useMemo } from "react";
import { Search, ShoppingCart, User, X, Plus, Minus, Check, ChevronLeft, Package, LogOut, Star } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const PALETTE = {
  navy: "#16213D",
  fog: "#EEF1F2",
  marigold: "#F5A524",
  brick: "#C1502E",
  green: "#2E7D5B",
  teal: "#1B7A8C",
  slate: "#5B6472",
  white: "#FFFFFF",
};

const CATEGORIES = [
  { id: "electronics", name: "Electronics", color: PALETTE.teal, icon: "📱" },
  { id: "fashion", name: "Fashion", color: PALETTE.brick, icon: "👗" },
  { id: "home", name: "Home & Living", color: PALETTE.marigold, icon: "🏠" },
  { id: "beauty", name: "Beauty", color: PALETTE.green, icon: "💄" },
  { id: "groceries", name: "Groceries", color: PALETTE.slate, icon: "🛒" },
  { id: "sports", name: "Sports", color: PALETTE.navy, icon: "⚽" },
];

function formatPrice(n) {
  return "₦" + Number(n).toLocaleString("en-NG");
}

// ---- API helper -----------------------------------------------------------
async function apiFetch(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function normalizeProduct(p) {
  return { id: p.id, name: p.name, cat: p.category, price: p.price_cents, rating: p.rating, stock: p.stock, image: p.image_url };
}

function TicketCard({ children, accent, className = "", style = {} }) {
  return (
    <div className={`relative rounded-lg ${className}`} style={{ background: PALETTE.white, boxShadow: "0 2px 8px rgba(22,33,61,0.08)", ...style }}>
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full" style={{ background: PALETTE.fog }} />
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full" style={{ background: PALETTE.fog }} />
      {accent && <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg" style={{ background: accent }} />}
      {children}
    </div>
  );
}

function StarRating({ value }) {
  return (
    <div className="flex items-center gap-0.5">
      <Star size={13} fill={PALETTE.marigold} color={PALETTE.marigold} />
      <span className="text-xs" style={{ color: PALETTE.slate }}>{value}</span>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState({ name: "home" });
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]); // [{productId, qty, product}]
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [orders, setOrders] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [shipForm, setShipForm] = useState({ name: "", address: "", city: "", phone: "" });
  const [lastOrder, setLastOrder] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Restore session from localStorage on load
  useEffect(() => {
    (async () => {
      const savedToken = localStorage.getItem("bazari_token");
      const savedUser = localStorage.getItem("bazari_user");
      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          const cartRes = await apiFetch("/api/cart", { token: savedToken });
          setToken(savedToken);
          setUser(parsedUser);
          setCart(cartRes.items.map((i) => ({ productId: i.productId, qty: i.qty, product: { id: i.productId, name: i.name, price: i.priceCents, cat: i.category, stock: i.stock, image: i.imageUrl } })));
          setShipForm((f) => ({ ...f, name: parsedUser.name }));
        } catch (e) {
          localStorage.removeItem("bazari_token");
          localStorage.removeItem("bazari_user");
        }
      }
      setLoading(false);
    })();
  }, []);

  // Fetch products whenever filters change (debounced)
  useEffect(() => {
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (activeCat !== "all") params.set("category", activeCat);
        if (search.trim()) params.set("search", search.trim());
        const res = await apiFetch(`/api/products?${params.toString()}`);
        setProducts(res.products.map(normalizeProduct));
        setApiError("");
      } catch (e) {
        setApiError(`Couldn't reach the backend at ${API_BASE}. Is it running?`);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [activeCat, search]);

  const cartTotal = useMemo(() => cart.reduce((sum, c) => sum + (c.product?.price || 0) * c.qty, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, c) => sum + c.qty, 0), [cart]);

  const syncGuestCartToServer = async (tok) => {
    for (const item of cart) {
      try { await apiFetch("/api/cart", { method: "POST", token: tok, body: { productId: item.productId, qty: item.qty } }); } catch (e) {}
    }
    const res = await apiFetch("/api/cart", { token: tok });
    setCart(res.items.map((i) => ({ productId: i.productId, qty: i.qty, product: { id: i.productId, name: i.name, price: i.priceCents, cat: i.category, stock: i.stock, image: i.imageUrl } })));
  };

  const handleAuth = async (mode) => {
    setAuthError("");
    setAuthBusy(true);
    try {
      const path = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body = mode === "signup"
        ? { name: authForm.name.trim(), email: authForm.email.trim(), password: authForm.password }
        : { email: authForm.email.trim(), password: authForm.password };
      const res = await apiFetch(path, { method: "POST", body });
      localStorage.setItem("bazari_token", res.token);
      localStorage.setItem("bazari_user", JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      setShipForm((f) => ({ ...f, name: res.user.name }));
      await syncGuestCartToServer(res.token);
      setView({ name: "home" });
    } catch (e) {
      setAuthError(e.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("bazari_token");
    localStorage.removeItem("bazari_user");
    setToken(null);
    setUser(null);
    setCart([]);
    setOrders([]);
    setView({ name: "home" });
  };

  const addToCart = async (product, qty = 1) => {
    if (token) {
      try {
        const res = await apiFetch("/api/cart", { method: "POST", token, body: { productId: product.id, qty } });
        setCart(res.items.map((i) => ({ productId: i.productId, qty: i.qty, product: { id: i.productId, name: i.name, price: i.priceCents, cat: i.category, stock: i.stock, image: i.imageUrl } })));
      } catch (e) { setApiError(e.message); }
    } else {
      setCart((prev) => {
        const existing = prev.find((c) => c.productId === product.id);
        if (existing) return prev.map((c) => (c.productId === product.id ? { ...c, qty: c.qty + qty } : c));
        return [...prev, { productId: product.id, qty, product }];
      });
    }
  };

  const updateQty = async (productId, qty) => {
    if (token) {
      try {
        const res = await apiFetch(`/api/cart/${productId}`, { method: "PATCH", token, body: { qty } });
        setCart(res.items.map((i) => ({ productId: i.productId, qty: i.qty, product: { id: i.productId, name: i.name, price: i.priceCents, cat: i.category, stock: i.stock, image: i.imageUrl } })));
      } catch (e) { setApiError(e.message); }
    } else {
      setCart((prev) => (qty <= 0 ? prev.filter((c) => c.productId !== productId) : prev.map((c) => (c.productId === productId ? { ...c, qty } : c))));
    }
  };

  const placeOrder = async () => {
    if (!token) { setView({ name: "login" }); return; }
    if (!shipForm.address.trim() || !shipForm.city.trim() || !shipForm.phone.trim()) return;
    setPlacingOrder(true);
    try {
      const res = await apiFetch("/api/orders", { method: "POST", token, body: { shipping: shipForm } });
      const order = res.order;
      setLastOrder({
        id: order.id,
        total: order.totalCents,
        items: order.items.map((it) => ({ name: it.name, qty: it.qty, price: it.priceCents })),
      });
      setCart([]);
      setView({ name: "confirmation" });
    } catch (e) {
      setApiError(e.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const loadOrders = async () => {
    if (!token) return;
    try {
      const res = await apiFetch("/api/orders", { token });
      setOrders(res.orders.map((o) => ({
        id: o.id,
        date: o.createdAt,
        status: o.status,
        total: o.totalCents,
        items: o.items.map((it) => ({ name: it.name, qty: it.qty, price: it.priceCents })),
      })));
    } catch (e) { setApiError(e.message); }
  };

  useEffect(() => { if (view.name === "orders") loadOrders(); }, [view.name, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PALETTE.fog }}>
        <div style={{ fontFamily: "Fraunces, serif", color: PALETTE.navy }} className="text-2xl italic">Bazari</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: PALETTE.fog, fontFamily: "Inter, sans-serif" }}>
      <style>{`.mono{font-family:'IBM Plex Mono',monospace}.display{font-family:'Fraunces',serif}::-webkit-scrollbar{height:6px;width:6px}::-webkit-scrollbar-thumb{background:#c9ced4;border-radius:3px}`}</style>

      {apiError && (
        <div className="text-xs text-center py-1.5 px-4" style={{ background: PALETTE.brick, color: PALETTE.white }}>{apiError}</div>
      )}

      <header className="sticky top-0 z-30" style={{ background: PALETTE.navy }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => setView({ name: "home" })} className="display italic text-2xl shrink-0" style={{ color: PALETTE.white }}>Bazari</button>
          <div className="flex-1 relative hidden sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" color={PALETTE.slate} />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setView({ name: "home" }); }} placeholder="Search products…"
              className="w-full pl-9 pr-3 py-2 rounded-full text-sm outline-none" style={{ background: PALETTE.fog, color: PALETTE.navy }} />
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
            <button onClick={() => setView({ name: user ? "orders" : "login" })} className="flex items-center gap-1.5 text-sm" style={{ color: PALETTE.white }}>
              <User size={19} /><span className="hidden md:inline">{user ? user.name.split(" ")[0] : "Sign in"}</span>
            </button>
            <button onClick={() => setCartOpen(true)} className="relative flex items-center" style={{ color: PALETTE.white }}>
              <ShoppingCart size={20} />
              {cartCount > 0 && <span className="absolute -top-2 -right-2 text-[10px] w-4 h-4 rounded-full flex items-center justify-center mono" style={{ background: PALETTE.marigold, color: PALETTE.navy }}>{cartCount}</span>}
            </button>
          </div>
        </div>
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" color={PALETTE.slate} />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setView({ name: "home" }); }} placeholder="Search products…"
              className="w-full pl-9 pr-3 py-2 rounded-full text-sm outline-none" style={{ background: PALETTE.fog, color: PALETTE.navy }} />
          </div>
        </div>
      </header>

      <div className="border-b" style={{ borderColor: "#e2e5e8", background: PALETTE.white }}>
        <div className="max-w-6xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto">
          <button onClick={() => { setActiveCat("all"); setView({ name: "home" }); }} className="px-3 py-1.5 rounded-full text-xs font-semibold shrink-0"
            style={{ background: activeCat === "all" ? PALETTE.navy : PALETTE.fog, color: activeCat === "all" ? PALETTE.white : PALETTE.navy }}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => { setActiveCat(c.id); setView({ name: "home" }); }} className="px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1"
              style={{ background: activeCat === c.id ? c.color : PALETTE.fog, color: activeCat === c.id ? PALETTE.white : PALETTE.navy }}>
              <span>{c.icon}</span>{c.name}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {view.name === "home" && (
          <>
            {activeCat === "all" && !search && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">
                {CATEGORIES.map((c) => (
                  <button key={c.id} onClick={() => setActiveCat(c.id)} className="rounded-xl py-4 flex flex-col items-center gap-1.5 transition-transform hover:-translate-y-0.5"
                    style={{ background: PALETTE.white, boxShadow: "0 2px 8px rgba(22,33,61,0.06)" }}>
                    <span className="text-2xl">{c.icon}</span>
                    <span className="text-xs font-semibold" style={{ color: PALETTE.navy }}>{c.name}</span>
                    <span className="w-8 h-1 rounded-full" style={{ background: c.color }} />
                  </button>
                ))}
              </div>
            )}
            <h2 className="display text-xl font-semibold mb-4" style={{ color: PALETTE.navy }}>
              {search ? `Results for "${search}"` : activeCat === "all" ? "All stalls" : CATEGORIES.find((c) => c.id === activeCat)?.name}
              <span className="text-sm font-normal ml-2" style={{ color: PALETTE.slate }}>({products.length})</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-1">
              {products.map((p) => {
                const cat = CATEGORIES.find((c) => c.id === p.cat);
                return (
                  <TicketCard key={p.id} accent={cat?.color} className="p-3 flex flex-col cursor-pointer">
                    <div onClick={() => setView({ name: "product", id: p.id })}>
                      <div className="mb-2 h-16 flex items-center justify-center rounded-lg overflow-hidden" style={{ background: PALETTE.fog }}>
                        {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-4xl">{cat?.icon}</span>}
                      </div>
                      <div className="text-xs font-semibold mb-1" style={{ color: PALETTE.navy }}>{p.name}</div>
                      <StarRating value={p.rating} />
                      <div className="mono text-sm font-semibold mt-1" style={{ color: PALETTE.navy }}>{formatPrice(p.price)}</div>
                      <div className="text-[10px]" style={{ color: PALETTE.slate }}>{p.stock} in stock</div>
                    </div>
                    <button onClick={() => addToCart(p)} className="mt-2 text-xs font-semibold py-1.5 rounded-md" style={{ background: PALETTE.marigold, color: PALETTE.navy }}>Add to cart</button>
                  </TicketCard>
                );
              })}
              {products.length === 0 && !apiError && <div className="col-span-full text-center py-12" style={{ color: PALETTE.slate }}>No products match your search.</div>}
            </div>
          </>
        )}

        {view.name === "product" && (() => {
          const p = products.find((pp) => pp.id === view.id);
          if (!p) return null;
          const cat = CATEGORIES.find((c) => c.id === p.cat);
          return (
            <div>
              <button onClick={() => setView({ name: "home" })} className="flex items-center gap-1 text-sm mb-4" style={{ color: PALETTE.slate }}><ChevronLeft size={16} /> Back</button>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="h-64 flex items-center justify-center rounded-xl overflow-hidden" style={{ background: PALETTE.white }}>
                  {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-9xl">{cat?.icon}</span>}
                </div>
                <div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: cat?.color, color: PALETTE.white }}>{cat?.name}</span>
                  <h1 className="display text-2xl font-semibold mt-3" style={{ color: PALETTE.navy }}>{p.name}</h1>
                  <div className="mt-2"><StarRating value={p.rating} /></div>
                  <div className="mono text-2xl font-semibold mt-3" style={{ color: PALETTE.navy }}>{formatPrice(p.price)}</div>
                  <div className="text-sm mt-1" style={{ color: PALETTE.slate }}>{p.stock} units in stock</div>
                  <button onClick={() => { addToCart(p); setCartOpen(true); }} className="mt-6 px-6 py-2.5 rounded-lg text-sm font-semibold" style={{ background: PALETTE.marigold, color: PALETTE.navy }}>Add to cart</button>
                </div>
              </div>
            </div>
          );
        })()}

        {view.name === "login" && (
          <div className="max-w-sm mx-auto py-8">
            <h2 className="display text-xl font-semibold mb-1" style={{ color: PALETTE.navy }}>Welcome to Bazari</h2>
            <p className="text-sm mb-6" style={{ color: PALETTE.slate }}>Sign in or create an account to check out and track orders.</p>
            <div className="space-y-3">
              <input placeholder="Full name (for new accounts)" value={authForm.name} onChange={(e) => setAuthForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ borderColor: "#dde1e4" }} />
              <input placeholder="Email address" value={authForm.email} onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ borderColor: "#dde1e4" }} />
              <input type="password" placeholder="Password (min 6 characters)" value={authForm.password} onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ borderColor: "#dde1e4" }} />
              {authError && <div className="text-xs" style={{ color: PALETTE.brick }}>{authError}</div>}
              <div className="flex gap-2 pt-1">
                <button disabled={authBusy} onClick={() => handleAuth("login")} className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: PALETTE.navy, color: PALETTE.white }}>Sign in</button>
                <button disabled={authBusy} onClick={() => handleAuth("signup")} className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: PALETTE.marigold, color: PALETTE.navy }}>Create account</button>
              </div>
            </div>
          </div>
        )}

        {view.name === "orders" && user && (
          <div>
            <div className="flex items-center justify-between mb-5
            <div>
                <h2 className="display text-xl font-semibold" style={{ color: PALETTE.navy }}>My Orders</h2>
                <p className="text-sm" style={{ color: PALETTE.slate }}>{user.name} · {user.email}</p>
              </div>
              <button onClick={logout} className="flex items-center gap-1 text-sm font-semibold" style={{ color: PALETTE.brick }}><LogOut size={15} /> Log out</button>
            </div>
            {orders.length === 0 && <div className="text-center py-16" style={{ color: PALETTE.slate }}><Package size={32} className="mx-auto mb-2" />No orders yet. Time to visit a stall!</div>}
            <div className="space-y-4">
              {orders.map((o) => (
                <TicketCard key={o.id} accent={PALETTE.green} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="mono text-xs" style={{ color: PALETTE.slate }}>{o.id}</div>
                      <div className="text-xs" style={{ color: PALETTE.slate }}>{new Date(o.date).toLocaleDateString()}</div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: PALETTE.green, color: PALETTE.white }}>{o.status}</span>
                  </div>
                  <div className="text-sm" style={{ color: PALETTE.navy }}>
                    {o.items.map((it, i) => (
                      <div key={i} className="flex justify-between py-0.5"><span>{it.qty}× {it.name}</span><span className="mono">{formatPrice(it.price * it.qty)}</span></div>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-2 flex justify-between font-semibold text-sm" style={{ borderColor: "#eee", color: PALETTE.navy }}><span>Total</span><span className="mono">{formatPrice(o.total)}</span></div>
                </TicketCard>
              ))}
            </div>
          </div>
        )}

        {view.name === "checkout" && (
          <div className="max-w-md mx-auto py-4">
            <button onClick={() => { setView({ name: "home" }); setCartOpen(true); }} className="flex items-center gap-1 text-sm mb-4" style={{ color: PALETTE.slate }}><ChevronLeft size={16} /> Back to cart</button>
            <h2 className="display text-xl font-semibold mb-4" style={{ color: PALETTE.navy }}>Shipping details</h2>
            <div className="space-y-3">
              <input placeholder="Full name" value={shipForm.name} onChange={(e) => setShipForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ borderColor: "#dde1e4" }} />
              <input placeholder="Delivery address" value={shipForm.address} onChange={(e) => setShipForm((f) => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ borderColor: "#dde1e4" }} />
              <input placeholder="City" value={shipForm.city} onChange={(e) => setShipForm((f) => ({ ...f, city: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ borderColor: "#dde1e4" }} />
              <input placeholder="Phone number" value={shipForm.phone} onChange={(e) => setShipForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ borderColor: "#dde1e4" }} />
            </div>
            <TicketCard accent={PALETTE.marigold} className="p-4 mt-5">
              {cart.map((c) => (
                <div key={c.productId} className="flex justify-between text-sm py-0.5" style={{ color: PALETTE.navy }}><span>{c.qty}× {c.product.name}</span><span className="mono">{formatPrice(c.product.price * c.qty)}</span></div>
              ))}
              <div className="border-t mt-2 pt-2 flex justify-between font-semibold" style={{ borderColor: "#eee", color: PALETTE.navy }}><span>Total</span><span className="mono">{formatPrice(cartTotal)}</span></div>
            </TicketCard>
            <button onClick={placeOrder} disabled={placingOrder || !shipForm.address.trim() || !shipForm.city.trim() || !shipForm.phone.trim()}
              className="w-full mt-4 py-3 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ background: PALETTE.navy, color: PALETTE.white }}>
              {placingOrder ? "Placing order…" : "Place order (Cash on Delivery)"}
            </button>
          </div>
        )}

        {view.name === "confirmation" && lastOrder && (
          <div className="max-w-sm mx-auto py-10 text-center">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: PALETTE.green }}><Check color={PALETTE.white} size={26} /></div>
            <h2 className="display text-xl font-semibold" style={{ color: PALETTE.navy }}>Order confirmed!</h2>
            <p className="text-sm mt-1 mb-6" style={{ color: PALETTE.slate }}>Your ticket is below — keep an eye on your order history.</p>
            <TicketCard accent={PALETTE.marigold} className="p-4 text-left">
              <div className="mono text-xs" style={{ color: PALETTE.slate }}>{lastOrder.id}</div>
              {lastOrder.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm py-0.5" style={{ color: PALETTE.navy }}><span>{it.qty}× {it.name}</span><span className="mono">{formatPrice(it.price * it.qty)}</span></div>
              ))}
              <div className="border-t mt-2 pt-2 flex justify-between font-semibold" style={{ borderColor: "#eee", color: PALETTE.navy }}><span>Total</span><span className="mono">{formatPrice(lastOrder.total)}</span></div>
            </TicketCard>
            <button onClick={() => setView({ name: "orders" })} className="w-full mt-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: PALETTE.navy, color: PALETTE.white }}>View my orders</button>
            <button onClick={() => setView({ name: "home" })} className="w-full mt-2 py-2.5 rounded-lg text-sm font-semibold border" style={{ borderColor: "#dde1e4", color: PALETTE.navy }}>Keep shopping</button>
          </div>
        )}
      </main>

      {cartOpen && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setCartOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(22,33,61,0.4)" }} />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm h-full flex flex-col" style={{ background: PALETTE.white }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "#eee" }}>
              <h3 className="display font-semibold text-lg" style={{ color: PALETTE.navy }}>Your cart</h3>
              <button onClick={() => setCartOpen(false)}><X size={20} color={PALETTE.navy} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 && <div className="text-sm text-center py-10" style={{ color: PALETTE.slate }}>Your cart is empty.</div>}
              {cart.map((c) => (
                <div key={c.productId} className="flex gap-3 items-center">
                  <div className="w-12 h-12 flex items-center justify-center rounded-lg shrink-0 overflow-hidden" style={{ background: PALETTE.fog }}>
                    {c.product.image ? <img src={c.product.image} alt={c.product.name} className="w-full h-full object-cover" /> : <span className="text-2xl">{CATEGORIES.find((cat) => cat.id === c.product.cat)?.icon}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: PALETTE.navy }}>{c.product.name}</div>
                    <div className="mono text-xs" style={{ color: PALETTE.slate }}>{formatPrice(c.product.price)}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => updateQty(c.productId, c.qty - 1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: PALETTE.fog }}><Minus size={12} /></button>
                    <span className="text-xs w-4 text-center">{c.qty}</span>
                    <button onClick={() => updateQty(c.productId, c.qty + 1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: PALETTE.fog }}><Plus size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t" style={{ borderColor: "#eee" }}>
                <div className="flex justify-between text-sm font-semibold mb-3" style={{ color: PALETTE.navy }}><span>Subtotal</span><span className="mono">{formatPrice(cartTotal)}</span></div>
                <button onClick={() => { setCartOpen(false); setView({ name: user ? "checkout" : "login" }); }} className="w-full py-2.5 rounded-lg text-sm font-semibold" style={{ background: PALETTE.marigold, color: PALETTE.navy }}>Checkout</button>
              </div>
            )}
           </div>
          )}
         </div>
         );
  -5
