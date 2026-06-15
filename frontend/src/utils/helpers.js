import { format, formatDistanceToNow } from 'date-fns';

export const formatCurrency = (amount, symbol = 'Rs.') => {
  if (amount === null || amount === undefined) return `${symbol} 0`;
  return `${symbol} ${Number(amount).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const formatDate = (date, fmt = 'dd MMM yyyy') => {
  if (!date) return '-';
  try { return format(new Date(date), fmt); } catch { return '-'; }
};

export const formatDateTime = (date) => formatDate(date, 'dd MMM yyyy, hh:mm a');

export const timeAgo = (date) => {
  if (!date) return '-';
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return '-'; }
};

export const getDaysToExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const diff = new Date(expiryDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const getExpiryStatus = (expiryDate) => {
  const days = getDaysToExpiry(expiryDate);
  if (days === null) return { label: 'No Expiry', color: 'blue' };
  if (days < 0) return { label: 'Expired', color: 'red' };
  if (days <= 7) return { label: `${days}d left`, color: 'red' };
  if (days <= 15) return { label: `${days}d left`, color: 'orange' };
  if (days <= 30) return { label: `${days}d left`, color: 'yellow' };
  return { label: `${days}d left`, color: 'green' };
};

export const getStockStatus = (quantity, minLevel) => {
  if (quantity <= 0) return { label: 'Out of Stock', color: 'red' };
  if (quantity <= minLevel) return { label: 'Low Stock', color: 'yellow' };
  return { label: 'In Stock', color: 'green' };
};

export const getRoleColor = (role) => {
  const colors = { superadmin: 'purple', admin: 'blue', staff: 'green', accountant: 'orange', inventory_manager: 'teal' };
  return colors[role] || 'gray';
};

export const getRoleLabel = (role) => {
  const labels = { superadmin: 'Super Admin', admin: 'Admin', staff: 'Staff/Cashier', accountant: 'Accountant', inventory_manager: 'Inventory Manager' };
  return labels[role] || role;
};

export const hasPermission = (user, allowedRoles) => {
  if (!user) return false;
  return allowedRoles.includes(user.role);
};

export const truncate = (str, n = 30) => str && str.length > n ? str.slice(0, n) + '...' : str;

export const generateBarcode = () => Math.floor(1000000000000 + Math.random() * 9000000000000).toString();

export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};
