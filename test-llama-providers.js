#!/usr/bin/env node

/**
 * Тестер всех AI провайдеров с Llama моделями
 * Запуск: node test-llama-providers.js
 */

const https = require('https');

// Конфигурация провайдеров
const providers = {
  together: {
    name: 'Together AI (Llama 2)',
    url: 'https://api.together.xyz/v1/chat/completions',
    getHeaders: (token) => ({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }),
    getBody: (message) => JSON.stringify({
      model: 'meta-llama/Llama-2-7b-chat-hf',
      messages: [
        { role: 'system', content: 'Ты полезный ИИ-ассистент. Отвечай кратко на русском языке.' },
        { role: 'user', content: message }
      ],
      max_tokens: 100,
      temperature: 0.7
    }),
    extractResponse: (data) => data.choices[0]?.message?.content
  },
  
  groq: {
    name: 'Groq (Llama 3)',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    getHeaders: (token) => ({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }),
    getBody: (message) => JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: 'Ты полезный ИИ-ассистент. Отвечай кратко на русском языке.' },
        { role: 'user', content: message }
      ],
      max_tokens: 100,
      temperature: 0.7
    }),
    extractResponse: (data) => data.choices[0]?.message?.content
  },

  cohere: {
    name: 'Cohere (Command)',
    url: 'https://api.cohere.ai/v1/chat',
    getHeaders: (token) => ({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }),
    getBody: (message) => JSON.stringify({
      model: 'command-light',
      message: message,
      max_tokens: 100,
      temperature: 0.7
    }),
    extractResponse: (data) => data.text
  },

  huggingface: {
    name: 'Hugging Face (DialoGPT)',
    url: 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
    getHeaders: (token) => token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    },
    getBody: (message) => JSON.stringify({
      inputs: `Human: ${message} Bot:`,
      parameters: {
        max_new_tokens: 50,
        temperature: 0.7,
        do_sample: true,
        return_full_text: false
      },
      options: {
        wait_for_model: true,
        use_cache: false
      }
    }),
    extractResponse: (data) => data[0]?.generated_text?.replace('Bot:', '').trim()
  }
};

// Токены из переменных окружения или примеры
const tokens = {
  together: process.env.TOGETHER_API_KEY || 'your_together_token_here',
  groq: process.env.GROQ_API_KEY || 'gsk_your_groq_token_here', 
  cohere: process.env.COHERE_API_KEY || 'your_cohere_token_here',
  huggingface: process.env.HUGGINGFACE_TOKEN || '' // Может работать без токена
};

async function testProvider(providerName, message = "Привет! Как дела?") {
  const provider = providers[providerName];
  const token = tokens[providerName];
  
  console.log(`\n🧪 Тестируем ${provider.name}...`);
  
  if (!token && providerName !== 'huggingface') {
    console.log(`⚠️  Токен не найден. Установите переменную окружения для ${providerName.toUpperCase()}_API_KEY`);
    return;
  }

  return new Promise((resolve) => {
    const url = new URL(provider.url);
    const postData = provider.getBody(message);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        ...provider.getHeaders(token),
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const jsonData = JSON.parse(data);
            const response = provider.extractResponse(jsonData);
            
            if (response && response.trim()) {
              console.log(`✅ ${provider.name}: Работает!`);
              console.log(`   Ответ: "${response.slice(0, 100)}${response.length > 100 ? '...' : ''}"`);
            } else {
              console.log(`⚠️  ${provider.name}: Пустой ответ`);
              console.log(`   Данные: ${JSON.stringify(jsonData).slice(0, 200)}...`);
            }
          } else {
            const errorData = JSON.parse(data);
            console.log(`❌ ${provider.name}: HTTP ${res.statusCode}`);
            console.log(`   Ошибка: ${errorData.error?.message || errorData.message || 'Unknown error'}`);
          }
        } catch (e) {
          console.log(`❌ ${provider.name}: Ошибка парсинга`);
          console.log(`   Ответ: ${data.slice(0, 200)}...`);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ${provider.name}: Сетевая ошибка - ${e.message}`);
      resolve();
    });

    req.setTimeout(15000, () => {
      console.log(`⏰ ${provider.name}: Таймаут`);
      req.destroy();
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function testOllama(message = "Привет! Как дела?") {
  console.log(`\n🧪 Тестируем Ollama (локально)...`);
  
  const url = process.env.OLLAMA_URL || 'http://localhost:11434';
  
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      model: 'llama3:8b',
      messages: [
        { role: 'system', content: 'Ты полезный ИИ-ассистент. Отвечай кратко на русском языке.' },
        { role: 'user', content: message }
      ],
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 100
      }
    });

    try {
      const urlObj = new URL(`${url}/api/chat`);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 11434,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const protocol = urlObj.protocol === 'https:' ? https : require('http');
      
      const req = protocol.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const jsonData = JSON.parse(data);
              const response = jsonData.message?.content;
              
              if (response && response.trim()) {
                console.log(`✅ Ollama (Llama 3): Работает!`);
                console.log(`   Ответ: "${response.slice(0, 100)}${response.length > 100 ? '...' : ''}"`);
              } else {
                console.log(`⚠️  Ollama: Пустой ответ`);
              }
            } else {
              console.log(`❌ Ollama: HTTP ${res.statusCode}`);
              console.log(`   Проверьте, что Ollama запущен на ${url}`);
            }
          } catch (e) {
            console.log(`❌ Ollama: Ошибка парсинга - ${e.message}`);
          }
          resolve();
        });
      });

      req.on('error', (e) => {
        console.log(`❌ Ollama: Не запущен или недоступен на ${url}`);
        console.log(`   Запустите: ollama serve`);
        resolve();
      });

      req.setTimeout(10000, () => {
        console.log(`⏰ Ollama: Таймаут`);
        req.destroy();
        resolve();
      });

      req.write(postData);
      req.end();
      
    } catch (e) {
      console.log(`❌ Ollama: Некорректный URL - ${url}`);
      resolve();
    }
  });
}

async function main() {
  console.log('🚀 Тестирование всех AI провайдеров с Llama моделями...\n');
  
  const message = "Расскажи анекдот про программистов";
  
  // Тестируем облачные провайдеры
  for (const providerName of Object.keys(providers)) {
    await testProvider(providerName, message);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Пауза между запросами
  }
  
  // Тестируем Ollama отдельно
  await testOllama(message);
  
  console.log('\n✨ Тестирование завершено!');
  console.log('\n💡 Инструкции по настройке:');
  console.log('📖 Together AI: См. LLAMA_SETUP.md -> Together AI');
  console.log('📖 Groq: См. LLAMA_SETUP.md -> Groq');
  console.log('📖 Ollama: См. LLAMA_SETUP.md -> Ollama');
  console.log('📖 Cohere: См. LLAMA_SETUP.md -> Cohere');
  console.log('📖 Hugging Face: См. HUGGINGFACE_SETUP.md');
}

main().catch(console.error);