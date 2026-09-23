import { useContext, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { MyContext } from "../../App";
import {
  createCategory,
  createProduct,
  createSubcategory,
  deleteCategory,
  deleteProduct,
  deleteSubcategory,
  deleteUploadedProductImage,
  getAdminCustomerOrders,
  getAdminCustomers,
  getAdminDashboard,
  getAdminOrders,
  getCategories,
  getProductImageUploadSignature,
  getProducts,
  updateAdminOrderStatus,
  updateAdminOrder,
  updateAdminCustomerStatus,
  updateCategory,
  updateProduct,
  updateSubcategory,
} from "../../api/api";
import "./style.css";
import AdminOperations from "./AdminOperations";

const EMPTY_PRODUCT = {
  name: "",
  brand: "",
  vendor: "Aura Mosaic",
  description: "",
  additionalInfo: "",
  price: "",
  oldPrice: "",
  countInStock: "",
  category: "",
  subcategoryId: "",
  imagesText: "",
  isFeatured: false,
};

const EMPTY_CATEGORY = {
  name: "",
  color: "default",
  icon: "",
  image: "",
};

function messageFrom(error, fallback = "Something went wrong.") {
  return error?.response?.data?.message || error?.message || fallback;
}

function imageUrlsFromText(value) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((url) => url.trim())
    .filter(Boolean);
}

