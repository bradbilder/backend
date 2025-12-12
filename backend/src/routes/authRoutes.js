import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { accountName, email, password, name } = req.body;

    if(!accountName || !email || !password) return res.status(400).json({ error: "Dados incompletos" });

    const hash = await bcrypt.hash(password, 10);

    const account = await prisma.account.create({
      data: { name: accountName }
    });

    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        name,
        accountId: account.id
      }
    });

    res.json({ message: "Conta criada", accountId: account.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar conta" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) return res.status(400).json({ error: "Credenciais inválidas" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Credenciais inválidas" });

    const token = jwt.sign(
      { id: user.id, accountId: user.accountId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no login" });
  }
});

export default router;
