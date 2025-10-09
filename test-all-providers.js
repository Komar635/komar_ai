// Скрипт для тестирования всех провайдеров
const { providerManager } = require('./src/lib/provider-manager');

console.log('🔍 Тестирование провайдеров...');
console.log('================================');

// Проверяем статус всех провайдеров
const providersStatus = providerManager.getProvidersStatus();
const enabledProviders = providersStatus.filter(p => {
  const config = providerManager.getProviderConfig(p.name);
  return config && config.enabled;
});

console.log('📊 Доступные провайдеры:');
enabledProviders.forEach(provider => {
  console.log(`  - ${provider.name}: ${provider.isHealthy ? '✅ Доступен' : '❌ Недоступен'}`);
});

console.log('\n📋 Конфигурация провайдеров:');
enabledProviders.forEach(provider => {
  const config = providerManager.getProviderConfig(provider.name);
  if (config) {
    console.log(`  - ${provider.name}:`);
    console.log(`    • Приоритет: ${config.priority}`);
    console.log(`    • Максимум попыток: ${config.maxRetries}`);
    console.log(`    • Таймаут: ${config.timeout}ms`);
  }
});

console.log('\n🔄 Порядок fallback провайдеров:');
const fallbackOrder = enabledProviders
  .sort((a, b) => {
    const configA = providerManager.getProviderConfig(a.name);
    const configB = providerManager.getProviderConfig(b.name);
    return (configA?.priority || 0) - (configB?.priority || 0);
  })
  .map(p => p.name);

console.log('  ' + fallbackOrder.join(' → '));

console.log('\n🔑 Статус API ключей:');
console.log('  GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ Настроен' : '❌ Отсутствует');
console.log('  HUGGINGFACE_TOKEN:', process.env.HUGGINGFACE_TOKEN ? '✅ Настроен' : '❌ Отсутствует');
console.log('  TOGETHER_API_KEY:', process.env.TOGETHER_API_KEY ? '✅ Настроен' : '❌ Отсутствует');
console.log('  COHERE_API_KEY:', process.env.COHERE_API_KEY ? '✅ Настроен' : '❌ Отсутствует');

console.log('\n✅ Тестирование завершено.');