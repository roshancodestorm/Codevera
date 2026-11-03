// Test script to debug what Moonshoot actually returns
import dotenv from 'dotenv';
dotenv.config();

import { query, initDb } from './db.js';

const testForge = async () => {
  await initDb();
  
  const { rows } = await query('SELECT * FROM models WHERE is_active = true');
  const activeModel = rows[0];
  console.log('🔍 Active Model:', activeModel.name, '| Protocol:', activeModel.api_protocol, '| URL:', activeModel.base_url);
  
  const protocol = (activeModel.api_protocol || 'OpenAI').trim().toUpperCase();
  let apiUrl = activeModel.base_url.trim();
  
  if (!apiUrl.endsWith('/chat/completions')) {
    apiUrl = apiUrl.replace(/\/$/, '') + '/chat/completions';
  }
  
  console.log('🌐 Final URL:', apiUrl);
  
  const headers = { "Content-Type": "application/json" };
  if (activeModel.api_key) headers["Authorization"] = `Bearer ${activeModel.api_key}`;
  
  const prompt = `Make a simple calculator in HTML with working buttons. Return ONLY the complete <!DOCTYPE html> code.`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: activeModel.model_id,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      max_tokens: 2000,
    })
  });
  
  console.log('📊 Response Status:', response.status, response.statusText);
  
  if (!response.ok) {
    const errText = await response.text();
    console.error('❌ Error Response:', errText.slice(0, 500));
    process.exit(1);
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  let chunkCount = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      
      const cleanLine = trimmed.startsWith('data: ') ? trimmed.slice(6).trim() : trimmed;
      if (cleanLine === '[DONE]') continue;
      
      try {
        const json = JSON.parse(cleanLine);
        const chunk = json.choices?.[0]?.delta?.content || json.message?.content || '';
        if (chunk) {
          fullText += chunk;
          chunkCount++;
        }
      } catch (e) {}
    }
  }
  
  console.log(`\n✅ Total chunks received: ${chunkCount}`);
  console.log(`📏 Total response length: ${fullText.length} characters`);
  console.log(`\n📄 First 500 chars of response:\n${fullText.slice(0, 500)}`);
  console.log(`\n📄 Last 200 chars of response:\n${fullText.slice(-200)}`);
  
  // Test extraction
  console.log('\n🔬 Testing extraction...');
  const markdownMatch = fullText.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const doctypeMatch = fullText.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
  const htmlTagMatch = fullText.match(/(<html[\s\S]*<\/html>)/i);
  
  console.log('  Markdown block found:', !!markdownMatch);
  console.log('  DOCTYPE block found:', !!doctypeMatch);
  console.log('  <html> block found:', !!htmlTagMatch);
  console.log('  Contains <html>:', fullText.toLowerCase().includes('<html'));
  console.log('  Contains <!doctype>:', fullText.toLowerCase().includes('<!doctype'));
  
  process.exit(0);
};

testForge().catch(err => {
  console.error('❌ Fatal Error:', err.message);
  process.exit(1);
});