async function uploadImageToCloudinary(file, signed) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signed.apiKey);
  formData.append("timestamp", String(signed.timestamp));
  formData.append("folder", signed.folder);
  formData.append("signature", signed.signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`,
    { method: "POST", body: formData }
  );
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.secure_url) {
    throw new Error(data?.error?.message || "Cloudinary could not upload this image.");
  }

  return data.secure_url;
}


const ORDER_STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  placed: "Placed",
  paid: "Paid",
};

const ORDER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  placed: ["confirmed", "processing", "shipped", "delivered", "cancelled"],
  paid: ["processing", "shipped", "delivered"],
};

const CHART_COLORS = ["#169b62", "#8ac926", "#f4b942", "#e76f51", "#6c63ff", "#3f8efc"];

function money(value) {
  return `Tk. ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function shortDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function DonutChart({ title, data, centerLabel, centerValue }) {
  const rows = (Array.isArray(data) ? data : []).filter((item) => Number(item.value) > 0);
  const total = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);
  let cursor = 0;
  const segments = rows.map((item, index) => {
    const start = cursor;
    const portion = total ? (Number(item.value || 0) / total) * 100 : 0;
    cursor += portion;
    return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${cursor}%`;
  });
  const background = total ? `conic-gradient(${segments.join(", ")})` : "#e8f0eb";

  return (
    <article className="admin-chart-card">
      <div className="admin-chart-title"><h3>{title}</h3></div>
      <div className="admin-donut-wrap">
        <div className="admin-donut" style={{ background }} aria-label={`${title}: ${total} total`}>
          <div className="admin-donut-hole">
            <strong>{centerValue ?? total}</strong>
            <span>{centerLabel || "Total"}</span>
          </div>
        </div>
        <div className="admin-chart-legend">
          {rows.length ? rows.map((item, index) => (
            <div className="admin-legend-row" key={`${item.label}-${index}`}>
              <span className="admin-legend-dot" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
              <span className="admin-legend-label">{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          )) : <p className="admin-muted">No data yet.</p>}
        </div>
      </div>
    </article>
  );
}

function MetricRing({ label, value, helper, moneyValue = false, onClick }) {
  const content = (
    <>
      <div className="admin-metric-ring"><div><strong>{moneyValue ? "৳" : value}</strong></div></div>
      <div className="admin-metric-copy">
        <span>{label}</span>
        <strong>{moneyValue ? money(value) : value}</strong>
        {helper && <small>{helper}</small>}
      </div>
      {onClick && <span className="admin-metric-arrow" aria-hidden="true">→</span>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="admin-metric-card admin-metric-button" onClick={onClick} aria-label={`${label}: ${moneyValue ? money(value) : value}`}>
        {content}
      </button>
    );
  }

  return <article className="admin-metric-card">{content}</article>;
}

function AdminDashboard() {
  const { user } = useContext(MyContext);
  const [tab, setTab] = useState("overview");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [pendingUploadedImages, setPendingUploadedImages] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [productStockFilter, setProductStockFilter] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboard, setDashboard] = useState({
    totals: { totalProducts: 0, totalCustomers: 0, totalOrders: 0, pendingOrders: 0, revenue: 0, lowStockProducts: 0 },
    orderStatus: [],
    inventory: [],
    bestSellingProducts: [],
    recentOrders: [],
  });
  const [orders, setOrders] = useState([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("");
  const [orderDateFilter, setOrderDateFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerOrdersLoading, setCustomerOrdersLoading] = useState(false);

  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [editingProductId, setEditingProductId] = useState("");
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY);
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [subcategoryDrafts, setSubcategoryDrafts] = useState({});

  const loadCatalogue = async () => {
    setLoading(true);
    try {
      const [productRes, categoryRes] = await Promise.all([
        getProducts({ limit: 500 }),
        getCategories(),
      ]);
      setProducts(Array.isArray(productRes.data) ? productRes.data : []);
      setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);
    } catch (error) {
      Swal.fire("Could not load catalogue", messageFrom(error), "error");
    } finally {
      setLoading(false);
    }
  };

  const loadOperations = async () => {
    setDashboardLoading(true);
    try {
      const [dashboardRes, ordersRes, customersRes] = await Promise.all([
        getAdminDashboard(),
        getAdminOrders(),
        getAdminCustomers(),
      ]);
      setDashboard(dashboardRes.data || {});
      const nextOrders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
      const nextCustomers = Array.isArray(customersRes.data) ? customersRes.data : [];
      setOrders(nextOrders);
      setCustomers(nextCustomers);
      setSelectedOrder((current) => {
        if (!current?._id) return current;
        return nextOrders.find((order) => String(order._id) === String(current._id)) || null;
      });
      setSelectedCustomer((current) => {
        if (!current?._id) return current;
        return nextCustomers.find((customer) => String(customer._id) === String(current._id)) || null;
      });
    } catch (error) {
      Swal.fire("Could not load admin analytics", messageFrom(error), "error");
    } finally {
      setDashboardLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadCatalogue(), loadOperations()]);
  };

  useEffect(() => {
    loadCatalogue();
    loadOperations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((category) => String(category._id) === String(productForm.category)),
    [categories, productForm.category]
  );

  const lowStockThreshold = Number(dashboard.lowStockThreshold ?? 5);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((product) => {
      const stock = Number(product.countInStock || 0);
      if (productStockFilter === "low" && stock > lowStockThreshold) return false;
      if (productStockFilter === "out" && stock !== 0) return false;
      if (productStockFilter === "healthy" && stock <= lowStockThreshold) return false;

      if (!q) return true;
      const categoryName = product?.category?.name || "";
      return [product.name, product.brand, product.vendor, categoryName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [products, productSearch, productStockFilter, lowStockThreshold]);

  const stats = useMemo(() => {
    const lowStock = products.filter((product) => Number(product.countInStock || 0) <= lowStockThreshold).length;
    const featured = products.filter((product) => product.isFeatured).length;
    return {
      products: products.length,
      categories: categories.length,
      featured,
      lowStock,
    };
  }, [products, categories, lowStockThreshold]);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    const now = new Date();
    let cutoff = null;
    if (orderDateFilter === "today") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (["7d", "30d", "90d"].includes(orderDateFilter)) {
      const days = Number(orderDateFilter.replace("d", ""));
      cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    return orders.filter((order) => {
      const status = String(order.status || "").toLowerCase();
      const paymentStatus = String(order?.payment?.status || "").toUpperCase();
      if (orderStatusFilter && status !== orderStatusFilter) return false;
      if (orderPaymentFilter && paymentStatus !== orderPaymentFilter) return false;
      if (cutoff && new Date(order.createdAt) < cutoff) return false;
      if (!query) return true;
      const values = [
        order._id,
        order?.user?.name,
        order?.user?.email,
        order?.user?.phone,
        order?.city,
        status,
        paymentStatus,
        ...(order.items || []).map((item) => item.name),
      ];
      return values.filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
    });
  }, [orders, orderSearch, orderStatusFilter, orderPaymentFilter, orderDateFilter]);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => [
      customer.name,
      customer.email,
      customer.phone,
      customer.city,
      customer.provider,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
  }, [customers, customerSearch]);

  const orderStatusChart = useMemo(() => {
    const byStatus = new Map((dashboard.orderStatus || []).map((item) => [String(item.label).toLowerCase(), Number(item.value || 0)]));
    return ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
      .map((status) => ({ label: ORDER_STATUS_LABELS[status], value: byStatus.get(status) || 0 }));
  }, [dashboard.orderStatus]);

  const bestSellerChart = useMemo(() => (dashboard.bestSellingProducts || []).map((item) => ({
    label: item.name,
    value: Number(item.units || 0),
  })), [dashboard.bestSellingProducts]);

  const openProducts = (stockFilter = "") => {
    setProductSearch("");
    setProductStockFilter(stockFilter);
    setTab("products");
    window.setTimeout(() => {
      document.getElementById("admin-product-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const openOrders = ({ status = "", payment = "" } = {}) => {
    setOrderSearch("");
    setOrderStatusFilter(status);
    setOrderPaymentFilter(payment);
    setOrderDateFilter("all");
    setSelectedOrder(null);
    setTab("orders");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openCustomers = () => {
    setCustomerSearch("");
    setTab("customers");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setCustomerOrders([]);
    setCustomerOrdersLoading(true);
    try {
      const response = await getAdminCustomerOrders(customer._id);
      setSelectedCustomer((current) => (
        String(current?._id || "") === String(customer._id)
          ? { ...current, ...(response.data?.customer || {}) }
          : current
      ));
      setCustomerOrders(Array.isArray(response.data?.orders) ? response.data.orders : []);
    } catch (error) {
      Swal.fire("Could not load customer history", messageFrom(error), "error");
    } finally {
      setCustomerOrdersLoading(false);
    }
  };

  const viewCustomerOrders = (customer) => {
    setOrderSearch(customer?.email || customer?.name || "");
    setOrderStatusFilter("");
    setOrderPaymentFilter("");
    setOrderDateFilter("all");
    setSelectedOrder(null);
    setTab("orders");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const editOrderMeta = async (order) => {
    const tracking = await Swal.fire({
      title: "Tracking number",
      input: "text",
      inputValue: order.trackingNumber || "",
      inputPlaceholder: "Courier tracking number (optional)",
      showCancelButton: true,
    });
    if (!tracking.isConfirmed) return;
    const note = await Swal.fire({
      title: "Internal order note",
      input: "textarea",
      inputValue: order.adminNote || "",
      inputPlaceholder: "Visible to administrators only",
      showCancelButton: true,
    });
    if (!note.isConfirmed) return;
    try {
      const response = await updateAdminOrder(order._id, {
        trackingNumber: tracking.value || "",
        adminNote: note.value || "",
      });
      const updated = response.data;
      setOrders((rows) => rows.map((row) => String(row._id) === String(order._id) ? { ...row, ...updated } : row));
      setSelectedOrder((current) => String(current?._id || "") === String(order._id) ? { ...current, ...updated } : current);
      Swal.fire({ icon: "success", title: "Order details saved", timer: 1000, showConfirmButton: false });
    } catch (error) {
      Swal.fire("Could not save order details", messageFrom(error), "error");
    }
  };

  const updateOrderStatus = async (order, nextStatus) => {
    if (!nextStatus || nextStatus === order.status) return;
    const result = await Swal.fire({
      title: `Mark order ${ORDER_STATUS_LABELS[nextStatus] || nextStatus}?`,
      text: nextStatus === "cancelled" ? "Cancelling will restore reserved product stock." : "This updates the customer order lifecycle.",
      icon: nextStatus === "cancelled" ? "warning" : "question",
      showCancelButton: true,
      confirmButtonText: "Update order",
    });
    if (!result.isConfirmed) return;

    setUpdatingOrderId(String(order._id));
    try {
      await updateAdminOrderStatus(order._id, nextStatus);
      await refreshAll();
      Swal.fire({ icon: "success", title: "Order updated", timer: 1100, showConfirmButton: false });
    } catch (error) {
      Swal.fire("Could not update order", messageFrom(error), "error");
    } finally {
      setUpdatingOrderId("");
    }
  };

  const toggleCustomerStatus = async (customer) => {
    const nextActive = customer.isActive === false;
    const result = await Swal.fire({
      title: nextActive ? "Enable this customer?" : "Disable this customer?",
      text: nextActive ? "They will be able to sign in again." : "They will be signed out on their next authenticated request and cannot sign in until re-enabled.",
      icon: nextActive ? "question" : "warning",
      showCancelButton: true,
      confirmButtonText: nextActive ? "Enable account" : "Disable account",
    });
    if (!result.isConfirmed) return;
    try {
      await updateAdminCustomerStatus(customer._id, nextActive);
      await loadOperations();
      setSelectedCustomer((current) => String(current?._id || "") === String(customer._id) ? { ...current, isActive: nextActive } : current);
      Swal.fire({ icon: "success", title: nextActive ? "Customer enabled" : "Customer disabled", timer: 1000, showConfirmButton: false });
    } catch (error) {
      Swal.fire("Could not update customer", messageFrom(error), "error");
    }
  };

  const updateProductField = (field, value) => {
    setProductForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "category") next.subcategoryId = "";
      return next;
    });
  };

  const resetProductForm = () => {
    setEditingProductId("");
    setProductForm(EMPTY_PRODUCT);
    setPendingUploadedImages([]);
  };

  const discardPendingUploads = async () => {
    const pending = [...pendingUploadedImages];
    resetProductForm();
    if (!pending.length) return;
    await Promise.allSettled(pending.map((url) => deleteUploadedProductImage(url)));
  };

  const beginEditProduct = (product) => {
    if (pendingUploadedImages.length) {
      Promise.allSettled(pendingUploadedImages.map((url) => deleteUploadedProductImage(url)));
    }
    setPendingUploadedImages([]);
    const categoryId = product?.category?._id || product?.category || "";
    setEditingProductId(String(product._id));
    setProductForm({
      name: product.name || "",
      brand: product.brand || "",
      vendor: product.vendor || "Aura Mosaic",
      description: product.description || "",
      additionalInfo: product.additionalInfo || "",
      price: product.price ?? "",
      oldPrice: product.oldPrice ?? "",
      countInStock: product.countInStock ?? "",
      category: String(categoryId || ""),
      subcategoryId: product.subcategory ? String(product.subcategory) : "",
      imagesText: Array.isArray(product.images) ? product.images.join("\n") : "",
      isFeatured: Boolean(product.isFeatured),
    });
    setTab("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProductImageUpload = async (event) => {
    const input = event.target;
    const selected = Array.from(input.files || []);
    input.value = "";
    if (!selected.length) return;

    const existing = imageUrlsFromText(productForm.imagesText);
    const remaining = Math.max(0, 6 - existing.length);
    if (!remaining) {
      return Swal.fire("Image limit reached", "A product can have up to 6 images.", "warning");
    }

    const files = selected.slice(0, remaining);
    if (selected.length > remaining) {
      Swal.fire("Only some images will upload", `You can add ${remaining} more image${remaining === 1 ? "" : "s"}.`, "info");
    }

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
    const invalidType = files.find((file) => !allowedTypes.has(file.type));
    if (invalidType) {
      return Swal.fire("Unsupported image", `${invalidType.name} is not a supported image type.`, "warning");
    }

    const oversized = files.find((file) => file.size > 8 * 1024 * 1024);
    if (oversized) {
      return Swal.fire("Image too large", `${oversized.name} is larger than 8 MB.`, "warning");
    }

    setUploadingImages(true);
    try {
      const signatureRes = await getProductImageUploadSignature();
      const signed = signatureRes.data;
      const uploaded = [];
      for (const file of files) {
        uploaded.push(await uploadImageToCloudinary(file, signed));
      }

      const nextUrls = [...existing, ...uploaded];
      updateProductField("imagesText", nextUrls.join("\n"));
      setPendingUploadedImages((current) => [...current, ...uploaded]);

      Swal.fire({
        icon: "success",
        title: `${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded`,
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire("Image upload failed", messageFrom(error), "error");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeProductImage = async (url) => {
    const remaining = imageUrlsFromText(productForm.imagesText).filter((value) => value !== url);
    updateProductField("imagesText", remaining.join("\n"));

    if (pendingUploadedImages.includes(url)) {
      setPendingUploadedImages((current) => current.filter((value) => value !== url));
      try {
        await deleteUploadedProductImage(url);
      } catch (_error) {
        // If cleanup fails, the product form should still remain usable.
      }
    }
  };

  const submitProduct = async (event) => {
    event.preventDefault();

    const images = imageUrlsFromText(productForm.imagesText);

    const payload = {
      name: productForm.name.trim(),
      brand: productForm.brand.trim(),
      vendor: productForm.vendor.trim() || "Aura Mosaic",
      description: productForm.description.trim(),
      additionalInfo: productForm.additionalInfo.trim(),
      price: productForm.price,
      oldPrice: productForm.oldPrice,
      countInStock: productForm.countInStock,
      category: productForm.category,
      subcategoryId: productForm.subcategoryId,
      images,
      isFeatured: productForm.isFeatured,
    };

    if (!payload.category) {
      return Swal.fire("Category required", "Create/select a category before saving the product.", "warning");
    }
    if (!images.length) {
      return Swal.fire("Image required", "Upload or add at least one product image.", "warning");
    }

    setSavingProduct(true);
    try {
      if (editingProductId) {
        await updateProduct(editingProductId, payload);
        await Swal.fire("Updated", "Product updated successfully.", "success");
      } else {
        await createProduct(payload);
        await Swal.fire("Added", "Product added to the catalogue.", "success");
      }
      resetProductForm();
      await refreshAll();
    } catch (error) {
      Swal.fire("Could not save product", messageFrom(error), "error");
    } finally {
      setSavingProduct(false);
    }
  };

  const removeProduct = async (product) => {
    const result = await Swal.fire({
      title: "Delete product?",
      text: `${product.name} will be removed from the catalogue.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;

    try {
      await deleteProduct(product._id);
      if (editingProductId === String(product._id)) resetProductForm();
      await refreshAll();
      Swal.fire("Deleted", "Product removed.", "success");
    } catch (error) {
      Swal.fire("Could not delete product", messageFrom(error), "error");
    }
  };

  const resetCategoryForm = () => {
    setEditingCategoryId("");
    setCategoryForm(EMPTY_CATEGORY);
  };

  const beginEditCategory = (category) => {
    setEditingCategoryId(String(category._id));
    setCategoryForm({
      name: category.name || "",
      color: category.color || "default",
      icon: category.icon || "",
      image: Array.isArray(category.images) ? category.images[0] || "" : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitCategory = async (event) => {
    event.preventDefault();
    const payload = {
      name: categoryForm.name.trim(),
      color: categoryForm.color.trim() || "default",
      icon: categoryForm.icon.trim(),
      images: categoryForm.image.trim() ? [categoryForm.image.trim()] : [],
    };

    setSavingCategory(true);
    try {
      if (editingCategoryId) {
        await updateCategory(editingCategoryId, payload);
        await Swal.fire("Updated", "Category updated.", "success");
      } else {
        await createCategory(payload);
        await Swal.fire("Created", "Category created. You can now add products to it.", "success");
      }
      resetCategoryForm();
      await refreshAll();
    } catch (error) {
      Swal.fire("Could not save category", messageFrom(error), "error");
    } finally {
      setSavingCategory(false);
    }
  };

  const removeCategory = async (category) => {
    const result = await Swal.fire({
      title: "Delete category?",
      text: "A category containing products cannot be deleted until those products are moved or removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;

    try {
      await deleteCategory(category._id);
      if (editingCategoryId === String(category._id)) resetCategoryForm();
      await refreshAll();
      Swal.fire("Deleted", "Category deleted.", "success");
    } catch (error) {
      Swal.fire("Could not delete category", messageFrom(error), "error");
    }
  };

  const addSubcategory = async (categoryId) => {
    const name = String(subcategoryDrafts[categoryId] || "").trim();
    if (!name) return;
    try {
      await createSubcategory(categoryId, { name });
      setSubcategoryDrafts((current) => ({ ...current, [categoryId]: "" }));
      await refreshAll();
    } catch (error) {
      Swal.fire("Could not add subcategory", messageFrom(error), "error");
    }
  };

  const renameSubcategory = async (categoryId, subcategory) => {
    const result = await Swal.fire({
      title: "Rename subcategory",
      input: "text",
      inputValue: subcategory.name || "",
      showCancelButton: true,
      confirmButtonText: "Save",
      inputValidator: (value) => (!String(value || "").trim() ? "Enter a name." : undefined),
    });
    if (!result.isConfirmed) return;
    try {
      await updateSubcategory(categoryId, subcategory._id, { name: result.value.trim() });
      await refreshAll();
    } catch (error) {
      Swal.fire("Could not rename subcategory", messageFrom(error), "error");
    }
  };

  const removeSubcategory = async (categoryId, subcategory) => {
    const result = await Swal.fire({
      title: "Delete subcategory?",
      text: `${subcategory.name} will be removed. Products will remain in their main category.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteSubcategory(categoryId, subcategory._id);
      await refreshAll();
    } catch (error) {
      Swal.fire("Could not delete subcategory", messageFrom(error), "error");
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading catalogue dashboard…</div>;
  }

  return (
    <main className="admin-dashboard">
      <div className="admin-shell">
        <div className="admin-heading">
          <div>
            <span className="admin-eyebrow">ADMINISTRATION</span>
            <h1>Aura-Mosaic Admin Dashboard</h1>
            <p>
              Signed in as <strong>{user?.name}</strong>. Manage catalogue, inventory and customer orders from one place.
            </p>
          </div>
          <button className="admin-refresh-btn" type="button" onClick={refreshAll}>Refresh data</button>
        </div>

        <div className="admin-tabs admin-main-tabs">
          <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button>
          <button type="button" className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Orders</button>
          <button type="button" className={tab === "customers" ? "active" : ""} onClick={() => setTab("customers")}>Customers</button>
          <button type="button" className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Products</button>
          <button type="button" className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}>Categories</button>
          <button type="button" className={tab === "operations" ? "active" : ""} onClick={() => setTab("operations")}>Operations</button>
        </div>

        {tab === "overview" && (
          <>
            {dashboardLoading ? <div className="admin-inline-loading">Loading store analytics…</div> : (
              <>
                <section className="admin-metric-grid" aria-label="Store totals">
                  <MetricRing label="Total Products" value={dashboard.totals?.totalProducts || 0} helper={`${stats.categories} categories`} onClick={() => openProducts("")} />
                  <MetricRing label="Total Customers" value={dashboard.totals?.totalCustomers || 0} helper="Registered shoppers" onClick={openCustomers} />
                  <MetricRing label="Total Orders" value={dashboard.totals?.totalOrders || 0} helper="All-time orders" onClick={() => openOrders()} />
                  <MetricRing label="Pending Orders" value={dashboard.totals?.pendingOrders || 0} helper="Awaiting confirmation" onClick={() => openOrders({ status: "pending" })} />
                  <MetricRing label="Revenue" value={dashboard.totals?.revenue || 0} moneyValue helper="Paid orders only" onClick={() => openOrders({ payment: "PAID" })} />
                  <MetricRing label="Low Stock Products" value={dashboard.totals?.lowStockProducts || 0} helper={`${dashboard.lowStockThreshold ?? 5} units or fewer`} onClick={() => openProducts("low")} />
                </section>

                <section className="admin-chart-grid">
                  <DonutChart title="Order Status" data={orderStatusChart} centerLabel="Orders" centerValue={dashboard.totals?.totalOrders || 0} />
                  <DonutChart title="Inventory Health" data={dashboard.inventory || []} centerLabel="Products" centerValue={dashboard.totals?.totalProducts || 0} />
                  <DonutChart title="Best-Selling Products" data={bestSellerChart} centerLabel="Units sold" />
                </section>

                <section className="admin-panel">
                  <div className="admin-panel-title product-list-heading">
                    <div><h2>Recent Orders</h2><p>The newest customer orders across the store.</p></div>
                    <button className="admin-secondary-btn" type="button" onClick={() => openOrders()}>Manage all orders</button>
                  </div>
                  <div className="admin-order-table-wrap">
                    <table className="admin-order-table">
                      <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
                      <tbody>
                        {(dashboard.recentOrders || []).length ? (dashboard.recentOrders || []).map((order) => (
                          <tr key={order._id} onClick={() => { setSelectedOrder(order); setTab("orders"); }} className="admin-clickable-row">
                            <td><strong>#{String(order._id).slice(-8).toUpperCase()}</strong></td>
                            <td>{order?.user?.name || order?.user?.email || "Customer"}</td>
                            <td>{money(order.total)}</td>
                            <td>{order?.payment?.method || "COD"} · {order?.payment?.status || "PENDING"}</td>
                            <td><span className={`admin-order-status ${String(order.status || "pending").toLowerCase()}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span></td>
                            <td>{shortDate(order.createdAt)}</td>
                          </tr>
                        )) : <tr><td colSpan="6" className="admin-empty-cell">No orders yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="admin-panel">
                  <div className="admin-panel-title"><div><h2>Best sellers</h2><p>Ranked by units in confirmed, processing, shipped and delivered orders.</p></div></div>
                  <div className="admin-best-seller-list">
                    {(dashboard.bestSellingProducts || []).length ? dashboard.bestSellingProducts.map((item, index) => (
                      <div className="admin-best-seller-row" key={String(item.productId || index)}>
                        <span className="admin-rank">#{index + 1}</span>
                        {item.image ? <img src={item.image} alt="" /> : <div className="admin-best-image-placeholder" />}
                        <div className="admin-best-copy"><strong>{item.name}</strong><span>{item.units} units · {money(item.sales)}</span></div>
                      </div>
                    )) : <div className="admin-empty">Best-seller data will appear after orders are confirmed.</div>}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {tab === "orders" && (
          <>
            <section className="admin-panel">
              <div className="admin-panel-title product-list-heading">
                <div><h2>Order Management</h2><p>Review customer orders and move them through the fulfilment lifecycle.</p></div>
                <div className="admin-order-filters">
                  <input className="admin-search" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Search order, customer, product…" />
                  <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)}>
                    <option value="">All statuses</option>
                    {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <select value={orderPaymentFilter} onChange={(e) => setOrderPaymentFilter(e.target.value)}>
                    <option value="">All payments</option>
                    <option value="PENDING">Payment pending</option>
                    <option value="PAID">Paid</option>
                    <option value="FAILED">Failed</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                  <select value={orderDateFilter} onChange={(e) => setOrderDateFilter(e.target.value)}>
                    <option value="all">Any date</option>
                    <option value="today">Today</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                  </select>
                  {(orderSearch || orderStatusFilter || orderPaymentFilter || orderDateFilter !== "all") && (
                    <button type="button" className="admin-filter-clear" onClick={() => { setOrderSearch(""); setOrderStatusFilter(""); setOrderPaymentFilter(""); setOrderDateFilter("all"); }}>Clear</button>
                  )}
                </div>
              </div>

              <div className="admin-order-table-wrap">
                <table className="admin-order-table">
                  <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Placed</th><th>Action</th></tr></thead>
                  <tbody>
                    {filteredOrders.length ? filteredOrders.map((order) => {
                      const status = String(order.status || "pending").toLowerCase();
                      const nextOptions = ORDER_TRANSITIONS[status] || [];
                      return (
                        <tr key={order._id}>
                          <td><button type="button" className="admin-order-link" onClick={() => setSelectedOrder(order)}>#{String(order._id).slice(-8).toUpperCase()}</button></td>
                          <td><strong>{order?.user?.name || "Customer"}</strong><span className="admin-table-sub">{order?.user?.email || "—"}</span></td>
                          <td>{(order.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0)}</td>
                          <td>{money(order.total)}</td>
                          <td>{order?.payment?.method || "COD"}<span className="admin-table-sub">{order?.payment?.status || "PENDING"}</span></td>
                          <td><span className={`admin-order-status ${status}`}>{ORDER_STATUS_LABELS[status] || status}</span></td>
                          <td>{shortDate(order.createdAt)}</td>
                          <td>
                            {nextOptions.length ? (
                              <select
                                className="admin-status-select"
                                value=""
                                disabled={updatingOrderId === String(order._id)}
                                onChange={(e) => updateOrderStatus(order, e.target.value)}
                              >
                                <option value="">Update…</option>
                                {nextOptions.map((next) => <option key={next} value={next}>{ORDER_STATUS_LABELS[next] || next}</option>)}
                              </select>
                            ) : <span className="admin-table-sub">Final state</span>}
                          </td>
                        </tr>
                      );
                    }) : <tr><td colSpan="8" className="admin-empty-cell">No orders match your filters.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedOrder && (
              <section className="admin-panel admin-order-detail">
                <div className="admin-panel-title">
                  <div><h2>Order #{String(selectedOrder._id).slice(-8).toUpperCase()}</h2><p>{shortDate(selectedOrder.createdAt)}</p></div>
                  <div className="admin-detail-actions"><button type="button" className="admin-secondary-btn" onClick={() => editOrderMeta(selectedOrder)}>Tracking / note</button><button type="button" className="admin-secondary-btn" onClick={() => setSelectedOrder(null)}>Close details</button></div>
                </div>
                <div className="admin-order-detail-grid">
                  <div className="admin-order-info-card"><span>Customer</span><strong>{selectedOrder?.user?.name || "Customer"}</strong><p>{selectedOrder?.user?.email || "—"}</p><p>{selectedOrder?.user?.phone || "No phone saved"}</p></div>
                  <div className="admin-order-info-card"><span>Delivery</span><strong>{selectedOrder?.shippingAddress?.city || selectedOrder.city || selectedOrder?.user?.city || "—"}</strong><p>{selectedOrder?.shippingAddress?.addressLine1 || "Address not supplied"}</p><p>{selectedOrder?.shippingAddress?.phone || selectedOrder?.user?.phone || "No phone"}</p><p>Shipping: {money(selectedOrder.shipping)}</p></div>
                  <div className="admin-order-info-card"><span>Payment</span><strong>{selectedOrder?.payment?.method || "COD"}</strong><p>{selectedOrder?.payment?.status || "PENDING"}</p>{selectedOrder.trackingNumber && <p>Tracking: {selectedOrder.trackingNumber}</p>}{selectedOrder.adminNote && <p>Note: {selectedOrder.adminNote}</p>}</div>
                  <div className="admin-order-info-card"><span>Total</span><strong>{money(selectedOrder.total)}</strong><p>Subtotal: {money(selectedOrder.subtotal)}</p></div>
                </div>
                <div className="admin-order-items">
                  {(selectedOrder.items || []).map((item, index) => (
                    <div className="admin-order-item" key={`${item.productId}-${index}`}>
                      {item.image ? <img src={item.image} alt="" /> : <div className="admin-best-image-placeholder" />}
                      <div><strong>{item.name}</strong><span>{item.qty} × {money(item.price)}</span></div>
                      <strong>{money(Number(item.price || 0) * Number(item.qty || 0))}</strong>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {tab === "customers" && (
          <>
            <section className="admin-panel">
              <div className="admin-panel-title product-list-heading">
                <div>
                  <h2>Customer Management</h2>
                  <p>{customers.length} registered shopper{customers.length === 1 ? "" : "s"}. View profiles and order history without exposing account secrets.</p>
                </div>
                <input className="admin-search" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search name, email, phone, city…" />
              </div>

              <div className="admin-order-table-wrap">
                <table className="admin-order-table admin-customer-table">
                  <thead><tr><th>Customer</th><th>Contact</th><th>City</th><th>Orders</th><th>Paid spend</th><th>Last order</th><th>Joined</th><th>Action</th></tr></thead>
                  <tbody>
                    {filteredCustomers.length ? filteredCustomers.map((customer) => (
                      <tr key={customer._id}>
                        <td>
                          <div className="admin-customer-cell">
                            {customer.picture ? <img src={customer.picture} alt="" /> : <span className="admin-customer-avatar">{String(customer.name || customer.email || "C").slice(0, 1).toUpperCase()}</span>}
                            <div><strong>{customer.name || "Customer"}</strong><span className="admin-table-sub">{customer.provider === "google" ? "Google account" : "Email account"} · {customer.isActive === false ? "Disabled" : "Active"}</span></div>
                          </div>
                        </td>
                        <td>{customer.email}<span className="admin-table-sub">{customer.phone || "No phone saved"}</span></td>
                        <td>{customer.city || "—"}</td>
                        <td><strong>{Number(customer.orderCount || 0)}</strong></td>
                        <td>{money(customer.totalSpent)}</td>
                        <td>{customer.lastOrderAt ? shortDate(customer.lastOrderAt) : "No orders"}</td>
                        <td>{shortDate(customer.createdAt)}</td>
                        <td><button type="button" className="admin-order-link" onClick={() => openCustomer(customer)}>View</button> <button type="button" className={customer.isActive === false ? "admin-order-link" : "admin-danger-link"} onClick={() => toggleCustomerStatus(customer)}>{customer.isActive === false ? "Enable" : "Disable"}</button></td>
                      </tr>
                    )) : <tr><td colSpan="8" className="admin-empty-cell">{customers.length ? "No customers match your search." : "No customer accounts yet."}</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedCustomer && (
              <section className="admin-panel admin-customer-detail">
                <div className="admin-panel-title">
                  <div>
                    <h2>{selectedCustomer.name || "Customer"}</h2>
                    <p>{selectedCustomer.email}</p>
                  </div>
                  <div className="admin-detail-actions">
                    <button type="button" className="admin-secondary-btn" onClick={() => viewCustomerOrders(selectedCustomer)}>View in Orders</button>
                    <button type="button" className="admin-secondary-btn" onClick={() => { setSelectedCustomer(null); setCustomerOrders([]); }}>Close details</button>
                  </div>
                </div>

                <div className="admin-customer-summary-grid">
                  <div className="admin-order-info-card"><span>Contact</span><strong>{selectedCustomer.email || "—"}</strong><p>{selectedCustomer.phone || "No phone saved"}</p></div>
                  <div className="admin-order-info-card"><span>Delivery city</span><strong>{selectedCustomer.city || "Not set"}</strong><p>{selectedCustomer.isProfileComplete ? "Profile completed" : "Profile incomplete"}</p></div>
                  <div className="admin-order-info-card"><span>Account</span><strong>{selectedCustomer.provider === "google" ? "Google" : "Email & password"}</strong><p>{selectedCustomer.isActive === false ? "Disabled" : "Active"} · Joined {shortDate(selectedCustomer.createdAt)}</p></div>
                  <div className="admin-order-info-card"><span>Store activity</span><strong>{Number(selectedCustomer.orderCount || 0)} orders · {money(selectedCustomer.totalSpent)}</strong><p>{Number(selectedCustomer.wishlistCount || 0)} wishlist item{Number(selectedCustomer.wishlistCount || 0) === 1 ? "" : "s"}</p></div>
                </div>

                <div className="admin-panel-title admin-customer-history-title">
                  <div><h3>Order history</h3><p>All recent orders placed by this customer.</p></div>
                </div>

                {customerOrdersLoading ? (
                  <div className="admin-inline-loading">Loading customer orders…</div>
                ) : (
                  <div className="admin-order-table-wrap">
                    <table className="admin-order-table">
                      <thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
                      <tbody>
                        {customerOrders.length ? customerOrders.map((order) => (
                          <tr key={order._id} className="admin-clickable-row" onClick={() => {
                            const fullOrder = orders.find((item) => String(item._id) === String(order._id));
                            setSelectedOrder(fullOrder || { ...order, user: selectedCustomer });
                            setTab("orders");
                          }}>
                            <td><strong>#{String(order._id).slice(-8).toUpperCase()}</strong></td>
                            <td>{(order.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0)}</td>
                            <td>{money(order.total)}</td>
                            <td>{order?.payment?.method || "COD"}<span className="admin-table-sub">{order?.payment?.status || "PENDING"}</span></td>
                            <td><span className={`admin-order-status ${String(order.status || "pending").toLowerCase()}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span></td>
                            <td>{shortDate(order.createdAt)}</td>
                          </tr>
                        )) : <tr><td colSpan="6" className="admin-empty-cell">This customer has not placed an order yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {tab === "operations" && (
          <AdminOperations onChanged={refreshAll} />
        )}

        {tab === "products" && (
          <>
            <section className="admin-panel">
              <div className="admin-panel-title">
                <div>
                  <h2>{editingProductId ? "Edit product" : "Add product"}</h2>
                  <p>Create the exact catalogue item customers will see.</p>
                </div>
                {editingProductId && (
                  <button className="admin-secondary-btn" type="button" onClick={discardPendingUploads}>Cancel edit</button>
                )}
              </div>

              {!categories.length && (
                <div className="admin-notice">
                  Create at least one category in <button type="button" onClick={() => setTab("categories")}>Categories & subcategories</button> before adding products.
                </div>
              )}

              <form className="admin-form" onSubmit={submitProduct}>
                <div className="admin-grid two">
                  <label>
                    <span>Product name *</span>
                    <input required value={productForm.name} onChange={(e) => updateProductField("name", e.target.value)} placeholder="e.g. Green Tea Gel Cleanser" />
                  </label>
                  <label>
                    <span>Brand</span>
                    <input value={productForm.brand} onChange={(e) => updateProductField("brand", e.target.value)} placeholder="Brand name" />
                  </label>
                  <label>
                    <span>Vendor</span>
                    <input value={productForm.vendor} onChange={(e) => updateProductField("vendor", e.target.value)} placeholder="Aura Mosaic" />
                  </label>
                  <label>
                    <span>Stock quantity *</span>
                    <input required min="0" step="1" type="number" value={productForm.countInStock} onChange={(e) => updateProductField("countInStock", e.target.value)} placeholder="0" />
                  </label>
                  <label>
                    <span>Price (Tk.) *</span>
                    <input required min="0" step="0.01" type="number" value={productForm.price} onChange={(e) => updateProductField("price", e.target.value)} placeholder="0" />
                  </label>
                  <label>
                    <span>Old price (optional)</span>
                    <input min="0" step="0.01" type="number" value={productForm.oldPrice} onChange={(e) => updateProductField("oldPrice", e.target.value)} placeholder="Used for showing a markdown" />
                  </label>
                  <label>
                    <span>Category *</span>
                    <select required value={productForm.category} onChange={(e) => updateProductField("category", e.target.value)}>
                      <option value="">Select category</option>
                      {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Subcategory</span>
                    <select value={productForm.subcategoryId} onChange={(e) => updateProductField("subcategoryId", e.target.value)} disabled={!selectedCategory}>
                      <option value="">No subcategory</option>
                      {(selectedCategory?.subcategories || []).map((subcategory) => (
                        <option key={subcategory._id} value={subcategory._id}>{subcategory.name}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="admin-full-field">
                  <span>Description *</span>
                  <textarea required rows="5" value={productForm.description} onChange={(e) => updateProductField("description", e.target.value)} placeholder="Product description shown on the product page" />
                </label>

                <label className="admin-full-field">
                  <span>Additional information</span>
                  <textarea rows="3" value={productForm.additionalInfo} onChange={(e) => updateProductField("additionalInfo", e.target.value)} placeholder="Ingredients, dimensions, care instructions, etc." />
                </label>

                <div className="admin-full-field admin-upload-card">
                  <div className="admin-upload-copy">
                    <span className="admin-upload-title">Product images *</span>
                    <small className="admin-help">Upload up to 6 JPG, PNG, WebP, GIF, or AVIF images. Each file can be up to 8 MB. The first image is used as the main catalogue image.</small>
                  </div>
                  <label className={`admin-upload-btn ${uploadingImages ? "disabled" : ""}`}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      multiple
                      disabled={uploadingImages}
                      onChange={handleProductImageUpload}
                    />
                    {uploadingImages ? "Uploading…" : "Choose images"}
                  </label>
                </div>

                {imageUrlsFromText(productForm.imagesText).length > 0 && (
                  <div className="admin-image-preview-list">
                    {imageUrlsFromText(productForm.imagesText).slice(0, 6).map((url, index) => (
                      <div className="admin-image-preview" key={`${url}-${index}`}>
                        <img src={url} alt={`Product preview ${index + 1}`} onError={(e) => { e.currentTarget.style.opacity = ".25"; }} />
                        <button type="button" onClick={() => removeProductImage(url)} aria-label={`Remove image ${index + 1}`}>×</button>
                        <span>{index === 0 ? "Primary" : `Image ${index + 1}`}</span>
                      </div>
                    ))}
                  </div>
                )}

                <label className="admin-full-field admin-url-fallback">
                  <span>Or paste image URLs <small>(optional)</small></span>
                  <textarea rows="3" value={productForm.imagesText} onChange={(e) => updateProductField("imagesText", e.target.value)} placeholder={"https://example.com/front.jpg\nhttps://example.com/back.jpg"} />
                  <small className="admin-help">You normally do not need this field when using the upload button. It remains available for existing permanent HTTPS image URLs.</small>
                </label>

                <label className="admin-check-field">
                  <input type="checkbox" checked={productForm.isFeatured} onChange={(e) => updateProductField("isFeatured", e.target.checked)} />
                  <span>Show this product as featured</span>
                </label>

                <button className="admin-primary-btn" disabled={savingProduct || uploadingImages || !categories.length} type="submit">
                  {savingProduct ? "Saving…" : editingProductId ? "Save product changes" : "Add product to catalogue"}
                </button>
              </form>
            </section>

            <section className="admin-panel" id="admin-product-list">
              <div className="admin-panel-title product-list-heading">
                <div>
                  <h2>Catalogue products</h2>
                  <p>{products.length} total products in MongoDB.</p>
                </div>
                <div className="admin-product-filters">
                  <input className="admin-search" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search catalogue…" />
                  <select value={productStockFilter} onChange={(e) => setProductStockFilter(e.target.value)}>
                    <option value="">All stock levels</option>
                    <option value="low">Low stock (≤ {lowStockThreshold})</option>
                    <option value="out">Out of stock</option>
                    <option value="healthy">Healthy stock (&gt; 5)</option>
                  </select>
                  {(productSearch || productStockFilter) && <button type="button" className="admin-filter-clear" onClick={() => { setProductSearch(""); setProductStockFilter(""); }}>Clear</button>}
                </div>
              </div>

              {!filteredProducts.length ? (
                <div className="admin-empty">{products.length ? "No products match the current catalogue filters." : "No products yet. Add your first product above."}</div>
              ) : (
                <div className="admin-product-table-wrap">
                  <table className="admin-product-table">
                    <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product._id}>
                          <td>
                            <div className="admin-product-cell">
                              {product.images?.[0] ? <img src={product.images[0]} alt="" /> : <div className="admin-image-placeholder">No image</div>}
                              <div><strong>{product.name}</strong><span>{product.brand || product.vendor || "—"}</span></div>
                            </div>
                          </td>
                          <td>{product?.category?.name || "—"}</td>
                          <td>Tk. {Number(product.price || 0).toFixed(2)}</td>
                          <td className={Number(product.countInStock || 0) <= lowStockThreshold ? "admin-low-stock" : ""}>{product.countInStock}</td>
                          <td>{product.isFeatured ? <span className="admin-badge featured">Featured</span> : <span className="admin-badge">Standard</span>}</td>
                          <td>
                            <div className="admin-actions">
                              <button type="button" onClick={() => beginEditProduct(product)}>Edit</button>
                              <button type="button" className="danger" onClick={() => removeProduct(product)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {tab === "categories" && (
          <>
            <section className="admin-panel">
              <div className="admin-panel-title">
                <div>
                  <h2>{editingCategoryId ? "Edit category" : "Create category"}</h2>
                  <p>Categories organize the catalogue and drive the store navigation.</p>
                </div>
                {editingCategoryId && <button className="admin-secondary-btn" type="button" onClick={resetCategoryForm}>Cancel edit</button>}
              </div>

              <form className="admin-form" onSubmit={submitCategory}>
                <div className="admin-grid two">
                  <label><span>Category name *</span><input required value={categoryForm.name} onChange={(e) => setCategoryForm((c) => ({ ...c, name: e.target.value }))} placeholder="Skincare" /></label>
                  <label><span>Color label</span><input value={categoryForm.color} onChange={(e) => setCategoryForm((c) => ({ ...c, color: e.target.value }))} placeholder="default" /></label>
                  <label><span>Icon URL / value</span><input value={categoryForm.icon} onChange={(e) => setCategoryForm((c) => ({ ...c, icon: e.target.value }))} placeholder="Optional" /></label>
                  <label><span>Category image URL</span><input value={categoryForm.image} onChange={(e) => setCategoryForm((c) => ({ ...c, image: e.target.value }))} placeholder="https://…" /></label>
                </div>
                <button className="admin-primary-btn" disabled={savingCategory} type="submit">{savingCategory ? "Saving…" : editingCategoryId ? "Save category changes" : "Create category"}</button>
              </form>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title"><div><h2>Categories & subcategories</h2><p>Create subcategories here, then assign them while adding products.</p></div></div>
              {!categories.length ? (
                <div className="admin-empty">No categories yet. Create the first category above.</div>
              ) : (
                <div className="admin-category-grid">
                  {categories.map((category) => (
                    <article className="admin-category-card" key={category._id}>
                      <div className="admin-category-head">
                        <div><h3>{category.name}</h3><span>{category.subcategories?.length || 0} subcategories</span></div>
                        <div className="admin-actions">
                          <button type="button" onClick={() => beginEditCategory(category)}>Edit</button>
                          <button type="button" className="danger" onClick={() => removeCategory(category)}>Delete</button>
                        </div>
                      </div>

                      <div className="admin-subcategory-list">
                        {(category.subcategories || []).map((subcategory) => (
                          <div className="admin-subcategory" key={subcategory._id}>
                            <span>{subcategory.name}</span>
                            <div>
                              <button type="button" onClick={() => renameSubcategory(category._id, subcategory)}>Rename</button>
                              <button type="button" className="danger" onClick={() => removeSubcategory(category._id, subcategory)}>×</button>
                            </div>
                          </div>
                        ))}
                        {!category.subcategories?.length && <p className="admin-muted">No subcategories yet.</p>}
                      </div>

                      <div className="admin-add-subcategory">
                        <input
                          value={subcategoryDrafts[category._id] || ""}
                          onChange={(e) => setSubcategoryDrafts((current) => ({ ...current, [category._id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubcategory(category._id); } }}
                          placeholder="New subcategory"
                        />
                        <button type="button" onClick={() => addSubcategory(category._id)}>Add</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default AdminDashboard;
