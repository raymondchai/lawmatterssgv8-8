/**
 * Test script for platform stats service
 * This can be run in the browser console to verify the service is working
 */

import { platformStatsService } from '@/lib/services/platformStats';

export async function testPlatformStats() {
  console.log('🧪 Testing Platform Stats Service...');
  
  try {
    // Test getting stats
    console.log('📊 Fetching platform statistics...');
    const stats = await platformStatsService.getStats();
    
    console.log('✅ Platform stats retrieved successfully:', stats);
    
    // Test formatting numbers
    console.log('🔢 Testing number formatting...');
    const testNumbers = [500, 1500, 15000, 150000, 1500000];
    testNumbers.forEach(num => {
      const formatted = platformStatsService.formatStatNumber(num);
      console.log(`${num} → ${formatted}`);
    });
    
    // Test cache functionality
    console.log('💾 Testing cache functionality...');
    const startTime = Date.now();
    const cachedStats = await platformStatsService.getStats();
    const endTime = Date.now();
    
    console.log(`⚡ Cached request took ${endTime - startTime}ms`);
    console.log('✅ Cache test completed');
    
    // Test error summary
    console.log('📈 Getting error summary...');
    const summary = platformStatsService.getErrorSummary();
    console.log('Error summary:', summary);
    
    return {
      success: true,
      stats,
      message: 'All tests passed successfully!'
    };
    
  } catch (error) {
    console.error('❌ Platform stats test failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Platform stats test failed'
    };
  }
}

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testPlatformStats = testPlatformStats;
  console.log('🔧 Platform stats test available as window.testPlatformStats()');
}
