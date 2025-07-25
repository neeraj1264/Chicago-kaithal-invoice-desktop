import React, { useState, useEffect, useMemo } from "react";
import { FaFileInvoice, FaImage, FaTrash } from "react-icons/fa6";
import { useLocation, useNavigate } from "react-router-dom";
import "./Invoice.css";
import {
  FaMinusCircle,
  FaPlusCircle,
  FaArrowRight,
  FaBars,
  FaTimesCircle,
  FaSearch,
  FaEdit,
  FaShoppingCart,
} from "react-icons/fa";
// import { AiOutlineBars } from "react-icons/ai";
import { IoMdCloseCircle } from "react-icons/io";
import Header from "../header/Header";
import { fetchProducts, removeProduct } from "../../api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { IoClose } from "react-icons/io5";
import { getAll, saveItems } from "../../DB";
import { useOnlineStatus } from "../../useOnlineStatus";

const toastOptions = {
  position: "bottom-right",
  autoClose: 2000,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
  width: "90%",
};
const BOGO_ELIGIBLE_PRODUCTS = {
  "Italian sweet": ["med", "large"],
  "Heat 'n' sweet": ["med", "large"],
  "Hot stuff": ["med", "large"],
  "Garlic to hot": ["med", "large"],
  "Four season": ["med", "large"],
  "Super spicy": ["med", "large"],
  "Love in box (heart shape)": ["med", "large"],
  "Cheese pizza": ["med", "large"],
  "Chicago's spl. paneer": ["med", "large"],
  "Peri peri boom": ["med", "large"],
  "Mughlai retreat": ["med", "large"],
  "Karahi paneer pizza": ["med", "large"],
  "Makhni supreme": ["med", "large"],
  "7 veggies": ["med", "large"],
  "Mexicana overload": ["med", "large"],
  "Tandoori paneer": ["med", "large"],
  "Cheese pasta pizza": ["med", "large"],
  "Spicy pasta pizza": ["med", "large"],
  "Chicago's flood": ["med", "large"],
  "Bursty cheese pizza": ["med"],
};
const Invoice = () => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productsToSend, setProductsToSend] = useState([]);
  const [Search, setSearch] = useState(""); // State for search query
  const [showPopup, setShowPopup] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [selectedVariety, setSelectedVariety] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCategoryVisible, setIsCategoryVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const { isOnline, checkBackend } = useOnlineStatus();
  const [isChecking, setIsChecking] = useState(false);

  // default to “delivery”
  const [orderType, setOrderType] = useState("delivery");

  // two separate lists in localStorage
  const [deliveryBills, setDeliveryBills] = useState(
    () => JSON.parse(localStorage.getItem("deliveryKotData")) || []
  );
  const [dineInBills, setDineInBills] = useState(
    () => JSON.parse(localStorage.getItem("dineInKotData")) || []
  );
  const [takeawayBills, setTakeawayBills] = useState(
    () => JSON.parse(localStorage.getItem("takeawayKotData")) || []
  );
  // tracks which list to show in the modal
  const [modalType, setModalType] = useState("delivery"); // "delivery" or "dine-in"

  const openBillsModal = (type) => {
    setModalType(type);
    setShowKotModal(true);
  };

  // State for modal visibility and data
  const [showKotModal, setShowKotModal] = useState(false);
  const [now, setNow] = useState(Date.now());

  const navigate = useNavigate(); // For navigation

  const [bogoEnabled, setBogoEnabled] = useState(false);
  const [isThursday, setIsThursday] = useState(false);
  // Effect to check day of week and automatically enable BOGO on Thursdays
  useEffect(() => {
    const checkDay = () => {
      const today = new Date().getDay(); // Sunday = 0, Monday = 1, ..., Thursday = 4
      const thursday = 4;
      setIsThursday(today === thursday);

      // Automatically enable BOGO on Thursdays
      if (today === thursday) {
        setBogoEnabled(true);
      } else {
        setBogoEnabled(false);
      }
    };

    // Check immediately on load
    checkDay();

    // Set up interval to check every hour in case the app is left open
    const interval = setInterval(checkDay, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, []);

  const guardAddProduct = async (e) => {
    e.preventDefault();
    if (isChecking) return;
    setIsChecking(true);

    // Get fresh status on click
    const currentStatus = await checkBackend();

    if (currentStatus) {
      navigate("/NewProduct");
    } else {
      alert("You’re offline—cannot add a new product right now.");
    }
    setIsChecking(false);
  };

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const EXPIRY_MS = 2 * 60 * 60 * 1000;

  useEffect(() => {
    const cleanUp = (bills, setBills, storageKey) => {
      const fresh = bills.filter((order) => now - order.timestamp < EXPIRY_MS);
      if (fresh.length !== bills.length) {
        setBills(fresh);
        localStorage.setItem(storageKey, JSON.stringify(fresh));
      }
    };

    cleanUp(deliveryBills, setDeliveryBills, "deliveryKotData");
    cleanUp(dineInBills, setDineInBills, "dineInKotData");
    cleanUp(takeawayBills, setTakeawayBills, "takeawayKotData");
  }, [now, deliveryBills, dineInBills, takeawayBills]);

  // Format milliseconds to HH:mm:ss
  const formatRemaining = (ms) => {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
      2,
      "0"
    );
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };


  const handlePressEnd = () => {
    // Clear the timeout if the user releases the press before 1 second
    clearTimeout(pressTimer);
  };

  const filteredProducts = selectedProducts
    .filter((product) =>
      product.name.toLowerCase().includes(Search.toLowerCase())
    )
    .reduce((acc, product) => {
      const category = product.category || "Others";

      // Ensure the category key exists in the accumulator
      if (!acc[category]) {
        acc[category] = [];
      }

      // Add the product to the correct category group
      acc[category].push(product);

      return acc;
    }, {});

  const location = useLocation();

  // memoize sorted category list for consistency
  const categories = useMemo(
    () => Object.keys(filteredProducts).sort((a, b) => a.localeCompare(b)),
    [filteredProducts]
  );

  // initialize activeCategory when filteredProducts first load
  useEffect(() => {
    if (categories.length) setActiveCategory(categories[0]);
  }, [categories]);

  // improved scroll‐spy
  useEffect(() => {
    const offset = 7 * 24; // px

    const onScroll = () => {
      // build array of {cat, distance} pairs
      const distances = categories.map((cat) => {
        const el = document.getElementById(cat);
        const top = el ? el.getBoundingClientRect().top : Infinity;
        return { cat, distance: top - offset };
      });

      // filter for those “above” the offset, then pick the one closest to it
      const inView = distances
        .filter((d) => d.distance <= 0)
        .sort((a, b) => b.distance - a.distance);

      setActiveCategory(inView[0]?.cat ?? categories[0]);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // run once on mount
    return () => window.removeEventListener("scroll", onScroll);
  }, [categories]);

  useEffect(() => {
    localStorage.removeItem("productsToSend");
    setProductsToSend([]);
  }, []);
  useEffect(() => {
    const fromCustomerDetail = location.state?.from === "customer-detail";
    if (fromCustomerDetail) {
      localStorage.removeItem("productsToSend");
      setProductsToSend([]);
    }
  }, [location]);

useEffect(() => {
  let cancelled = false;

  async function hydrateFromIDB() {
    try {
      const offline = await getAll("products");
      if (cancelled) return;
      setSelectedProducts(offline);
    } catch (err) {
      console.error("Error loading from IDB:", err);
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  async function refreshFromServer() {
    try {
      const products = await fetchProducts();
      if (cancelled) return;
      setSelectedProducts(products);
      await saveItems("products", products);
    } catch (err) {
      console.warn("Server fetch failed, keeping IDB data:", err);
    }
  }

  hydrateFromIDB();      // 1️⃣ immediately populate from IDB & hide spinner
  refreshFromServer();   // 2️⃣ then update in background

  // also restore the cart‑to‑send list
  const stored = JSON.parse(localStorage.getItem("productsToSend")) || [];
  setProductsToSend(stored);
  localStorage.removeItem("deliveryCharge");

  return () => {
    cancelled = true;
  };
}, []);

  // Persist cart to IDB whenever it changes
  useEffect(() => {
    // clear old cart, then repopulate
    const syncCart = async () => {
      await saveItems(
        "cart",
        productsToSend.map((p, idx) => ({ ...p, id: idx }))
      );
    };
    if (productsToSend.length) syncCart();
  }, [productsToSend]);

  const handleOpenPopup = (product) => {
    if (product.varieties && product.varieties.length > 0) {
      setCurrentProduct(product);
      setShowPopup(true);

      const savedSelectedVarieties = JSON.parse(
        localStorage.getItem("selectedVariety") || "[]"
      );
      setSelectedVariety(
        savedSelectedVarieties.filter((v) => v.productId === product.id)
      ); // Filter by productId
    } else {
      handleAddToWhatsApp(product); // Directly add product if no varieties
    }
  };
  const handleProductClick = (product) => {
    const audio = new Audio("/sounds/click.wav"); // path from public folder
    audio.play();
    handleOpenPopup(product);
  };

  useEffect(() => {
    if (selectedVariety.length > 0) {
      localStorage.setItem("selectedVariety", JSON.stringify(selectedVariety));
    }
  }, [selectedVariety]);

  // Clear selectedVariety from localStorage when page refreshes
  useEffect(() => {
    localStorage.removeItem("selectedVariety");
  }, []);

  const handleVarietyQuantityChange = (variety, delta, productId) => {
    setSelectedVariety((prev) => {
      let updatedVarieties = prev.map((selected) =>
        selected.size === variety.size &&
        selected.price === variety.price &&
        selected.productId === productId
          ? { ...selected, quantity: (selected.quantity || 0) + delta }
          : selected
      );

      // Remove variety if the quantity becomes less than 1
      updatedVarieties = updatedVarieties.filter(
        (selected) => selected.quantity > 0
      );

      // Save updated selectedVariety to localStorage
      localStorage.setItem("selectedVariety", JSON.stringify(updatedVarieties));

      // Update productsToSend based on the updated selectedVarieties

      return updatedVarieties;
    });
  };

  const handleVarietyChange = (variety, isChecked, productId) => {
    setSelectedVariety((prev) => {
      let updatedVarieties;
      if (isChecked) {
        updatedVarieties = [
          ...prev,
          { ...variety, quantity: 1, productId }, // Add productId to variety
        ];
      } else {
        updatedVarieties = prev.filter(
          (selected) =>
            !(
              selected.size === variety.size &&
              selected.price === variety.price &&
              selected.productId === productId
            ) // Match by productId too
        );
      }

      localStorage.setItem("selectedVariety", JSON.stringify(updatedVarieties));
      return updatedVarieties;
    });
  };

  const handleAddToWhatsApp = (product, selectedVarieties = []) => {
    // Handle products with no varieties
    if (selectedVarieties.length === 0) {
      const exists = productsToSend.some(
        (prod) =>
          prod.name === product.name &&
          prod.price === product.price &&
          prod.size === product.size
      );

      setProductsToSend((prev) => {
        let updated = [];
        if (!exists) {
          updated = [...prev, { ...product, quantity: 1, isFree: false }];
        } else {
          updated = prev.map((prod) =>
            prod.name === product.name &&
            prod.price === product.price &&
            prod.size === product.size
              ? { ...prod, quantity: prod.quantity + 1 }
              : prod
          );
        }

        // NEW: Apply BOGO logic for non-variety products
        if (bogoEnabled) {
          // Check if product is eligible
          if (BOGO_ELIGIBLE_PRODUCTS[product.name]) {
            // Check if free item already exists
            const freeExists = updated.some(
              (p) =>
                p.name === product.name && p.size === product.size && p.isFree
            );

            // Add free item if it doesn't exist
            if (!freeExists) {
              updated.push({
                ...product,
                price: 0,
                originalPrice: product.price,
                isFree: true,
                quantity: 1,
              });
            }
          }
        }

        localStorage.setItem("productsToSend", JSON.stringify(updated));
        return updated;
      });
      return;
    }

    // Handle products with varieties
    const newProducts = selectedVarieties.map((variety) => ({
      ...product,
      ...variety,
      quantity: variety.quantity || 1,
      isFree: false,
    }));

    setProductsToSend((prev) => {
      let updated = [...prev];
      newProducts.forEach((newProd) => {
        const exists = updated.some(
          (p) =>
            p.name === newProd.name &&
            p.price === newProd.price &&
            p.size === newProd.size
        );
        if (!exists) updated.push(newProd);
        else
          updated = updated.map((p) =>
            p.name === newProd.name &&
            p.price === newProd.price &&
            p.size === newProd.size
              ? { ...p, quantity: newProd.quantity }
              : p
          );
      });
      // NEW: Apply BOGO logic for variety products
      if (bogoEnabled) {
        newProducts.forEach((prod) => {
          if (BOGO_ELIGIBLE_PRODUCTS[prod.name]) {
            const eligibleSizes = BOGO_ELIGIBLE_PRODUCTS[prod.name];
            const size = prod.size?.toLowerCase();

            // Check if this specific size is eligible
            if (size && eligibleSizes.includes(size)) {
              // Check if free item already exists
              const freeItemExists = updated.some(
                (p) => p.name === prod.name && p.size === prod.size && p.isFree
              );

              // Add free item if it doesn't exist
              if (!freeItemExists) {
                updated.push({
                  ...prod,
                  price: 0,
                  originalPrice: prod.price,
                  isFree: true,
                  quantity: prod.quantity,
                });
              }
            }
          }
        });
      }

      localStorage.setItem("productsToSend", JSON.stringify(updated));
      return updated;
    });

    setShowPopup(false);
    setSelectedVariety([]);
  };
  // Function to handle quantity changes
  const handleQuantityChange = (productName, productPrice, delta) => {
    const updatedProductsToSend = productsToSend
      .map((prod) => {
        if (prod.name === productName && prod.price === productPrice) {
          const newQuantity = prod.quantity + delta;
          if (newQuantity < 1) {
            return null; // Remove the product if quantity goes below 1
          }
          return { ...prod, quantity: newQuantity };
        }
        return prod;
      })
      .filter(Boolean); // Remove any null values

    setProductsToSend(updatedProductsToSend);
    localStorage.setItem(
      "productsToSend",
      JSON.stringify(updatedProductsToSend)
    );
  };

  // Function to remove a product from selected products and productsToSend
  const handleRemoveProduct = async (productName, productPrice) => {
    try {
      // Call the API function
      await removeProduct(productName, productPrice);

      // Remove product from the selectedProducts and productsToSend arrays
      const updatedSelectedProducts = selectedProducts.filter(
        (prod) => !(prod.name === productName && prod.price === productPrice)
      );
      const updatedProductsToSend = productsToSend.filter(
        (prod) => !(prod.name === productName && prod.price === productPrice)
      );

      // Update the state
      setSelectedProducts(updatedSelectedProducts);
      setProductsToSend(updatedProductsToSend);

      // Update localStorage
      localStorage.setItem("products", JSON.stringify(updatedSelectedProducts));
      localStorage.setItem(
        "productsToSend",
        JSON.stringify(updatedProductsToSend)
      );

      console.log("Product removed successfully from both MongoDB and state");
    } catch (error) {
      console.error("Error removing product:", error.message);
    }
  };

  // Helper function to calculate total price
  const calculateTotalPrice = (products = []) => {
    return products.reduce(
      (total, product) => total + product.price * product.quantity,
      0
    );
  };

  const handleCategoryClick = (category) => {
    const categoryElement = document.getElementById(category);
    if (categoryElement) {
      // Calculate the offset position (7rem margin)
      const offset = 7 * 16; // Convert rem to pixels (assuming 1rem = 16px)
      const elementPosition = categoryElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      // Smooth scroll to the position with the offset
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
    setIsCategoryVisible((prev) => !prev);

    setActiveCategory(category);
  };

  const toggleCategoryVisibility = () => {
    setIsCategoryVisible((prev) => !prev); // Toggle visibility
  };

  const getCurrentBills = () => {
    if (modalType === "delivery") return deliveryBills;
    if (modalType === "dine-in") return dineInBills;
    if (modalType === "takeaway") return takeawayBills;
    return [];
  };

  // New: KOT (Kitchen Order Ticket) print handler
  const handleKot = () => {
    // Append current order snapshot
    const kotEntry = {
      timestamp: Date.now(),
      date: new Date().toLocaleString(),
      items: productsToSend,
      orderType,
    };

    if (orderType === "delivery") {
      const next = [...deliveryBills, kotEntry];
      setDeliveryBills(next);
      localStorage.setItem("deliveryKotData", JSON.stringify(next));
    } else if (orderType === "dine-in") {
      const next = [...dineInBills, kotEntry];
      setDineInBills(next);
      localStorage.setItem("dineInKotData", JSON.stringify(next));
    } else if (orderType === "takeaway") {
      const next = [...takeawayBills, kotEntry];
      setTakeawayBills(next);
      localStorage.setItem("takeawayKotData", JSON.stringify(next));
    }

    // Clear current productsToSend
    setProductsToSend([]);
    localStorage.setItem("productsToSend", JSON.stringify([]));

    const printArea = document.getElementById("sample-section");
    if (!printArea) {
      console.warn("No sample-section found to print.");
      return;
    }

    const header = `
  <div style="text-align:center; font-weight:700; margin-bottom:8px;">
    ${orderType === "delivery" ? "Delivery" : "Dine-In"}
  </div>
`;

    const printContent = header + printArea.innerHTML;
    const win = window.open("", "", "width=600,height=400");
    const style = `<style>
  @page { size: 76.2mm 400mm; margin:0; }
  @media print {
    body{ width: 76.2mm !important; margin:0; padding:4mm; font-size:1rem; }
    .product-item{ display:flex; justify-content:space-between; margin-bottom:1rem;}
    .hr{ border:none; border-bottom:1px solid #000; margin:2px 0;}
    .invoice-btn{ display:none; }
      .icon{
        display: none !important;
  }
        .icon span {
        display: block;
        }
     .header-row,
    .total-row { display: none !important; }
      /* the bottom total row */ 
    .product-item > div:first-child,
    .price-cell {
      display: none !important;
    }
</style>`;

    win.document.write(
      `<html>
      <head>
      <title>KOT Ticket</title>
     ${style}
        </head>
        <body>
        ${printContent}
        </body>
        </html>`
    );
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const handleCreateInvoice = (orderItems, type) => {
    // save the items and the order type
    localStorage.setItem("productsToSend", JSON.stringify(orderItems));
    localStorage.setItem("orderType", type);
    // also pass via react-router state (optional, but nice)
    navigate("/customer-detail", { state: { orderType: type } });
    setShowKotModal(false);
  };

  const deleteKot = (idx) => {
    if (modalType === "delivery") {
      const updated = deliveryBills.filter((_, i) => i !== idx);
      setDeliveryBills(updated);
      localStorage.setItem("deliveryKotData", JSON.stringify(updated));
    } else if (modalType === "dine-in") {
      const updated = dineInBills.filter((_, i) => i !== idx);
      setDineInBills(updated);
      localStorage.setItem("dineInKotData", JSON.stringify(updated));
    } else if (modalType === "takeaway") {
      const updated = takeawayBills.filter((_, i) => i !== idx);
      setTakeawayBills(updated);
      localStorage.setItem("TakeAwayKotData", JSON.stringify(updated));
    }
  };

  const editKot = (order, idx) => {
    // Remove from the correct list
    if (modalType === "delivery") {
      const updated = deliveryBills.filter((_, i) => i !== idx);
      setDeliveryBills(updated);
      localStorage.setItem("deliveryKotData", JSON.stringify(updated));
    } else if (modalType === "dine-in") {
      const updated = dineInBills.filter((_, i) => i !== idx);
      setDineInBills(updated);
      localStorage.setItem("dineInKotData", JSON.stringify(updated));
    } else if (modalType === "takeaway") {
      const updated = takeawayBills.filter((_, i) => i !== idx);
      setTakeawayBills(updated);
      localStorage.setItem("TakeAwayKotData", JSON.stringify(updated));
    }

    // Load into current products
    setProductsToSend(order);
    localStorage.setItem("productsToSend", JSON.stringify(order));
    setShowKotModal(false);
  };

  return (
    <div>
      <ToastContainer />
      <Header
        headerName="Urban Pizzeria"
        setSearch={setSearch}
        onClick={toggleCategoryVisibility}
      />
      <div className="invoice-container">
        {isCategoryVisible && (
          <div className="category-barr">
            <div className="category-b">
              <div className="category-bar">
                {Object.keys(filteredProducts)
                  .sort((a, b) => a.localeCompare(b))
                  .map((category, index) => (
                    <button
                      key={index}
                      className={`category-btn 
                      ${activeCategory === category ? "active" : ""}
                    `}
                      onClick={() => handleCategoryClick(category)} // Trigger scroll to category
                    >
                      {category}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
        <div className="main-section">
          <div className="main">
            {loading ? (
              // Display loading effect when fetching data
              <div className="lds-ripple">
                <div></div>
                <div></div>
              </div>
            ) : Object.keys(filteredProducts).length > 0 ? (
              Object.keys(filteredProducts)
                .sort((a, b) => a.localeCompare(b)) // Sort category names alphabetically
                .map((category, index) => (
                  <>
                                  <div key={category} className="category-block">

                    <h2 className="category" id={category}>
                      {category}
                    </h2>

                    <div key={index} className="category-container">
                      {filteredProducts[category]
                        .sort((a, b) => a.price - b.price) // Sort products by price in ascending order
                        .map((product, idx) => {
                          const isSelected = productsToSend.some(
                            (p) =>
                              p.name === product.name &&
                              (!product.varieties?.length ||
                                product.varieties.some(
                                  (v) =>
                                    v.price === p.price && v.size === p.size
                                ))
                          );

                          return (
                            <>
                                <div
                                  key={idx}
                                  className={`main-box ${
                                  isSelected ? "highlighted" : ""
                                }`}
                                  onClick={() => handleProductClick(product)}
                                >
                                  <div
                                    className="sub-box"
                                    style={{ position: "relative" }}
                                  >
                                    <h4 className="p-name">
                                      {product.name}
                                      {product.varieties &&
                                      Array.isArray(product.varieties) &&
                                      product.varieties[0]?.size
                                        ? ` (${product.varieties[0].size})`
                                        : ""}
                                    </h4>
                                    <p className="p-name-price">
                                      Rs.{" "}
                                      {product.price
                                        ? product.price // Use product price if it exists
                                        : product.varieties.length > 0
                                        ? product.varieties[0].price // Fallback to first variety price
                                        : "N/A"}{" "}
                                      {/* Handle case when neither price nor varieties are available */}
                                    </p>
                                  </div>
                                  {productsToSend
                                    .filter(
                                      (prod) => prod.name === product.name
                                    )
                                    .map((prod, i) => (
                                      <span key={i} className="quantity-badge">
                                        <span>
                                          <FaShoppingCart
                                            style={{ marginRight: "4px" }}
                                          />
                                          {prod.quantity}
                                        </span>
                                      </span>
                                    ))}
                                </div>
                            </>
                          );
                        })}
                    </div>
                    </div>
                  </>
                ))
            ) : (
              <div className="no-data">No data available</div>
            )}
          </div>
        </div>

        {/* BOGO Toggle */}
        <div
          className="bogo-toggle"
          style={{ padding: "1rem", textAlign: "center" }}
        >
          {isThursday ? (
            <label style={{ fontSize: "1.2rem", marginTop: "5rem" }}>
              <input
                type="checkbox"
                checked={bogoEnabled}
                onChange={() => {
                  if (isThursday) {
                    setBogoEnabled(!bogoEnabled);
                  } else {
                    toast.error(
                      "BOGO offer is only available on Thursdays",
                      toastOptions
                    );
                  }
                }}
                disabled={!isThursday}
                style={{ marginRight: "0.5rem" }}
              />
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#4CAF50",
                  marginTop: "5px",
                }}
              >
                Buy 1 Get 1 Free free pizza
              </div>
            </label>
          ) : (
            <div
              style={{ fontSize: "0.9rem", color: "#ff6b6b", marginTop: "5px" }}
            ></div>
          )}
        </div>

        {productsToSend.length > 0 ? (
          <div className="sample-section">
            <div className="check-container">
              <>
                <ul className="product-list" id="sample-section">
                  <hr className="hr" />
                  <li
                    className="product-item  header-row"
                    style={{ display: "flex"}}
                  >
                    <div
                     className="price-cell"
                      style={{
                        width: "15%",
                        textAlign: "right",
                      }}
                    >
                      <span>No.</span>
                    </div>
                    <div
                      style={{
                        width: "50%",
                        textAlign: "center",
                      }}
                    >
                      <span>Name</span>
                    </div>
                    <div
                      style={{
                        width: "25%",
                        textAlign: "center",
                      }}
                    >
                      <span>Qty</span>
                    </div>
                    <div
                      style={{
                        width: "15%",
                        textAlign: "right",
                        paddingRight: "10px",
                      }}
                    >
                      <span>Price</span>
                    </div>
                  </li>
                  {/* <div style={{ textAlign: "center" }}>{dash}</div> */}
                  <hr className="hr" />
                  {productsToSend.map((product, index) => (
                    <li
                      key={index}
                      className="product-item"
                      style={{ display: "flex" }}
                    >
                      <div
                        style={{
                          width: "10%",
                        }}
                      >
                        <span>{index + 1}.</span>
                      </div>
                      <div style={{ width: "50%" }}>
                        <span>
                          {product.name}
                          {product.size ? ` (${product.size})` : ""}
                          {/* Add FREE label here if it's a free item */}
                          {product.isFree && (
                            <span className="free-label"> (FREE)</span>
                          )}
                        </span>
                      </div>
                      <div
                        style={{
                          width: "20%",
                          textAlign: "center",
                        }}
                      >
                        <div className="quantity-btn">
                          <button
                            className="icon"
                            onClick={() =>
                              handleQuantityChange(
                                product.name,
                                product.price,
                                -1
                              )
                            }
                            // disabled={product.quantity <= 1}
                          >
                            <FaMinusCircle />
                          </button>
                          <span>
                            {product.quantity}
                          </span>
                          <button
                            className="icon"
                            onClick={() =>
                              handleQuantityChange(
                                product.name,
                                product.price,
                                1
                              )
                            }
                          >
                            <FaPlusCircle />
                          </button>
                        </div>
                      </div>{" "}
                      <div className="price-cell"
                        style={{
                          width: "15%",
                          textAlign: "right",
                        }}
                      >
                        <div>
                          {product.isFreeBogo ? (
                            <span className="free-label">FREE</span>
                          ) : (
                            `${product.price * product.quantity}`
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                  {/* <div style={{ textAlign: "center" }}>{dash}</div> */}
                  <hr className="hr" />
                  <li className="product-item total-row" style={{ display: "flex" }}>
                    <div
                      style={{
                        width: "77%",
                        textAlign: "center",
                        fontWeight: 800,
                      }}
                    >
                      <span>Total</span>
                    </div>
                    <div
                      style={{
                        width: "15%",
                        textAlign: "right",
                        fontWeight: 900,
                      }}
                    >
                      <span>
                        {calculateTotalPrice(productsToSend)}
                      </span>
                    </div>
                    <div
                      style={{
                        width: "5%",
                        textAlign: "left",
                        fontWeight: 900,
                      }}
                    >
                      <span>/-</span>
                    </div>
                  </li>
                  {/* <div style={{ textAlign: "center" }}>{dash}</div> */}
                  <hr className="hr" />
                </ul>
                <div className="order-type">
                  {["delivery", "dine-in", "takeaway"].map((type) => (
                    <label key={type} className="order-option">
                      <input
                        type="radio"
                        name="orderType"
                        value={type}
                        checked={orderType === type}
                        onChange={() => setOrderType(type)}
                      />
                      <span className="option-content">
                        <em>
                          {type === "delivery"
                            ? "Delivery"
                            : type === "dine-in"
                            ? "Dine‑In"
                            : "Takeaway"}
                        </em>
                      </span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={handleKot}
                  className="kot-btn"
                  style={{ borderRadius: "0" }}
                >
                  <h2> Print Kot </h2>
                </button>
              </>
            </div>
          </div>
        ) : (
          <p className="no-products">No products found </p>
        )}
      </div>
      <div className="invoice-btn">
        <button onClick={guardAddProduct} className="invoice-kot-btn">
          <h2> + PRODUCT </h2>
        </button>
        <button
          onClick={() => openBillsModal("delivery")}
          className="invoice-next-btn"
        >
          <h2>Delivery Bills ({deliveryBills.length})</h2>
        </button>
        <button
          onClick={() => openBillsModal("dine-in")}
          className="invoice-next-btn"
        >
          <h2>Dine-In Bills ({dineInBills.length})</h2>
        </button>
        <button
          onClick={() => openBillsModal("takeaway")}
          className="invoice-next-btn"
        >
          <h2>Takeaway Bills ({takeawayBills.length})</h2>
        </button>
      </div>
      {showKotModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>
              {modalType === "delivery"
                ? "Delivery"
                : modalType === "dine-in"
                ? "Dine-In"
                : "Takeaway"}{" "}
              Bills
            </h3>
            {getCurrentBills().length === 0 && <p>No bills found.</p>}

            <button
              className="close-btn"
              onClick={() => setShowKotModal(false)}
            >
              <IoClose />
            </button>
            <div className="kot-list">
              {getCurrentBills().length === 0 && <p>No bills found.</p>}
              {(modalType === "delivery"
                ? deliveryBills
                : modalType === "dine-in"
                ? dineInBills
                : takeawayBills
              ).map((order, idx) => {
                const remaining = EXPIRY_MS - (now - order.timestamp);
                return (
                  <div key={idx} className="kot-entry">
                    <h4 className="kot-timer">
                      Bill Expire in <span>{formatRemaining(remaining)}</span>
                    </h4>
                    <h4>
                      KOT #{idx + 1}
                      <span className="kot-date">{order.date}</span>
                    </h4>
                    <ul>
                      {order.items.map((item, i) => (
                        <>
                          <li key={i} className="kot-product-item">
                            <span>
                              {item.name} x {item.quantity}
                            </span>
                            <span>
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </span>
                          </li>
                        </>
                      ))}
                    </ul>
                    <div className="kot-entry-actions">
                      <FaTrash
                        className="del-action-icon action-icon"
                        size={20}
                        onClick={() => deleteKot(idx)}
                      />
                      <FaEdit
                        className="edit-action-icon action-icon"
                        size={20}
                        onClick={() => editKot(order.items, idx)}
                      />
                      <FaFileInvoice
                        className="invoice-action-icon action-icon"
                        size={20}
                        onClick={() =>
                          handleCreateInvoice(order.items, modalType)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {showPopup && currentProduct && currentProduct.varieties?.length > 0 && (
        <div className="popup-overlay">
          <div className="popup-contentt">
            <FaTimesCircle
              className="close-icon"
              onClick={() => setShowPopup(false)}
            />
            <h3>Select Size for {currentProduct.name}</h3>
            {currentProduct.varieties.map((variety, index) => (
              <div key={index} className="variety-option">
                <label className="variety-label">
                  <input
                    type="checkbox"
                    name="variety"
                    value={index}
                    checked={selectedVariety.some(
                      (v) =>
                        v.size === variety.size &&
                        v.price === variety.price &&
                        v.productId === currentProduct.id
                    )}
                    onChange={(e) =>
                      handleVarietyChange(
                        variety,
                        e.target.checked,
                        currentProduct.id
                      )
                    }
                  />
                  <span>
                    {variety.size.charAt(0).toUpperCase()} ~ ₹ {variety.price}
                  </span>
                </label>

                {selectedVariety.some(
                  (v) => v.size === variety.size && v.price === variety.price
                ) && (
                  <div className="quantity-buttons">
                    <button
                      onClick={() =>
                        handleVarietyQuantityChange(
                          variety,
                          -1,
                          currentProduct.id
                        )
                      }
                      disabled={variety.quantity <= 1}
                    >
                      <FaMinusCircle />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={
                        selectedVariety.find(
                          (v) =>
                            v.size === variety.size && v.price === variety.price
                        )?.quantity || 1
                      }
                      onChange={(e) => {
                        const quantity = parseInt(e.target.value, 10);
                        handleVarietyQuantityChange(
                          variety,
                          quantity - variety.quantity
                        );
                      }}
                    />
                    <button
                      onClick={() =>
                        handleVarietyQuantityChange(
                          variety,
                          1,
                          currentProduct.id
                        )
                      }
                    >
                      <FaPlusCircle />
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={() =>
                handleAddToWhatsApp(currentProduct, selectedVariety)
              }
              disabled={selectedVariety?.length === 0}
              className="save-btn"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoice;
