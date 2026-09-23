import axios from "axios";

const baseURL = (process.env.REACT_APP_API_BASE_URL || "/api").replace(/\/$/, "");

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("aura:auth-expired"));
    }
    return Promise.reject(error);
  }
);

export default api;

// Categories
export const getCategories = () => api.get("/categories");
export const getCategoryById = (id) => api.get(`/categories/${id}`);
export const getCategoryByName = (name) => api.get(`/categories/name/${encodeURIComponent(name)}`);

// Products
export const getProducts = (params) => api.get("/products", { params });
export const getProductById = (id) => api.get(`/products/${id}`);
export const getFeaturedProducts = (count = 6) => api.get(`/products/featured/${count}`);
export const searchProducts = (params) => api.get("/products/search", { params });
export const getRelatedProducts = (categoryId, excludeId) =>
  api.get(`/products/related/${categoryId}/${excludeId}`);


// Admin catalogue management
export const createCategory = (payload) => api.post("/categories", payload);
export const updateCategory = (id, payload) => api.patch(`/categories/${id}`, payload);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);
export const createSubcategory = (categoryId, payload) =>
  api.post(`/categories/${categoryId}/subcategories`, payload);
export const updateSubcategory = (categoryId, subcategoryId, payload) =>
  api.patch(`/categories/${categoryId}/subcategories/${subcategoryId}`, payload);
export const deleteSubcategory = (categoryId, subcategoryId) =>
  api.delete(`/categories/${categoryId}/subcategories/${subcategoryId}`);
export const createProduct = (payload) => api.post("/products", payload);
export const updateProduct = (id, payload) => api.patch(`/products/${id}`, payload);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const getProductImageUploadSignature = () => api.post("/products/admin/image-upload-signature");
export const deleteUploadedProductImage = (url) =>
  api.delete("/products/admin/image-upload", { data: { url } });

// Reviews
export const getProductReviews = (productId) => api.get(`/products/${productId}/reviews`);
export const addProductReview = (productId, payload) => api.post(`/products/${productId}/reviews`, payload);
export const deleteProductReview = (productId, reviewId) =>
  api.delete(`/products/${productId}/reviews/${reviewId}`);

// Authentication / profile
export const register = (payload) => api.post("/auth/register", payload);
export const login = (payload) => api.post("/auth/login", payload);
export const googleAuth = (credential) => api.post("/auth/google", { credential });
export const getMe = () => api.get("/auth/me");
export const updateMe = (payload) => api.patch("/users/me", payload);
export const logout = () => api.post("/auth/logout");

// Wishlist
export const getWishlist = () => api.get("/users/me/wishlist");
export const addWishlistItem = (productId) => api.post(`/users/me/wishlist/${productId}`);
export const removeWishlistItem = (productId) => api.delete(`/users/me/wishlist/${productId}`);

// Orders / transactions
export const createOrder = (payload) => api.post("/orders", payload);
export const getMyOrders = () => api.get("/orders/my");
export const getOrderById = (id) => api.get(`/orders/${id}`);
export const getMyTransactions = () => api.get("/transactions/my");
export const getAdminDashboard = () => api.get("/orders/admin/dashboard");
export const getAdminOrders = (params = {}) => api.get("/orders", { params });
export const updateAdminOrderStatus = (id, status) => api.patch(`/orders/${id}/status`, { status });
export const getAdminCustomers = (params = {}) => api.get("/users/admin/customers", { params });
export const getAdminCustomerOrders = (id) => api.get(`/users/admin/customers/${id}/orders`);

// Store data
export const getCities = () => api.get("/cities");
export const sendContactMessage = (payload) => api.post("/contact", payload);
export const subscribeNewsletter = (email) => api.post("/newsletter/subscribe", { email });

// Smart recommendations
export const assistantChat = (payload) => api.post("/recommendations/chat", payload);
export const recommendProducts = (payload) => api.post("/recommendations/recommend", payload);
export const giftRecommendations = (payload) => api.post("/recommendations/gift", payload);
export const compareProducts = (productId) => api.post("/recommendations/compare", { productId });

// Extended account management
export const changePassword = (payload) => api.patch("/users/me/password", payload);
export const disableMyAccount = () => api.delete("/users/me");
export const updateAdminCustomerStatus = (id, isActive) =>
  api.patch(`/users/admin/customers/${id}/status`, { isActive });

// Extended product administration
export const getAdminProducts = (params = {}) => api.get("/products/admin/list", { params });
export const restoreAdminProduct = (id) => api.patch(`/products/admin/${id}/restore`);
export const getAdminReviews = (params = {}) => api.get("/products/admin/reviews", { params });
export const updateAdminReviewVisibility = (productId, reviewId, isVisible) =>
  api.patch(`/products/admin/reviews/${productId}/${reviewId}`, { isVisible });
export const deleteAdminReview = (productId, reviewId) =>
  api.delete(`/products/admin/reviews/${productId}/${reviewId}`);
export const getInventoryHistory = (params = {}) => api.get("/products/admin/inventory", { params });
export const adjustInventory = (productId, payload) =>
  api.post(`/products/admin/inventory/${productId}/adjust`, payload);

// Extended order administration
export const getAdminOrderById = (id) => api.get(`/orders/admin/${id}`);
export const updateAdminOrder = (id, payload) => api.patch(`/orders/admin/${id}`, payload);
export const getStoreSettings = () => api.get("/orders/store-settings");
export const getAdminStoreSettings = () => api.get("/orders/admin/settings");
export const updateAdminStoreSettings = (payload) => api.patch("/orders/admin/settings", payload);
export const cancelMyOrder = (id) => api.patch(`/orders/${id}/cancel`);

// Contact inbox
export const getAdminContactMessages = (params = {}) => api.get("/contact", { params });
export const updateAdminContactMessage = (id, payload) => api.patch(`/contact/${id}`, payload);
export const deleteAdminContactMessage = (id) => api.delete(`/contact/${id}`);

// Newsletter administration
export const unsubscribeNewsletter = (email) => api.post("/newsletter/unsubscribe", { email });
export const getAdminNewsletterSubscribers = (params = {}) => api.get("/newsletter/subscribers", { params });
export const updateAdminNewsletterSubscriber = (id, active) =>
  api.patch(`/newsletter/subscribers/${id}`, { active });
export const deleteAdminNewsletterSubscriber = (id) => api.delete(`/newsletter/subscribers/${id}`);

// Transaction administration
export const getAdminTransactions = (params = {}) => api.get("/transactions", { params });
export const getAdminTransactionSummary = () => api.get("/transactions/admin/summary");

// Aura AI Studio (Gemini, server-side)
export const getAuraAIStatus = () => api.get("/recommendations/ai/status");
export const askAuraAI = (prompt) => api.post("/recommendations/ai/advisor", { prompt }, { timeout: 75000 });
export const askAuraGiftDesigner = (payload) =>
  api.post("/recommendations/ai/gift-designer", payload, { timeout: 145000 });

// Aura Assistant v2
export const assistantChatV2 = (payload) => api.post("/recommendations/assistant", payload, { timeout: 75000 });
