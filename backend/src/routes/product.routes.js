const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET - Listar todos os produtos
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { movements: true }
        }
      }
    });
    res.json(products);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// GET - Buscar produto por código de barras
router.get('/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    const product = await prisma.product.findUnique({
      where: { barcode },
      include: {
        movements: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(product);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// POST - Criar novo produto
router.post('/', async (req, res) => {
  try {
    const {
      name,
      barcode,
      quantity,
      unit,
      category,
      price,
      minQuantity,
      description
    } = req.body;

    // Validações
    if (!name || !barcode) {
      return res.status(400).json({ error: 'Nome e código de barras são obrigatórios' });
    }

    // Verificar se código já existe
    const existing = await prisma.product.findUnique({
      where: { barcode }
    });

    if (existing) {
      return res.status(400).json({ error: 'Código de barras já cadastrado' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        barcode,
        quantity: parseInt(quantity) || 0,
        unit: unit || 'un',
        category: category || 'limpeza',
        price: parseFloat(price) || 0,
        minQuantity: parseInt(minQuantity) || 5,
        description: description || null
      }
    });

    // Criar movimento inicial se quantidade > 0
    if (product.quantity > 0) {
      await prisma.movement.create({
        data: {
          productId: product.id,
          type: 'entrada',
          quantity: product.quantity,
          value: product.quantity * product.price
        }
      });
    }

    res.status(201).json(product);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// PUT - Atualizar produto
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      quantity,
      unit,
      category,
      price,
      minQuantity,
      description
    } = req.body;

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        quantity: parseInt(quantity),
        unit,
        category,
        price: parseFloat(price) || 0,
        minQuantity: parseInt(minQuantity) || 5,
        description
      }
    });

    res.json(product);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// DELETE - Deletar produto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Produto deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

// POST - Dar baixa no estoque (saída)
router.post('/decrease', async (req, res) => {
  try {
    const { barcode, amount } = req.body;

    const product = await prisma.product.findUnique({
      where: { barcode }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    if (product.quantity < amount) {
      return res.status(400).json({ 
        error: 'Quantidade insuficiente em estoque',
        available: product.quantity 
      });
    }

    const updatedProduct = await prisma.product.update({
      where: { barcode },
      data: {
        quantity: product.quantity - amount
      }
    });

    // Registrar movimento
    await prisma.movement.create({
      data: {
        productId: product.id,
        type: 'saida',
        quantity: amount,
        value: amount * product.price
      }
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Erro ao dar baixa:', error);
    res.status(500).json({ error: 'Erro ao dar baixa no estoque' });
  }
});

// POST - Adicionar ao estoque (entrada)
router.post('/increase', async (req, res) => {
  try {
    const { barcode, amount } = req.body;

    const product = await prisma.product.findUnique({
      where: { barcode }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const updatedProduct = await prisma.product.update({
      where: { barcode },
      data: {
        quantity: product.quantity + amount
      }
    });

    // Registrar movimento
    await prisma.movement.create({
      data: {
        productId: product.id,
        type: 'entrada',
        quantity: amount,
        value: amount * product.price
      }
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Erro ao adicionar estoque:', error);
    res.status(500).json({ error: 'Erro ao adicionar ao estoque' });
  }
});

module.exports = router;