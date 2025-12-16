const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getByBarcode = async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { barcode: req.params.barcode }
  });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
};

exports.decreaseStock = async (req, res) => {
  const { barcode, quantity } = req.body;
  const product = await prisma.product.findUnique({ where: { barcode } });
  if (!product || product.quantity < quantity)
    return res.status(400).json({ error: 'Insufficient stock' });

  await prisma.product.update({
    where: { barcode },
    data: { quantity: product.quantity - quantity }
  });

  res.json({ success: true });
};