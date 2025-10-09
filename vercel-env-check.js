// Скрипт для проверки переменных окружения на Vercel
console.log('Проверка переменных окружения на Vercel:');
console.log('=====================================');

// Проверяем наличие ключей
const groqKey = process.env.GROQ_API_KEY;
const hfToken = process.env.HUGGINGFACE_TOKEN;
const togetherKey = process.env.TOGETHER_API_KEY;
const cohereKey = process.env.COHERE_API_KEY;

console.log('GROQ_API_KEY:', groqKey ? '✅ Настроен' : '❌ Отсутствует');
console.log('HUGGINGFACE_TOKEN:', hfToken ? '✅ Настроен' : '❌ Отсутствует');
console.log('TOGETHER_API_KEY:', togetherKey ? '✅ Настроен' : '❌ Отсутствует');
console.log('COHERE_API_KEY:', cohereKey ? '✅ Настроен' : '❌ Отсутствует');

// Проверяем доступ к интернету
const https = require('https');

function checkInternetAccess() {
  return new Promise((resolve) => {
    const req = https.get('https://api.groq.com', (res) => {
      console.log(`Статус подключения к Groq API: ${res.statusCode}`);
      resolve(res.statusCode === 200 || res.statusCode === 403); // 403 означает, что API доступен, но требуется аутентификация
    });
    
    req.on('error', (e) => {
      console.log(`Ошибка подключения к Groq API: ${e.message}`);
      resolve(false);
    });
    
    req.end();
  });
}

checkInternetAccess().then((hasInternet) => {
  console.log('Доступ к интернету:', hasInternet ? '✅ Есть' : '❌ Нет');
  console.log('=====================================');
});