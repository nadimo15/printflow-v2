export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PF${year}${month}${day}-${random}`;
}

export function generateSKU(category: string, id: string): string {
  const prefix = category.substring(0, 3).toUpperCase();
  const suffix = id.substring(0, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}
