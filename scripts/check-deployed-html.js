#!/usr/bin/env node

import https from 'https';

function fetchFullContent(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        resolve({
          status: response.statusCode,
          headers: response.headers,
          content: data
        });
      });
    });
    
    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function checkDeployedHTML() {
  try {
    console.log('🔍 Fetching deployed index.html...');
    const result = await fetchFullContent('https://craftchatbot.com/');
    
    console.log('\n📄 DEPLOYED HTML CONTENT:');
    console.log('=' .repeat(80));
    console.log(result.content);
    console.log('=' .repeat(80));
    
    console.log('\n📊 ANALYSIS:');
    console.log(`Status: ${result.status}`);
    console.log(`Content-Type: ${result.headers['content-type']}`);
    console.log(`Content-Length: ${result.content.length} characters`);
    
    // Check for key elements
    const checks = [
      { name: 'React root element', pattern: /<div id="root">/, found: /<div id="root">/.test(result.content) },
      { name: 'Script tags', pattern: /<script/, found: /<script/.test(result.content) },
      { name: 'Vite assets', pattern: /assets\/.*\.js/, found: /assets\/.*\.js/.test(result.content) },
      { name: 'Title tag', pattern: /<title>/, found: /<title>/.test(result.content) },
      { name: 'Meta viewport', pattern: /<meta name="viewport"/, found: /<meta name="viewport"/.test(result.content) }
    ];
    
    console.log('\n✅ Element Checks:');
    checks.forEach(check => {
      console.log(`${check.found ? '✅' : '❌'} ${check.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error fetching HTML:', error.message);
  }
}

checkDeployedHTML();
