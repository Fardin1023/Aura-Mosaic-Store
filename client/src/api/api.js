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
