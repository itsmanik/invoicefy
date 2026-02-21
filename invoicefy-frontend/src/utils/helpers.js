export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const calculateSubtotal = (items) => {
  return items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);
};

export const calculateTax = (subtotal, taxRate) => {
  return (subtotal * taxRate) / 100;
};

export const calculateTotal = (subtotal, tax, discount) => {
  return subtotal + tax - discount;
};

export const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
};