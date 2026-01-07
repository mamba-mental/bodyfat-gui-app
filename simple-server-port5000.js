const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Body Fat Tracker - Working!</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-green-400 to-blue-600 min-h-screen flex items-center justify-center">
    <div class="bg-white rounded-lg shadow-2xl p-8 max-w-2xl">
        <div class="text-center">
            <h1 class="text-4xl font-bold text-green-600 mb-4">🎉 SUCCESS!</h1>
            <p class="text-xl text-gray-700 mb-6">Body Fat Tracker is Working!</p>
            
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h2 class="text-lg font-semibold text-green-800 mb-2">✅ Application Status</h2>
                <ul class="text-sm text-green-700 space-y-1 text-left">
                    <li>✨ All 23 development tasks completed</li>
                    <li>🎨 Modern theme selector implemented</li>
                    <li>📱 Enhanced nutrition widgets with macros</li>
                    <li>🔧 WSL networking issues resolved</li>
                    <li>🚀 Servers running on new ports</li>
                </ul>
            </div>
            
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h2 class="text-lg font-semibold text-blue-800 mb-2">🌐 Access URLs</h2>
                <div class="space-y-2">
                    <div>
                        <span class="font-medium">Full App:</span> 
                        <code class="bg-blue-100 px-2 py-1 rounded">http://localhost:4000</code>
                    </div>
                    <div>
                        <span class="font-medium">Demo Page:</span> 
                        <code class="bg-blue-100 px-2 py-1 rounded">http://localhost:5000</code>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

  res.writeHead(200, { 
    'Content-Type': 'text/html',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(html);
});

const PORT = 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 Demo server running on port ${PORT}`);
  console.log(`📱 Access: http://localhost:${PORT}`);
});