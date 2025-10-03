#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки Hugging Face API
 * Запуск: node test-hf-api.js
 */

const https = require('https');

// Бесплатные модели для тестирования
const models = [
  'microsoft/DialoGPT-medium',
  'facebook/blenderbot-400M-distill',
  'microsoft/DialoGPT-small'
];

async function testModel(model) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      inputs: "Привет! Как дела?",
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
    });

    const options = {
      hostname: 'api-inference.huggingface.co',
      port: 443,
      path: `/models/${model}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        // Без токена - используем публичный доступ (с лимитами)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          
          if (res.statusCode === 200) {
            console.log(`✅ ${model}: РАБОТАЕТ`);
            if (result[0]?.generated_text) {
              console.log(`   Ответ: "${result[0].generated_text.slice(0, 100)}..."`);
            }
          } else {
            console.log(`❌ ${model}: ОШИБКА ${res.statusCode}`);
            console.log(`   Детали: ${result.error || 'Неизвестная ошибка'}`);
          }
        } catch (e) {
          console.log(`❌ ${model}: ОШИБКА ПАРСИНГА`);
          console.log(`   Ответ: ${responseData.slice(0, 100)}...`);
        }
        
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ${model}: СЕТЕВАЯ ОШИБКА - ${e.message}`);
      resolve();
    });

    req.setTimeout(10000, () => {
      console.log(`⏰ ${model}: ТАЙМАУТ`);
      req.destroy();
      resolve();
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🚀 Тестирование бесплатных моделей Hugging Face API...\n');
  
  for (const model of models) {
    await testModel(model);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Пауза между запросами
  }
  
  console.log('\n✨ Тестирование завершено!');
  console.log('\n💡 Совет: Получите бесплатный токен на https://huggingface.co/settings/tokens');
  console.log('   для увеличения лимитов и скорости ответов.');
}

main().catch(console.error);