const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const anthropic = new Anthropic();

const SYSTEM_PROMPT = `你是「拾光花」網站上的客服小助手,請用溫暖、簡潔的繁體中文回答訪客的問題。

店家資訊:
- 品牌名稱:拾光花(Shiguang Flower Studio),創辦人為珍珍
- 服務項目:AI身體健康檢測、澳洲花晶療癒、手技按摩舒壓調理、肌膚管理
- 目前服務據點:昱柔SPA蘆洲徐匯店(未來將成立拾光花品牌工作室)
- 地址:新北市蘆洲區永安北路二段8巷2號3樓
- 電話:0901-349-130
- 聯絡 Email:prinda0306@gmail.com
- 預約方式:訪客可以在網站註冊會員後,於會員中心線上預約服務;也歡迎加入 LINE 官方帳號預約

回答規則:
- 只回答與拾光花服務、預約、地址、聯絡方式相關的問題
- 如果訪客問到你不知道的細節(例如確切營業時間、詳細價格),請請他直接來信 prinda0306@gmail.com 或電洽 0901-349-130 詢問,不要編造答案
- 回答盡量簡短,2-4 句話以內`;

router.post('/', async (req, res) => {
  const message = String((req.body && req.body.message) || '').trim().slice(0, 500);
  const historyInput = Array.isArray(req.body && req.body.history) ? req.body.history : [];

  if (!message) {
    return res.status(400).json({ error: '請輸入訊息' });
  }

  const messages = historyInput
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 500) }));
  messages.push({ role: 'user', content: message });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    res.json({ reply: textBlock ? textBlock.text.trim() : '' });
  } catch (err) {
    console.error('Chat error:', err);
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: '伺服器尚未設定 ANTHROPIC_API_KEY,請聯絡管理員。' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'AI 服務忙碌中,請稍後再試。' });
    }
    res.status(500).json({ error: 'AI 客服暫時無法回應,請稍後再試。' });
  }
});

module.exports = router;
